import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth/getCurrentUser';

export default async function DashboardRoute() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  if (user?.role === 'student') redirect('/student');
  if (user?.role === 'tutor') redirect('/tutor');
  if (user?.role === 'admin') redirect('/admin');
  redirect('/parent');
}
