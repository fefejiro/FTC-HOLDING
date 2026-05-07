import { isAdminRole } from '@ftc/auth';
import type { Session } from '@supabase/supabase-js';

const FALLBACK_ADMIN_EMAILS = ['mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'];

function getAllowedAdminEmails(): Set<string> {
  const configured = (process.env.NEXT_PUBLIC_UNALABS_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const resolved = configured.length > 0 ? configured : FALLBACK_ADMIN_EMAILS;
  return new Set(resolved);
}

export function hasAdminAccess(session: Session | null): boolean {
  const user = session?.user;
  if (!user) return false;

  const email = (user.email || '').trim().toLowerCase();
  if (getAllowedAdminEmails().has(email)) {
    return true;
  }

  const role =
    (typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : null) ||
    (typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : null);

  return isAdminRole(role);
}
