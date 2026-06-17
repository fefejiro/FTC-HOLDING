import { cookies } from 'next/headers';
import type { CurrentUser } from './auth/getCurrentUser';
import type { BookingDisplayDetail, BookingRow, ParentLinkedStudent, StudentLessonCard, TutorOption } from './bookings';
import type { ClassroomPost, TutorClassroomStudent } from './classroom';

export const DEMO_BOOKING_ID = 'demo-accepted-lesson';
export const DEMO_PARENT_ID = 'demo-parent';
export const DEMO_TUTOR_ID = 'demo-tutor';
export const DEMO_STUDENT_ID = 'demo-student';

export function isLocalDemoEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ANION_LOCAL_DEMO === '1';
}

export async function getLocalDemoRole() {
  if (!isLocalDemoEnabled()) return null;
  const cookieStore = await cookies();
  const role = cookieStore.get('anion_demo_role')?.value;
  return role === 'parent' || role === 'tutor' || role === 'student' || role === 'admin' ? role : null;
}

export async function getLocalDemoCurrentUser(): Promise<CurrentUser | null> {
  const role = await getLocalDemoRole();
  if (!role) return null;

  const names = {
    parent: 'Grace Demo Parent',
    tutor: 'Ada Demo Tutor',
    student: 'Zoe Demo Student',
    admin: 'Anion Demo Admin',
  };

  return {
    authUserId: `${role}-local-auth`,
    email: `${role}@local.anion.test`,
    profileId: `${role}-local-profile`,
    displayName: names[role],
    role,
    roles: [role],
  };
}

const requestedStartAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

export const localDemoBooking: BookingRow = {
  id: DEMO_BOOKING_ID,
  parent_id: DEMO_PARENT_ID,
  parent_name: 'Grace Demo Parent',
  tutor_id: DEMO_TUTOR_ID,
  tutor_name: 'Ada Demo Tutor',
  student_id: DEMO_STUDENT_ID,
  student_name: 'Zoe Demo Student',
  subject: 'Writing and comprehension coaching',
  requested_start_at: requestedStartAt,
  duration_minutes: 60,
  notes: 'Local demo lesson for video-call QA.',
  status: 'accepted',
  created_at: new Date().toISOString(),
};

export const localDemoTutorOptions: TutorOption[] = [
  {
    id: DEMO_TUTOR_ID,
    headline: 'Ada Demo Tutor',
    subjects: ['Writing', 'Reading', 'Study Skills'],
  },
];

export const localDemoLinkedStudents: ParentLinkedStudent[] = [
  {
    id: DEMO_STUDENT_ID,
    display_name: 'Zoe Demo Student',
    grade_level: '6',
    linked_at: new Date().toISOString(),
  },
];

export const localDemoLessonCards: StudentLessonCard[] = [
  {
    id: DEMO_BOOKING_ID,
    student_id: DEMO_STUDENT_ID,
    tutor_name: 'Ada Demo Tutor',
    subject: localDemoBooking.subject,
    requested_start_at: localDemoBooking.requested_start_at,
    duration_minutes: localDemoBooking.duration_minutes,
    status: 'accepted',
  },
];

export const localDemoBookingDetail: BookingDisplayDetail = {
  id: DEMO_BOOKING_ID,
  subject: localDemoBooking.subject,
  status: 'accepted',
  requested_start_at: localDemoBooking.requested_start_at,
  duration_minutes: localDemoBooking.duration_minutes,
  notes: localDemoBooking.notes,
  parent_name: localDemoBooking.parent_name,
  student_id: DEMO_STUDENT_ID,
  student_name: localDemoBooking.student_name,
  tutor_name: localDemoBooking.tutor_name,
};

export const localDemoClassroomPosts: ClassroomPost[] = [
  {
    id: 'demo-post-1',
    authorRole: 'tutor',
    authorName: 'Ada Demo Tutor',
    studentId: DEMO_STUDENT_ID,
    studentName: 'Zoe Demo Student',
    body: 'Today we will practice paragraph structure, main idea, and confidence reading aloud.',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-post-2',
    authorRole: 'student',
    authorName: 'Zoe Demo Student',
    studentId: DEMO_STUDENT_ID,
    studentName: 'Zoe Demo Student',
    body: 'I want help making my introduction stronger.',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

export const localDemoTutorClassroomStudents: TutorClassroomStudent[] = [
  {
    id: DEMO_STUDENT_ID,
    displayName: 'Zoe Demo Student',
    gradeLevel: '6',
  },
];
