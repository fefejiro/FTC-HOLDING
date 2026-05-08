import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { resolveLessonParticipantRoleForUser } from '@/app/lib/bookings';
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

  if (user.role !== 'parent' && user.role !== 'tutor' && user.role !== 'admin' && user.role !== 'student') {
    redirect('/dashboard');
  }

  let participantRole: 'student' | 'tutor';
  try {
    participantRole = await resolveLessonParticipantRoleForUser({
      bookingId: sessionId,
      profileId: user.profileId,
      role: user.role,
    });
  } catch {
    redirect('/dashboard');
  }

  return (
    <LessonRoom
      sessionId={sessionId}
      userId={user.authUserId}
      participantRole={participantRole}
      displayName={user.displayName}
    />
  );
}
