import { createServerClient } from './supabase/server';

export type BookingStatus = 'pending' | 'accepted' | 'declined';

export type BookingRow = {
  id: string;
  parent_id: string;
  parent_name: string | null;
  tutor_id: string;
  tutor_name: string | null;
  student_id: string | null;
  student_name: string | null;
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
  student_id: string | null;
  tutor_name: string | null;
  subject: string;
  requested_start_at: string;
  duration_minutes: number;
  status: BookingStatus;
};

export type ParentLinkedStudent = {
  id: string;
  display_name: string;
  grade_level: string | null;
  linked_at: string;
};

export type BookingDisplayDetail = {
  id: string;
  subject: string;
  status: BookingStatus;
  requested_start_at: string;
  duration_minutes: number;
  notes: string | null;
  parent_name: string | null;
  student_id: string | null;
  student_name: string | null;
  tutor_name: string | null;
};

type StudentProfileRow = {
  id: string;
  profile_id: string;
  grade_level: string | null;
};

type ProfileDisplayRow = {
  id: string;
  display_name: string;
};

type TutorProfileRow = {
  id: string;
  profile_id: string;
};

type ParentProfileRow = {
  id: string;
  profile_id: string;
};

type ParentStudentLinkRow = {
  student_id: string;
  created_at: string;
};

async function getStudentNameMap(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  studentIds: string[],
): Promise<Map<string, { displayName: string; gradeLevel: string | null }>> {
  const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));
  if (uniqueStudentIds.length === 0) {
    return new Map();
  }

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, profile_id, grade_level')
    .in('id', uniqueStudentIds);

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentRows = (students ?? []) as StudentProfileRow[];
  const profileIds = Array.from(new Set(studentRows.map((row) => row.profile_id)));

  let profileNameMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profileNameMap = new Map(
      ((profiles ?? []) as ProfileDisplayRow[]).map((row) => [row.id, row.display_name]),
    );
  }

  return new Map(
    studentRows.map((row) => [
      row.id,
      {
        displayName: profileNameMap.get(row.profile_id) ?? `Student ${row.id.slice(0, 8)}`,
        gradeLevel: row.grade_level,
      },
    ]),
  );
}

async function getTutorNameMap(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tutorIds: string[],
): Promise<Map<string, string>> {
  const uniqueTutorIds = Array.from(new Set(tutorIds.filter(Boolean)));
  if (uniqueTutorIds.length === 0) {
    return new Map();
  }

  const { data: tutors, error: tutorsError } = await supabase
    .from('tutors')
    .select('id, profile_id')
    .in('id', uniqueTutorIds);

  if (tutorsError) {
    throw new Error(tutorsError.message);
  }

  const tutorRows = (tutors ?? []) as TutorProfileRow[];
  const profileIds = Array.from(new Set(tutorRows.map((row) => row.profile_id)));

  let profileNameMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profileNameMap = new Map(
      ((profiles ?? []) as ProfileDisplayRow[]).map((row) => [row.id, row.display_name]),
    );
  }

  return new Map(
    tutorRows.map((row) => [row.id, profileNameMap.get(row.profile_id) ?? `Tutor ${row.id.slice(0, 8)}`]),
  );
}

async function getParentNameMap(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  parentIds: string[],
): Promise<Map<string, string>> {
  const uniqueParentIds = Array.from(new Set(parentIds.filter(Boolean)));
  if (uniqueParentIds.length === 0) {
    return new Map();
  }

  const { data: parents, error: parentsError } = await supabase
    .from('parents')
    .select('id, profile_id')
    .in('id', uniqueParentIds);

  if (parentsError) {
    throw new Error(parentsError.message);
  }

  const parentRows = (parents ?? []) as ParentProfileRow[];
  const profileIds = Array.from(new Set(parentRows.map((row) => row.profile_id)));

  let profileNameMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profileNameMap = new Map(
      ((profiles ?? []) as ProfileDisplayRow[]).map((row) => [row.id, row.display_name]),
    );
  }

  return new Map(
    parentRows.map((row) => [row.id, profileNameMap.get(row.profile_id) ?? `Parent ${row.id.slice(0, 8)}`]),
  );
}

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
    .select('id, parent_id, tutor_id, student_id, subject, requested_start_at, duration_minutes, notes, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Omit<BookingRow, 'student_name' | 'parent_name' | 'tutor_name'>[];
  const studentNameMap = await getStudentNameMap(
    supabase,
    rows.map((row) => row.student_id).filter((value): value is string => Boolean(value)),
  );
  const parentNameMap = await getParentNameMap(supabase, rows.map((row) => row.parent_id));
  const tutorNameMap = await getTutorNameMap(supabase, rows.map((row) => row.tutor_id));

  return rows.map((row) => ({
    ...row,
    parent_name: parentNameMap.get(row.parent_id) ?? null,
    tutor_name: tutorNameMap.get(row.tutor_id) ?? null,
    student_name: row.student_id ? (studentNameMap.get(row.student_id)?.displayName ?? null) : null,
  }));
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

  const studentIds: string[] = Array.from(new Set((links ?? []).map((row: ParentStudentLinkRow) => row.student_id as string)));
  if (studentIds.length === 0) {
    return [];
  }

  const studentNameMap = await getStudentNameMap(supabase, studentIds);

  return (links ?? []).map((link: ParentStudentLinkRow) => ({
    id: link.student_id as string,
    display_name: studentNameMap.get(link.student_id as string)?.displayName ?? `Student ${(link.student_id as string).slice(0, 8)}`,
    grade_level: studentNameMap.get(link.student_id as string)?.gradeLevel ?? null,
    linked_at: link.created_at as string,
  }));
}

export async function listTutorBookings(): Promise<BookingRow[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('id, parent_id, tutor_id, student_id, subject, requested_start_at, duration_minutes, notes, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Omit<BookingRow, 'student_name' | 'parent_name' | 'tutor_name'>[];
  const studentNameMap = await getStudentNameMap(
    supabase,
    rows.map((row) => row.student_id).filter((value): value is string => Boolean(value)),
  );
  const parentNameMap = await getParentNameMap(supabase, rows.map((row) => row.parent_id));
  const tutorNameMap = await getTutorNameMap(supabase, rows.map((row) => row.tutor_id));

  return rows.map((row) => ({
    ...row,
    parent_name: parentNameMap.get(row.parent_id) ?? null,
    tutor_name: tutorNameMap.get(row.tutor_id) ?? null,
    student_name: row.student_id ? (studentNameMap.get(row.student_id)?.displayName ?? null) : null,
  }));
}

export async function listAdminRecentBookings(limit = 10): Promise<BookingDisplayDetail[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('id, parent_id, tutor_id, student_id, subject, status, requested_start_at, duration_minutes, notes')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    parent_id: string;
    tutor_id: string;
    student_id: string | null;
    subject: string;
    status: BookingStatus;
    requested_start_at: string;
    duration_minutes: number;
    notes: string | null;
  }>;

  const studentNameMap = await getStudentNameMap(
    supabase,
    rows.map((row) => row.student_id).filter((value): value is string => Boolean(value)),
  );
  const tutorNameMap = await getTutorNameMap(supabase, rows.map((row) => row.tutor_id));
  const parentNameMap = await getParentNameMap(supabase, rows.map((row) => row.parent_id));

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    requested_start_at: row.requested_start_at,
    duration_minutes: row.duration_minutes,
    notes: row.notes,
    parent_name: parentNameMap.get(row.parent_id) ?? null,
    student_id: row.student_id,
    student_name: row.student_id ? (studentNameMap.get(row.student_id)?.displayName ?? null) : null,
    tutor_name: tutorNameMap.get(row.tutor_id) ?? null,
  }));
}

export async function getBookingDisplayDetail(bookingId: string): Promise<BookingDisplayDetail> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('id, parent_id, tutor_id, student_id, subject, status, requested_start_at, duration_minutes, notes')
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    throw new Error('Booking not found.');
  }

  const row = data as {
    id: string;
    parent_id: string;
    tutor_id: string;
    student_id: string | null;
    subject: string;
    status: BookingStatus;
    requested_start_at: string;
    duration_minutes: number;
    notes: string | null;
  };

  const studentNameMap = await getStudentNameMap(
    supabase,
    row.student_id ? [row.student_id] : [],
  );
  const tutorNameMap = await getTutorNameMap(supabase, [row.tutor_id]);
  const parentNameMap = await getParentNameMap(supabase, [row.parent_id]);

  return {
    id: row.id,
    subject: row.subject,
    status: row.status,
    requested_start_at: row.requested_start_at,
    duration_minutes: row.duration_minutes,
    notes: row.notes,
    parent_name: parentNameMap.get(row.parent_id) ?? null,
    student_id: row.student_id,
    student_name: row.student_id ? (studentNameMap.get(row.student_id)?.displayName ?? null) : null,
    tutor_name: tutorNameMap.get(row.tutor_id) ?? null,
  };
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

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, tutor_id, student_id, subject, requested_start_at, duration_minutes, status')
    .eq('status', 'accepted')
    .order('requested_start_at', { ascending: true })
    .limit(20);

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const rows = (bookings ?? []) as Array<{
    id: string;
    tutor_id: string;
    student_id: string | null;
    subject: string;
    requested_start_at: string;
    duration_minutes: number;
    status: BookingStatus;
  }>;
  const tutorNameMap = await getTutorNameMap(supabase, rows.map((row) => row.tutor_id));

  return rows.map((row) => ({
    id: row.id,
    tutor_name: tutorNameMap.get(row.tutor_id) ?? null,
    student_id: row.student_id,
    subject: row.subject,
    requested_start_at: row.requested_start_at,
    duration_minutes: row.duration_minutes,
    status: row.status,
  }));
}

export async function resolveLessonParticipantRoleForUser(input: {
  bookingId: string;
  profileId: string;
  role: 'student' | 'parent' | 'tutor' | 'admin';
}): Promise<'student' | 'tutor'> {
  const supabase = await createServerClient();

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, parent_id, tutor_id, student_id, status')
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
      if (booking.student_id === student.id) {
        return 'student';
      }

      if (!booking.student_id) {
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
  }

  throw new Error('You are not allowed to access this lesson.');
}

export async function createBookingRequest(input: {
  tutorId: string;
  studentId: string;
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

  const { data: link, error: linkError } = await supabase
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_id', parent.id)
    .eq('student_id', input.studentId)
    .maybeSingle();

  if (linkError) {
    throw new Error(linkError.message);
  }

  if (!link) {
    throw new Error('Selected student is not linked to this parent account.');
  }

  const { error } = await supabase.from('bookings').insert({
    parent_id: parent.id,
    tutor_id: input.tutorId,
    student_id: input.studentId,
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
