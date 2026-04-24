import { createBrowserClient } from '@ftc/supabase';
import type { AppRole, AppUser, BookingRequestRecord, TutorDirectoryEntry } from './foundation-data';
import type { ParentProfile, StudentProfile } from '../types/domain';

type ProfileRow = {
  id: string;
  auth_user_id: string;
  display_name: string;
};

type RoleRow = {
  role: 'tutor' | 'student' | 'parent' | 'admin';
};

type StudentRow = {
  id: string;
  profile_id: string;
  grade_level: string | null;
};

type ParentRow = {
  id: string;
  profile_id: string;
};

type TutorRow = {
  id: string;
  profile_id: string;
  headline: string;
  bio: string | null;
  subjects: string[];
  hourly_rate_cents: number | null;
};

type ParentStudentLinkRow = {
  student_id: string;
};

type BookingRow = {
  id: string;
  tutor_id: string;
  student_id: string;
  parent_id: string | null;
  starts_at: string;
  status: BookingRequestRecord['status'];
  notes: string | null;
};

type ProfileBundle = {
  user: AppUser;
  availableRoles: AppRole[];
  students: StudentProfile[];
  parentProfile: ParentProfile | null;
};

const roleMap: Record<RoleRow['role'], AppRole> = {
  tutor: 'tutor',
  student: 'student',
  parent: 'parent',
  admin: 'operator',
};

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

function getClient() {
  cachedClient ??= createBrowserClient();
  return cachedClient;
}

function formatHourlyRate(hourlyRateCents: number | null) {
  if (!hourlyRateCents) {
    return 'TBD';
  }

  return `$${(hourlyRateCents / 100).toFixed(0)}/hr`;
}

function formatRequestedSlot(startsAt: string) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return startsAt;
  }

  return date.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchProfilesByIds(profileIds: string[]) {
  if (!profileIds.length) {
    return new Map<string, ProfileRow>();
  }

  const { data, error } = await getClient()
    .from('anion_profiles')
    .select('id, auth_user_id, display_name')
    .in('id', profileIds);

  if (error) {
    throw error;
  }

  return new Map((data as ProfileRow[]).map((profile) => [profile.id, profile]));
}

async function fetchStudentsByIds(studentIds: string[]) {
  if (!studentIds.length) {
    return [] as StudentProfile[];
  }

  const { data, error } = await getClient()
    .from('anion_students')
    .select('id, profile_id, grade_level')
    .in('id', studentIds);

  if (error) {
    throw error;
  }

  const studentRows = data as StudentRow[];
  const profileMap = await fetchProfilesByIds(studentRows.map((row) => row.profile_id));

  return studentRows.map((row) => ({
    id: row.id,
    displayName: profileMap.get(row.profile_id)?.display_name || 'Student',
    gradeLevel: row.grade_level,
  }));
}

export async function fetchProfileBundle(authUserId: string): Promise<ProfileBundle | null> {
  const { data: profileData, error: profileError } = await getClient()
    .from('anion_profiles')
    .select('id, auth_user_id, display_name')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const profile = profileData as ProfileRow | null;
  if (!profile) {
    return null;
  }

  const { data: roleData, error: roleError } = await getClient()
    .from('anion_user_roles')
    .select('role')
    .eq('profile_id', profile.id);

  if (roleError) {
    throw roleError;
  }

  const availableRoles = ((roleData as RoleRow[]).map((row) => roleMap[row.role]) || []).filter(Boolean);
  const activeRole = availableRoles[0] || 'parent';

  const { data: studentData } = await getClient()
    .from('anion_students')
    .select('id, profile_id, grade_level')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const { data: tutorData } = await getClient()
    .from('anion_tutors')
    .select('id, profile_id, headline')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const { data: parentData } = await getClient()
    .from('anion_parents')
    .select('id, profile_id')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const parentRow = (parentData as ParentRow | null) || null;
  const studentRow = (studentData as StudentRow | null) || null;
  const tutorRow = (tutorData as TutorRow | null) || null;

  let linkedStudentIds: string[] = [];
  let students: StudentProfile[] = [];
  let parentProfile: ParentProfile | null = null;

  if (parentRow) {
    const { data: linkData, error: linkError } = await getClient()
      .from('anion_parent_student_links')
      .select('student_id')
      .eq('parent_id', parentRow.id);

    if (linkError) {
      throw linkError;
    }

    linkedStudentIds = (linkData as ParentStudentLinkRow[]).map((row) => row.student_id);
    students = await fetchStudentsByIds(linkedStudentIds);
    parentProfile = {
      id: parentRow.id,
      displayName: profile.display_name,
      linkedStudentIds,
    };
  } else if (studentRow) {
    students = await fetchStudentsByIds([studentRow.id]);
  }

  return {
    user: {
      id: profile.id,
      authUserId,
      profileId: profile.id,
      studentId: studentRow?.id,
      parentId: parentRow?.id,
      tutorId: tutorRow?.id,
      displayName: profile.display_name,
      email: '',
      role: activeRole,
      linkedStudentIds,
      headline: tutorRow?.headline,
    },
    availableRoles: availableRoles.length ? availableRoles : [activeRole],
    students,
    parentProfile,
  };
}

export async function fetchTutorDirectoryEntries(): Promise<TutorDirectoryEntry[]> {
  const { data, error } = await getClient()
    .from('anion_tutors')
    .select('id, profile_id, headline, bio, subjects, hourly_rate_cents');

  if (error) {
    throw error;
  }

  const tutorRows = (data as TutorRow[]) || [];
  const profileMap = await fetchProfilesByIds(tutorRows.map((row) => row.profile_id));

  return tutorRows.map((row) => ({
    id: row.id,
    displayName: profileMap.get(row.profile_id)?.display_name || 'Tutor',
    headline: row.headline,
    bio: row.bio || 'Tutor profile pending richer biography.',
    subjects: row.subjects || [],
    timezone: 'America/Toronto',
    audience: 'Configured in Supabase profile',
    hourlyRate: formatHourlyRate(row.hourly_rate_cents),
  }));
}

export async function fetchBookingRequests(currentUser: AppUser): Promise<BookingRequestRecord[]> {
  let query = getClient()
    .from('anion_bookings')
    .select('id, tutor_id, student_id, parent_id, starts_at, status, notes')
    .order('starts_at', { ascending: false });

  if (currentUser.role === 'tutor' && currentUser.tutorId) {
    query = query.eq('tutor_id', currentUser.tutorId);
  } else if (currentUser.role === 'student' && currentUser.studentId) {
    query = query.eq('student_id', currentUser.studentId);
  } else if (currentUser.role === 'parent' && currentUser.parentId) {
    query = query.eq('parent_id', currentUser.parentId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const bookingRows = (data as BookingRow[]) || [];
  const tutorIds = [...new Set(bookingRows.map((row) => row.tutor_id))];
  const studentIds = [...new Set(bookingRows.map((row) => row.student_id))];

  const { data: tutorData, error: tutorError } = await getClient()
    .from('anion_tutors')
    .select('id, profile_id, headline, bio, subjects, hourly_rate_cents')
    .in('id', tutorIds);

  if (tutorError) {
    throw tutorError;
  }

  const tutorRows = (tutorData as TutorRow[]) || [];
  const tutorProfiles = await fetchProfilesByIds(tutorRows.map((row) => row.profile_id));
  const students = await fetchStudentsByIds(studentIds);
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const tutorMap = new Map(
    tutorRows.map((row) => [row.id, tutorProfiles.get(row.profile_id)?.display_name || 'Tutor'])
  );

  return bookingRows.map((row) => ({
    id: row.id,
    tutorId: row.tutor_id,
    tutorName: tutorMap.get(row.tutor_id) || 'Tutor',
    studentId: row.student_id,
    studentName: studentMap.get(row.student_id)?.displayName || 'Student',
    status: row.status,
    requestedSlot: formatRequestedSlot(row.starts_at),
    requestedBy: row.parent_id ? 'parent' : 'student',
    notes: row.notes || 'No notes attached.',
  }));
}

export async function createBookingRequestRecord(
  currentUser: AppUser,
  draft: { tutorId: string; studentId: string; requestedSlot: string; notes: string }
) {
  const startsAt = new Date(draft.requestedSlot);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error('Requested slot must be a valid ISO date/time value.');
  }

  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const { error } = await getClient().from('anion_bookings').insert({
    tutor_id: draft.tutorId,
    student_id: draft.studentId,
    parent_id: currentUser.parentId || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: 'pending',
    notes: draft.notes,
  });

  if (error) {
    throw error;
  }
}
