import { networkingProfile } from "../../../lib/content";

function sanitizeVCardValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET() {
  const links = networkingProfile.portfolioLinks.map((link) => link.url);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${sanitizeVCardValue(networkingProfile.fullName)}`,
    `TITLE:${sanitizeVCardValue(networkingProfile.title)}`,
    `ORG:${sanitizeVCardValue(networkingProfile.studioName)}`,
    `TEL;TYPE=CELL:${networkingProfile.phoneE164}`,
    `EMAIL;TYPE=INTERNET:${sanitizeVCardValue(networkingProfile.email)}`,
    `URL:${sanitizeVCardValue(networkingProfile.networkHubUrl)}`,
    `URL:${sanitizeVCardValue(networkingProfile.linkedInUrl)}`,
    ...links.map((url) => `URL:${sanitizeVCardValue(url)}`),
    "NOTE:Una Labs is the technology studio of Fejiro Technology Consultancy Inc.",
    "END:VCARD",
    ""
  ];
  const body = lines.join("\r\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fejiro-efiuvwere.vcf"',
      "Cache-Control": "public, max-age=3600"
    }
  });
}
