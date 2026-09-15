import QRCode from "qrcode";
import { formatEventSchedule } from "@/lib/eventSchedule";

// Everything here runs in the browser (canvas, Image, QRCode's browser
// build) — only ever called from a "use client" component's click handler,
// never during SSR. A poster is generated once per click, not per render,
// so there's no perf concern doing this compositing on the main thread.

const WIDTH = 1240;
const HEIGHT = 1754; // A4 ratio at ~150dpi — sharp enough to print, not huge to upload
const PADDING = 72;
const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";
// Same violet used for event pins/markers elsewhere (Map.tsx's EVENT_COLOR)
// — the poster should read as unmistakably "Posto" at a glance, not a
// generic flyer.
const ACCENT = "#7c3aed";

export type PosterEventData = {
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string | null;
  /** Free-text as stored (e.g. "Gratuit", "10€", "À partir de 5€") — drawn
   * as a small secondary badge, never the poster's focal point: people come
   * for the event, the price is a detail they check, not the headline. */
  price: string | null;
  /** Same treatment as price — a small badge, only when actually set. */
  restrictions: string | null;
  coverPhotoUrl: string | null;
  /** The event's public URL — the poster generates its own QR pointing here
   * rather than depending on one already being saved on the event (see
   * PosterSection), so it always works standalone. */
  qrTargetUrl: string;
  /** Venue block, bottom-left next to the QR — who's hosting it and how to
   * reach them. Address/phone are optional since not every place has them
   * filled in. */
  placeName: string;
  placeAddress: string | null;
  placePhone: string | null;
  /** How the photo gets made legible under the text. "gradient" (default)
   * layers a black scrim behind the text — works on any photo regardless of
   * what's actually there, at the cost of darkening/flattening that part of
   * it. "exposure" instead grades the whole photo (see applyExposureGrading)
   * and skips the scrim entirely, keeping more of the photo's own look —
   * better on a photo that's already dark/calm where the scrim isn't doing
   * much lifting anyway, but with no per-photo guarantee of contrast the
   * way the scrim has, so it's opt-in rather than the default. */
  style?: "gradient" | "exposure";
};

// offset lifts/lowers the black point, gamma reshapes the midtones while
// leaving pure black/white alone — same two "shape" properties the original
// hand-tuned preset used. What's no longer fixed is *how much* exposure
// reduction gets applied: that's now measured per photo (see
// applyExposureGrading) instead of every photo getting the same -1.14
// stops regardless of whether it started dark or already bright.
const EXPOSURE_OFFSET = 0.0135;
const EXPOSURE_GAMMA = 0.93;
// Where exposure reduction aims to land a photo's average brightness —
// picked to sit close to what the old fixed -1.14-stop preset produced on a
// typical mid-gray event photo, so this reads as the same house look, just
// arrived at by measurement instead of one constant for every photo.
const TARGET_LUMINANCE = 0.26;
// Never darken a photo past this multiplier — an already-dark photo (which
// needs little to no correction) should never get pushed toward pure black
// chasing an unreachable target, and even a very bright photo keeps some of
// its own tonal range instead of being crushed flat.
const MIN_EXPOSURE_FACTOR = 0.3;
// A region's measured average is compared against this to decide whether
// text drawn over it (see the "exposure" style's title/description/venue
// text below) should be white or near-black — the direct generalization of
// the same measurement this grading step already takes.
const BRIGHT_REGION_THRESHOLD = 0.55;

// Rec. 709 relative luminance — the standard "how bright does this pixel
// actually look" weighting (green contributes far more than blue), not a
// plain RGB average.
function relativeLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Average luminance over `imageData`, sampled every 7th pixel in each
 * direction (~2% of pixels) rather than every one — plenty for a stable
 * average at this canvas size, a fraction of the cost. */
function measureAverageLuminance(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const STEP = 7;
  let total = 0;
  let count = 0;
  for (let y = 0; y < height; y += STEP) {
    for (let x = 0; x < width; x += STEP) {
      const i = (y * width + x) * 4;
      total += relativeLuminance(data[i], data[i + 1], data[i + 2]);
      count++;
    }
  }
  return count > 0 ? total / count : 0.5;
}

/** Same sparse-sampled average, restricted to one rectangle of `ctx` — used
 * after grading to check specifically the area text will be drawn over,
 * which can read very differently from the photo's overall average (a photo
 * that's dark up top and bright at the bottom, or vice versa). */
function measureRegionLuminance(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): number {
  const clampedY = Math.max(0, Math.min(y, ctx.canvas.height - 1));
  const clampedH = Math.max(1, Math.min(h, ctx.canvas.height - clampedY));
  return measureAverageLuminance(ctx.getImageData(x, clampedY, w, clampedH));
}

/** Per-pixel exposure/offset/gamma grading, applied in place on whatever is
 * already drawn on `ctx`. Needs a real pixel readback (getImageData) — a
 * CSS `filter` string can fake brightness/contrast but has no primitive for
 * this exact three-property curve — which is real work per poster (~2M
 * pixels at this canvas size), acceptable since a poster is generated once
 * per click, not per render.
 *
 * The exposure factor itself is measured, not fixed: an already-dark photo
 * (average luminance already at or below TARGET_LUMINANCE) is left alone —
 * factor 1, no extra darkening — while a bright photo gets pulled down
 * toward the target, clamped so it's never crushed past MIN_EXPOSURE_FACTOR.
 * Two identically-styled posters from a dark bar photo and a sunlit terrace
 * photo now get two different amounts of correction instead of the same
 * -1.14 stops regardless of what either photo actually looked like. */
function applyExposureGrading(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const avgLuminance = measureAverageLuminance(imageData);
  const exposureFactor =
    avgLuminance > TARGET_LUMINANCE ? Math.max(MIN_EXPOSURE_FACTOR, TARGET_LUMINANCE / avgLuminance) : 1;

  const px = imageData.data;
  for (let i = 0; i < px.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      let v = px[i + ch] / 255;
      v = v * exposureFactor;
      v = v + EXPOSURE_OFFSET;
      v = Math.max(0, Math.min(1, v));
      v = Math.pow(v, EXPOSURE_GAMMA);
      px[i + ch] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function loadImage(src: string, crossOrigin?: "anonymous"): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image de fond."));
    img.src = src;
  });
}

/** Draws `img` into the (x,y,w,h) box with CSS `object-fit: cover`
 * semantics — fills the box completely, cropping whichever axis overflows,
 * instead of canvas's default (stretch to fit, distorting the photo). */
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawFallbackBackground(ctx: CanvasRenderingContext2D) {
  // No cover photo — a plain dark gradient (matching the app's own dark
  // accent) reads as an intentional design choice, not a broken image.
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(1, "#1f2937");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Greedy word-wrap into at most `maxLines`, truncating the last line with
 * "…" if the text doesn't fit — canvas has no built-in text wrapping.
 * Works the same regardless of the text-align the caller draws with, since
 * it only ever measures width, never draws. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let i = 0;

  while (i < words.length && lines.length < maxLines) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      i++;
    } else {
      lines.push(current);
      current = "";
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
    current = "";
  }

  const hasLeftover = i < words.length || current.length > 0;
  if (hasLeftover && lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 0 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/** Single-line version of wrapText for the small venue-block lines (name/
 * address/phone) — those should stay compact, not wrap to a second line
 * and start competing with the event's own info above them. */
function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 0 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1).trimEnd();
  }
  return `${cut}…`;
}

/** A small translucent pill for secondary info (price, restrictions) — same
 * shape language as the date badge but visually quieter (outline instead of
 * a solid fill) so it reads as a detail, not a second headline. */
function measurePill(ctx: CanvasRenderingContext2D, text: string, padX: number): number {
  return ctx.measureText(text).width + padX * 2;
}

function drawOutlinePill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("La génération de l'affiche a échoué."));
    }, "image/png");
  });
}

/** Composites one A4-ish poster PNG from an event's info, all directly on
 * the photo (no big flat card eating space with nothing in it): the event
 * name leads, biggest and centered; the date/time sits right under it as a
 * violet badge; then the description; then price/restrictions as small
 * quiet pills — visible but deliberately not competing with the title,
 * since people come for the event, not its price. The QR keeps its own
 * small white backing in the bottom-right corner (kept small — just enough
 * to scan reliably, not a full-width band), mirrored by a compact
 * name/address/phone block for the venue at bottom-left. */
export async function generateEventPosterBlob(data: PosterEventData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Ce navigateur ne supporte pas la génération d'image.");

  if (data.coverPhotoUrl) {
    try {
      const bg = await loadImage(data.coverPhotoUrl, "anonymous");
      drawImageCover(ctx, bg, 0, 0, WIDTH, HEIGHT);
      if (data.style === "exposure") applyExposureGrading(ctx, WIDTH, HEIGHT);
    } catch {
      // CORS-blocked or unreachable — a fallback background beats a failed
      // poster generation entirely.
      drawFallbackBackground(ctx);
    }
  } else {
    drawFallbackBackground(ctx);
  }

  const textMaxWidth = WIDTH - PADDING * 2;
  const centerX = WIDTH / 2;

  // ---- Bottom row geometry (QR + venue block), decided up front so the
  // main content above can be measured and bottom-anchored just above it.
  const QR_SIZE = 168;
  const QR_INNER_PAD = 16;
  const qrBackingSize = QR_SIZE + QR_INNER_PAD * 2;
  const qrBackingX = WIDTH - PADDING - qrBackingSize;
  const qrBackingY = HEIGHT - PADDING - qrBackingSize;
  const GAP_ABOVE_BOTTOM_ROW = 48;

  // ---- Measure every text block before drawing anything on top of the
  // photo, so the whole stack can be bottom-anchored just above the QR/venue
  // row instead of hanging at a fixed offset regardless of length.
  const TITLE_FONT = `800 64px ${FONT_STACK}`;
  const TITLE_LINE_HEIGHT = 64 * 1.14;
  const DATE_FONT = `700 25px ${FONT_STACK}`;
  const DESC_FONT = `400 29px ${FONT_STACK}`;
  const DESC_LINE_HEIGHT = 29 * 1.45;
  const PILL_FONT = `600 22px ${FONT_STACK}`;

  ctx.font = TITLE_FONT;
  const titleLines = wrapText(ctx, data.title, textMaxWidth, 2);

  const scheduleLabel = formatEventSchedule(data.startDatetime, data.endDatetime).toUpperCase();
  ctx.font = DATE_FONT;
  const dateBadgeHeight = 46;
  const dateBadgeWidth = ctx.measureText(scheduleLabel).width + 20 * 2;

  const descriptionLines = data.description
    ? (() => {
        ctx.font = DESC_FONT;
        return wrapText(ctx, data.description!, textMaxWidth, 2);
      })()
    : [];

  ctx.font = PILL_FONT;
  const pillTexts = [data.price, data.restrictions].filter((v): v is string => Boolean(v));
  const PILL_HEIGHT = 44;
  const PILL_GAP = 14;
  const pillWidths = pillTexts.map((t) => measurePill(ctx, t, 20));
  const pillsRowWidth = pillWidths.reduce((sum, w) => sum + w, 0) + PILL_GAP * Math.max(0, pillTexts.length - 1);

  const GAP_TITLE_DATE = 26;
  const GAP_DATE_DESC = 28;
  const GAP_DESC_PILLS = 24;

  let contentHeight = titleLines.length * TITLE_LINE_HEIGHT + GAP_TITLE_DATE + dateBadgeHeight;
  if (descriptionLines.length > 0) {
    contentHeight += GAP_DATE_DESC + descriptionLines.length * DESC_LINE_HEIGHT;
  }
  if (pillTexts.length > 0) {
    contentHeight += GAP_DESC_PILLS + PILL_HEIGHT;
  }

  const contentBottomY = qrBackingY - GAP_ABOVE_BOTTOM_ROW;
  // Guards only the extreme case (title + description + both pills all at
  // once, near the character limits) from creeping too close to the brand
  // badge up top — ordinary posters never get near this floor.
  const contentTopY = Math.max(contentBottomY - contentHeight, HEIGHT * 0.32);

  // ---- Text color: white by default (the "gradient" style's black scrim
  // below guarantees a dark background regardless of the photo, so there's
  // nothing to adapt to there). The "exposure" style skips that scrim on
  // purpose — leaning on the photo's own (regraded) tones instead — which
  // means the title/description/venue text sits directly on the photo, and
  // a bright one would wash out plain white. Direct generalization of the
  // grading step above: measure the actual region text will be drawn over
  // (not the whole photo's average, which can read very differently) and
  // flip to near-black with a light glow when that region is bright enough
  // that white would struggle, instead of assuming white always works. ----
  let contentTextColor = "#ffffff";
  let contentTextColorMuted = "rgba(255,255,255,0.88)";
  let contentAddressColor = "rgba(255,255,255,0.78)";
  let contentShadowColor = "rgba(0,0,0,0.45)";
  if (data.style === "exposure") {
    const regionLuminance = measureRegionLuminance(ctx, 0, Math.round(contentTopY), WIDTH, Math.round(HEIGHT - contentTopY));
    if (regionLuminance > BRIGHT_REGION_THRESHOLD) {
      contentTextColor = "#171717";
      contentTextColorMuted = "rgba(23,23,23,0.85)";
      contentAddressColor = "rgba(23,23,23,0.72)";
      contentShadowColor = "rgba(255,255,255,0.65)";
    }
  }

  // ---- Background gradient: sized to whatever was actually measured above
  // instead of a fixed fraction, so it never comes up short under a long
  // title/description and never overshoots (washing out more of the photo
  // than necessary) under a short one. Skipped for the "exposure" style —
  // that style's whole point is leaning on the photo's own (regraded) tones
  // instead of a scrim; drawing both would just muddy the effect. ----
  if (data.style !== "exposure") {
    const gradientStartY = Math.min(contentTopY - 110, HEIGHT * 0.56);
    const gradient = ctx.createLinearGradient(0, gradientStartY, 0, HEIGHT);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, gradientStartY, WIDTH, HEIGHT - gradientStartY);
  }

  // A soft top-down scrim too, just enough to keep the brand badge legible
  // over a bright sky/wall without needing its own solid backing.
  const topGradient = ctx.createLinearGradient(0, 0, 0, 220);
  topGradient.addColorStop(0, "rgba(0,0,0,0.45)");
  topGradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, WIDTH, 220);

  // ---- Brand badge, top center — the full URL rather than just the name,
  // so a printed/shared poster tells people exactly where to find more. ----
  const badgeText = "goposto.com";
  ctx.font = `700 24px ${FONT_STACK}`;
  const badgePadX = 22;
  const badgeHeight = 40;
  const badgeWidth = ctx.measureText(badgeText).width + badgePadX * 2;
  const badgeY = 56;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundRect(ctx, centerX - badgeWidth / 2, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
  ctx.fill();
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, centerX, badgeY + badgeHeight / 2 + 1);

  // ---- Centered main content: title leads (biggest, first — it's what
  // people actually come for), then when, then what it's about. ----
  ctx.textAlign = "center";
  let cursorY = contentTopY;

  ctx.shadowColor = contentShadowColor;
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 2;
  ctx.textBaseline = "top";
  ctx.font = TITLE_FONT;
  ctx.fillStyle = contentTextColor;
  for (const line of titleLines) {
    ctx.fillText(line, centerX, cursorY);
    cursorY += TITLE_LINE_HEIGHT;
  }
  cursorY += GAP_TITLE_DATE;

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fillStyle = ACCENT;
  roundRect(ctx, centerX - dateBadgeWidth / 2, cursorY, dateBadgeWidth, dateBadgeHeight, dateBadgeHeight / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = DATE_FONT;
  ctx.textBaseline = "middle";
  ctx.fillText(scheduleLabel, centerX, cursorY + dateBadgeHeight / 2 + 1);
  cursorY += dateBadgeHeight;

  if (descriptionLines.length > 0) {
    cursorY += GAP_DATE_DESC;
    ctx.font = DESC_FONT;
    ctx.fillStyle = contentTextColorMuted;
    ctx.textBaseline = "top";
    ctx.shadowColor = contentShadowColor;
    ctx.shadowBlur = 12;
    for (const line of descriptionLines) {
      ctx.fillText(line, centerX, cursorY);
      cursorY += DESC_LINE_HEIGHT;
    }
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (pillTexts.length > 0) {
    cursorY += GAP_DESC_PILLS;
    ctx.font = PILL_FONT;
    let pillX = centerX - pillsRowWidth / 2;
    pillTexts.forEach((text, i) => {
      drawOutlinePill(ctx, text, pillX, cursorY, pillWidths[i], PILL_HEIGHT);
      pillX += pillWidths[i] + PILL_GAP;
    });
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // ---- Bottom-left: venue block (who's hosting, how to reach them) —
  // mirrors the QR on the other corner so the row reads as one deliberate
  // footer instead of the title block just trailing off. ----
  const venueMaxWidth = qrBackingX - PADDING - 32;
  const venueLines: { text: string; font: string; color: string }[] = [
    { text: data.placeName, font: `700 27px ${FONT_STACK}`, color: contentTextColor },
  ];
  if (data.placeAddress) {
    venueLines.push({ text: data.placeAddress, font: `400 21px ${FONT_STACK}`, color: contentAddressColor });
  }
  if (data.placePhone) {
    venueLines.push({ text: `Tél. ${data.placePhone}`, font: `400 21px ${FONT_STACK}`, color: contentAddressColor });
  }

  ctx.shadowColor = contentShadowColor;
  ctx.shadowBlur = 10;
  let venueY = qrBackingY + QR_INNER_PAD + 4;
  for (const line of venueLines) {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    ctx.fillText(truncateToWidth(ctx, line.text, venueMaxWidth), PADDING, venueY);
    venueY += line.font.includes("700") ? 34 : 28;
  }
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // ---- Bottom-right: QR code, small white backing just around it — not a
  // band spanning the poster, just enough to stay reliably scannable. ----
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrBackingX, qrBackingY, qrBackingSize, qrBackingSize, 20);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const qrDataUrl = await QRCode.toDataURL(data.qrTargetUrl, { width: 512, margin: 1 });
  const qrImg = await loadImage(qrDataUrl); // data: URL — never taints the canvas
  ctx.drawImage(qrImg, qrBackingX + QR_INNER_PAD, qrBackingY + QR_INNER_PAD, QR_SIZE, QR_SIZE);

  return canvasToPngBlob(canvas);
}
