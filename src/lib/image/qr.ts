import QRCode from "qrcode";

/** Returns a self-contained QR SVG suitable for server-side share-image rendering. */
export async function createQrDataUri(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#14213d", light: "#fffdf7" },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
