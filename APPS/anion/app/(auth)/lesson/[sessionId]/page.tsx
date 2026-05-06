import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import LessonRoom from './LessonRoom';

type LessonPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function LessonSessionPage({ params }: LessonPageProps) {
  const { sessionId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'parent' && user.role !== 'tutor' && user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <LessonRoom
      sessionId={sessionId}
      userId={user.authUserId}
      participantRole={user.role === 'tutor' ? 'tutor' : 'student'}
      displayName={user.displayName}
    />
  );
}
