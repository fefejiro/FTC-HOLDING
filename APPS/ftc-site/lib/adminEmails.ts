const DEFAULT_ADMIN_EMAILS = [
  "uby400@gmail.com",
  "mike.fejiro@gmail.com"
];

function parseEmails(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeAdminEmail(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export function getSharedAdminEmailSet(): Set<string> {
  return new Set([
    ...DEFAULT_ADMIN_EMAILS,
    ...parseEmails(process.env.NEXT_PUBLIC_UNALABS_ADMIN_EMAILS),
    ...parseEmails(process.env.NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS)
  ]);
}

export function isSharedAdminEmail(email: string | null | undefined): boolean {
  return getSharedAdminEmailSet().has(normalizeAdminEmail(email));
}