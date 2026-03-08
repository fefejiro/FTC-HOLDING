import QRCode from "qrcode";
import { networkingProfile } from "../../../lib/content";

export const runtime = "nodejs";

export async function GET() {
  const target = `${networkingProfile.networkHubUrl}?src=qr`;
  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: 1,
    width: 420,
    color: {
      dark: "#0b1727",
      light: "#ffffff"
    }
  });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": 'inline; filename="unalabs-connect-qr.svg"',
      "Cache-Control": "public, max-age=86400"
    }
  });
}
