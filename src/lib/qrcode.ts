import QRCode from "qrcode";

/** Renders a QR code pointing at `targetUrl` as a PNG data URI — small
 * enough (a couple KB) to store straight in a `text` column, no Storage
 * bucket/upload flow needed, and prints cleanly on an A4 poster at this
 * resolution. */
export async function generateQrCodeDataUrl(targetUrl: string): Promise<string> {
  return QRCode.toDataURL(targetUrl, {
    width: 512,
    margin: 1,
  });
}
