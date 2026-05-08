import { createServerClient } from './supabase/server';

export type BookingStatus = 'pending' | 'accepted' | 'declined';

export type BookingRow = {
  id: string;
  parent_id: string;
  tutor_id: string;
  subject: string;
  requested_start_at: string;
  duration_minutes: number;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
};

export type TutorOption = {
  id: string;
  headline: string;
  subjects: string[];
};

export type StudentLessonCard = {
  id: string;
  subject: string;
  requested_start_at: string;
  duration_minutes: number;
  status: BookingStatus;
};

export type ParentLinkedStudent = {
  id: string;
  grade_level: string | null;
  linked_at: string;
};

async function getProfileIdForAuthUser(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found for current user.');
  }

  return profile.id as string;
}

export async function listTutorOptions(): Promise<TutorOption[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('tutors')
    .select('id, headline, subjects')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TutorOption[];
}

export async function listParentBookings(): Promise<BookingRow[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('id, parent_id, tutor_id, subject, requested_start_at, duration_minutes, notes, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BookingRow[];
}

export async function listParentLinkedStudents(): Promise<ParentLinkedStudent[]> {
  const supabase = await createServerClient();
  const profileId = await getProfileIdForAuthUser(supabase);

  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', profileId)
    .single();

  if (parentError || !parent) {
    throw new Error('Parent account not found for current user.');
  }

  const { data: links, error: linksError } = await supabase
    .from('parent_student_links')
    .select('student_id, created_at')
    .eq('parent_id', parent.id)
    .order('created_at', { ascending: false });

  if (linksError) {
    throw new Error(linksError.message);
  }

  const studentIds = Array.from(new Set((links ?? []).map((row) => row.student_id as string)));
  if (studentIds.length === 0) {
    return [];
  }

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, grade_level')
    .in('id', studentIds);

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const gradeByStudentId = new Map((students ?? []).map((row) => [row.id as string, row.grade_level as string | null]));

  return (links ?? []).map((link) => ({
    id: link.student_id as string,
    grade_level: gradeByStudentId.get(link.student_id as string) ?? null,
    linked_at: link.created_at as string,
  }));
}

export async function listTutorBookings(): Promise<BookingRow[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('id, parent_id, tutor_id, subject, requested_start_at, duration_minutes, notes, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BookingRow[];
}

export async function listStudentAcceptedBookings(): Promise<StudentLessonCard[]> {
  const supabase = await createServerClient();
  const profileId = await getProfileIdForAuthUser(supabase);

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', profileId)
    .single();

  if (studentError || !student) {
    throw new Error('Student account not found for current user.');
  }

  const { data: links, error: linksError } = await supabase
    .from('parent_student_links')
    .select('parent_id')
    .eq('student_id', student.id);

  if (linksError) {
    throw new Error(linksError.message);
  }

  const parentIds = Array.from(new Set((links ?? []).map((row) => row.parent_id as string)));
  if (parentIds.length === 0) {
    return [];
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, subject, requested_start_at, duration_minutes, status')
    .in('parent_id', parentIds)
    .eq('status', 'accepted')
    .order('requested_start_at', { ascending: true })
    .limit(20);

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  return (bookings ?? []) as StudentLessonCard[];
}

export async function resolveLessonParticipantRoleForUser(input: {
  bookingId: string;
  profileId: string;
  role: 'student' | 'parent' | 'tutor' | 'admin';
}): Promise<'student' | 'tutor'> {
  const supabase = await createServerClient();

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, parent_id, tutor_id, status')
    .eq('id', input.bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error('Booking not found.');
  }

  if (booking.status !== 'accepted') {
    throw new Error('Lesson room is only available for accepted bookings.');
  }

  if (input.role === 'admin') {
    return 'student';
  }

  if (input.role === 'tutor') {
    const { data: tutor, error: tutorError } = await supabase
      .from('tutors')
      .select('id')
      .eq('profile_id', input.profileId)
      .eq('id', booking.tutor_id)
      .single();

    if (!tutorError && tutor) {
      return 'tutor';
    }
  }

  if (input.role === 'parent') {
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('id')
      .eq('profile_id', input.profileId)
      .eq('id', booking.parent_id)
      .single();

    if (!parentError && parent) {
      return 'student';
    }
  }

  if (input.role === 'student') {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', input.profileId)
      .single();

    if (!studentError && student) {
      const { data: link, error: linkError } = await supabase
        .from('parent_student_links')
        .select('parent_id')
        .eq('student_id', student.id)
        .eq('parent_id', booking.parent_id)
        .maybeSingle();

      if (!linkError && link) {
        return 'student';
      }
    }
  }

  throw new Error('You are not allowed to access this lesson.');
}

export async function createBookingRequest(input: {
  tutorId: string;
  subject: string;
  requestedStartAt: string;
  durationMinutes: number;
  notes?: string;
}): Promise<void> {
  const supabase = await createServerClient();

  const profileId = await getProfileIdForAuthUser(supabase);

  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', profileId)
    .single();

  if (parentError || !parent) {
    throw new Error('Parent account not found for current user.');
  }

  const { error } = await supabase.from('bookings').insert({
    parent_id: parent.id,
    tutor_id: input.tutorId,
    subject: input.subject.trim(),
    requested_start_at: input.requestedStartAt,
    duration_minutes: input.durationMinutes,
    notes: input.notes?.trim() || null,
    status: 'pending',
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function setBookingStatus(input: {
  bookingId: string;
  status: Extract<BookingStatus, 'accepted' | 'declined'>;
}): Promise<void> {
  const supabase = await createServerClient();

  const { data: existing, error: readError } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', input.bookingId)
    .single();

  if (readError || !existing) {
    throw new Error('Booking not found.');
  }

  if (existing.status !== 'pending') {
    throw new Error('Only pending bookings can be updated.');
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq('id', input.bookingId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(error.message);
  }
}
