import { requireCurrentUser } from '../lib/auth/getCurrentUser';

export default async function AuthAreaLayout({ children }: { children: React.ReactNode }) {
  await requireCurrentUser(); // redirects to /login if unauthenticated

  return <>{children}</>;
}
