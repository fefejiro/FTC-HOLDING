import { createServerClient } from './supabase/server';

type ClassroomRole = 'student' | 'tutor';

type ProfileRow = {
  id: string;
  display_name: string;
};

type ClassroomPostRow = {
  id: string;
  author_profile_id: string;
  author_role: ClassroomRole;
  student_id: string | null;
  body: string;
  created_at: string;
};

export type ClassroomPost = {
  id: string;
  authorRole: ClassroomRole;
  authorName: string;
  studentId: string | null;
  studentName: string | null;
  body: string;
  createdAt: string;
};

export type TutorClassroomStudent = {
  id: string;
  displayName: string;
  gradeLevel: string | null;
};

type StudentRow = {
  id: string;
  profile_id: string;
  grade_level: string | null;
};

type TutorRow = {
  id: string;
  profile_id: string;
};

async function mapClassroomPosts(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  posts: ClassroomPostRow[],
): Promise<ClassroomPost[]> {
  const profileIds = Array.from(new Set(posts.map((post) => post.author_profile_id)));

  let profileMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    profileMap = new Map((profileRows ?? []).map((row) => [row.id as string, row.display_name as string]));
  }

  const studentMap = await getStudentNameMap(
    supabase,
    posts.map((post) => post.student_id).filter((value): value is string => Boolean(value)),
  );

  return posts.map((post) => ({
    id: post.id,
    authorRole: post.author_role,
    authorName: profileMap.get(post.author_profile_id) ?? 'Unknown',
    studentId: post.student_id,
    studentName: post.student_id ? (studentMap.get(post.student_id)?.displayName ?? null) : null,
    body: post.body,
    createdAt: post.created_at,
  }));
}

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

  const studentRows = (students ?? []) as StudentRow[];
  const profileIds = Array.from(new Set(studentRows.map((row) => row.profile_id)));

  let profileMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    profileMap = new Map((profileRows ?? []).map((row) => [row.id as string, row.display_name as string]));
  }

  return new Map(
    studentRows.map((row) => [
      row.id,
      {
        displayName: profileMap.get(row.profile_id) ?? `Student ${row.id.slice(0, 8)}`,
        gradeLevel: row.grade_level,
      },
    ]),
  );
}

async function getCurrentClassroomActor(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('auth_user_id', user.id)
    .single();

  const typedProfile = profile as ProfileRow | null;

  if (profileError || !typedProfile) {
    throw new Error('Profile not found for current user.');
  }

  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('profile_id', typedProfile.id)
    .in('role', ['student', 'tutor'])
    .order('created_at', { ascending: true })
    .limit(1);

  if (roleError) {
    throw new Error(roleError.message);
  }

  const role = roles?.[0]?.role as ClassroomRole | undefined;
  if (!role) {
    throw new Error('Only student and tutor accounts can use classroom writing.');
  }

  if (role === 'student') {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id, grade_level')
      .eq('profile_id', typedProfile.id)
      .single();

    if (studentError || !student) {
      throw new Error('Student account not found for current user.');
    }

    return {
      profile: typedProfile,
      role,
      student: student as StudentRow,
      tutor: null,
    };
  }

  const { data: tutor, error: tutorError } = await supabase
    .from('tutors')
    .select('id, profile_id')
    .eq('profile_id', typedProfile.id)
    .single();

  if (tutorError || !tutor) {
    throw new Error('Tutor account not found for current user.');
  }

  return {
    profile: typedProfile,
    role,
    student: null,
    tutor: tutor as TutorRow,
  };
}

export async function listClassroomPosts(limit = 50): Promise<ClassroomPost[]> {
  const supabase = await createServerClient();

  const actor = await getCurrentClassroomActor(supabase);

  let visibleStudentIds: string[] = [];
  if (actor.role === 'student' && actor.student) {
    visibleStudentIds = [actor.student.id];
  } else if (actor.role === 'tutor' && actor.tutor) {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('student_id')
      .eq('tutor_id', actor.tutor.id)
      .eq('status', 'accepted')
      .not('student_id', 'is', null);

    if (bookingsError) {
      throw new Error(bookingsError.message);
    }

    visibleStudentIds = Array.from(new Set((bookings ?? []).map((row) => row.student_id as string).filter(Boolean)));
  }

  if (visibleStudentIds.length === 0) {
    return [];
  }

  return listClassroomPostsForStudentIds(visibleStudentIds, limit, supabase);
}

export async function listClassroomPostsForStudentIds(
  studentIds: string[],
  limit = 50,
  existingClient?: Awaited<ReturnType<typeof createServerClient>>,
): Promise<ClassroomPost[]> {
  const supabase = existingClient ?? await createServerClient();
  const visibleStudentIds = Array.from(new Set(studentIds.filter(Boolean)));
  if (visibleStudentIds.length === 0) {
    return [];
  }

  const { data: rows, error } = await supabase
    .from('classroom_posts')
    .select('id, author_profile_id, author_role, student_id, body, created_at')
    .in('student_id', visibleStudentIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return mapClassroomPosts(supabase, (rows ?? []) as ClassroomPostRow[]);
}

export async function listTutorClassroomStudents(): Promise<TutorClassroomStudent[]> {
  const supabase = await createServerClient();
  const actor = await getCurrentClassroomActor(supabase);

  if (actor.role !== 'tutor' || !actor.tutor) {
    throw new Error('Only tutor accounts can target classroom students.');
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('student_id')
    .eq('tutor_id', actor.tutor.id)
    .eq('status', 'accepted')
    .not('student_id', 'is', null);

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const studentIds = Array.from(new Set((bookings ?? []).map((row) => row.student_id as string).filter(Boolean)));
  const studentMap = await getStudentNameMap(supabase, studentIds);

  return studentIds
    .map((studentId) => ({
      id: studentId,
      displayName: studentMap.get(studentId)?.displayName ?? `Student ${studentId.slice(0, 8)}`,
      gradeLevel: studentMap.get(studentId)?.gradeLevel ?? null,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export async function createClassroomPost(input: { body: string; studentId?: string }): Promise<void> {
  const supabase = await createServerClient();
  const actor = await getCurrentClassroomActor(supabase);

  const body = input.body.trim();
  if (body.length < 2) {
    throw new Error('Write at least 2 characters.');
  }

  if (body.length > 1000) {
    throw new Error('Post is too long. Use 1000 characters or less.');
  }

  let studentId: string;
  if (actor.role === 'student' && actor.student) {
    studentId = actor.student.id;
  } else if (actor.role === 'tutor' && actor.tutor) {
    studentId = input.studentId?.trim() ?? '';
    if (!studentId) {
      throw new Error('Select a student before posting.');
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('tutor_id', actor.tutor.id)
      .eq('student_id', studentId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (bookingError) {
      throw new Error(bookingError.message);
    }

    if (!booking) {
      throw new Error('You can only post to students with an accepted lesson.');
    }
  } else {
    throw new Error('Only student and tutor accounts can use classroom writing.');
  }

  const { error } = await supabase.from('classroom_posts').insert({
    author_profile_id: actor.profile.id,
    author_role: actor.role,
    student_id: studentId,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }
}
