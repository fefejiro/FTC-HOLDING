import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { getBookingDisplayDetail, resolveLessonParticipantRoleForUser } from '@/app/lib/bookings';
import { listClassroomPostsForStudentIds } from '@/app/lib/classroom';
import LessonRoom from './LessonRoom';

type LessonPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function LessonSessionPage({ params }: LessonPageProps) {
  const { sessionId } = await params;

  const user = await getCurrentUser({ preferredRole: ['tutor', 'student'] });
  if (!user) redirect('/login');

  if (user.role !== 'tutor' && user.role !== 'student') {
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

  let bookingDetail;
  try {
    bookingDetail = await getBookingDisplayDetail(sessionId);
  } catch {
    redirect('/dashboard');
  }

  const classroomTimeline = bookingDetail.student_id
    ? await listClassroomPostsForStudentIds([bookingDetail.student_id], 8)
    : [];

  return (
    <LessonRoom
      sessionId={sessionId}
      userId={user.authUserId}
      profileId={user.profileId}
      participantRole={participantRole}
      displayName={user.displayName}
      lessonTitle={bookingDetail.subject}
      parentName={bookingDetail.parent_name}
      studentName={bookingDetail.student_name}
      tutorName={bookingDetail.tutor_name}
      bookingNotes={bookingDetail.notes}
      classroomTimeline={classroomTimeline}
    />
  );
}
