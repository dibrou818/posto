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

export type PosterEventData = {
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string | null;
  /** Free-text as stored (e.g. "Gratuit", "10€", "À partir de 5€") — drawn
   * as-is if present, and simply omitted (never guessed) if not: an event
   * with no price set doesn't necessarily mean free. */
  price: string | null;
  coverPhotoUrl: string | null;
  /** The event's public URL — the poster generates its own QR pointing here
   * rather than depending on one already being saved on the event (see
   * PosterSection), so it always works standalone. */
  qrTargetUrl: string;
};

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
 * "…" if the text doesn't fit — canvas has no built-in text wrapping. */
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

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("La génération de l'affiche a échoué."));
    }, "image/png");
  });
}

/** Composites one A4-ish poster PNG from an event's info: cover photo as
 * background, a bottom gradient (+ a light text shadow as a second line of
 * defense) so the text stays legible no matter how bright/busy the photo
 * is, title/description/date/price, and a QR code linking to the event. */
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
    } catch {
      // CORS-blocked or unreachable — a fallback background beats a failed
      // poster generation entirely.
      drawFallbackBackground(ctx);
    }
  } else {
    drawFallbackBackground(ctx);
  }

  // Bottom gradient overlay — the primary legibility fix, since it's the
  // one guaranteed to work regardless of what's directly behind any given
  // line of text (unlike a per-line shadow tuned for one particular photo).
  const gradient = ctx.createLinearGradient(0, HEIGHT * 0.42, 0, HEIGHT);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, HEIGHT * 0.42, WIDTH, HEIGHT * 0.58);

  // Belt-and-suspenders: a soft shadow behind the text itself, in case a
  // very bright/high-contrast patch of the photo still peeks through.
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 2;
  ctx.textBaseline = "top";

  let cursorY = HEIGHT * 0.58;
  const textMaxWidth = WIDTH - PADDING * 2;

  const scheduleLabel = formatEventSchedule(data.startDatetime, data.endDatetime).toUpperCase();
  ctx.font = `700 30px ${FONT_STACK}`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(scheduleLabel, PADDING, cursorY);
  cursorY += 30 * 1.6;

  ctx.font = `800 60px ${FONT_STACK}`;
  ctx.fillStyle = "#ffffff";
  for (const line of wrapText(ctx, data.title, textMaxWidth, 2)) {
    ctx.fillText(line, PADDING, cursorY);
    cursorY += 60 * 1.18;
  }
  cursorY += 16;

  if (data.description) {
    ctx.font = `400 32px ${FONT_STACK}`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    for (const line of wrapText(ctx, data.description, textMaxWidth, 3)) {
      ctx.fillText(line, PADDING, cursorY);
      cursorY += 32 * 1.35;
    }
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Bottom row: price pill (left) + QR code (right), side by side so
  // neither needs to know how tall the text block above ended up being.
  const QR_BOX = 220;
  const qrX = WIDTH - PADDING - QR_BOX;
  const qrY = HEIGHT - PADDING - QR_BOX;

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX, qrY, QR_BOX, QR_BOX, 20);
  ctx.fill();

  const qrDataUrl = await QRCode.toDataURL(data.qrTargetUrl, { width: 512, margin: 1 });
  const qrImg = await loadImage(qrDataUrl); // data: URL — never taints the canvas
  const qrInnerPad = 18;
  ctx.drawImage(qrImg, qrX + qrInnerPad, qrY + qrInnerPad, QR_BOX - qrInnerPad * 2, QR_BOX - qrInnerPad * 2);

  if (data.price) {
    ctx.font = `700 28px ${FONT_STACK}`;
    const textWidth = ctx.measureText(data.price).width;
    const pillPadX = 22;
    const pillHeight = 52;
    const pillWidth = textWidth + pillPadX * 2;
    const pillY = qrY + QR_BOX / 2 - pillHeight / 2;

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    roundRect(ctx, PADDING, pillY, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.textBaseline = "middle";
    ctx.fillText(data.price, PADDING + pillPadX, pillY + pillHeight / 2);
  }

  return canvasToPngBlob(canvas);
}
