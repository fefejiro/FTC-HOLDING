import { createServerClient } from './supabase/server';

const DEFAULT_TIMEZONE = 'Africa/Lagos';
const DEFAULT_DURATION_MINUTES = 50;
const DEFAULT_BUFFER_MINUTES = 10;
const WEEKS_TO_GENERATE = 8;
const LAGOS_UTC_OFFSET_MINUTES = 60;

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

type ProfileNameRow = {
  id: string;
  display_name: string;
};

type ParentRow = {
  id: string;
  profile_id: string;
};

type StudentRow = {
  id: string;
  profile_id: string;
  grade_level: string | null;
};

type TutorRow = {
  id: string;
  profile_id: string;
  headline: string;
  subjects: string[] | null;
};

type ExistingBookingRow = {
  id: string;
  tutor_id: string;
  student_id: string | null;
  requested_start_at: string;
  duration_minutes: number;
  buffer_minutes?: number | null;
  status: string;
};

type ClassPlanInsert = {
  parent_id: string;
  student_id: string;
  tutor_id: string;
  subject: string;
  timezone: string;
  days_of_week: number[];
  start_time: string;
  duration_minutes: number;
  buffer_minutes: number;
  start_date: string;
  end_date: string | null;
  status: 'active';
  created_by_profile_id: string;
};

type GeneratedOccurrence = {
  requestedStartAt: string;
  durationMinutes: number;
  bufferMinutes: number;
};

export type ClassPlanSelectOption = {
  id: string;
  label: string;
};

export type ClassPlanFormOptions = {
  parents: ClassPlanSelectOption[];
  students: ClassPlanSelectOption[];
  tutors: ClassPlanSelectOption[];
};

export type RecurringClassPlanInput = {
  parentId: string;
  studentId: string;
  tutorId: string;
  subject: string;
  timezone?: string;
  daysOfWeek: number[];
  startTime: string;
  durationMinutes?: number;
  bufferMinutes?: number;
  startDate: string;
  endDate?: string | null;
};

export type CreatedRecurringClassPlan = {
  classPlanId: string;
  generatedCount: number;
};

function assertAfricaLagosTimezone(timezone: string) {
  if (timezone !== DEFAULT_TIMEZONE) {
    throw new Error('Recurring plans currently support Africa/Lagos timezone only.');
  }
}

function parseInteger(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function startOfUtcDay(dateText: string) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Use YYYY-MM-DD for dates.');
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function parseStartTime(startTime: string) {
  const match = startTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error('Use HH:mm for class start time.');
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function normalizeDays(daysOfWeek: number[]) {
  const days = Array.from(new Set(daysOfWeek.map((day) => Number(day)))).sort((a, b) => a - b);
  if (days.length === 0) throw new Error('Select at least one class day.');
  if (days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error('Class days must be 0-6.');
  }
  return days;
}

function lagosLocalDateToUtc(dateText: string, startTime: string) {
  const date = startOfUtcDay(dateText);
  const { hours, minutes } = parseStartTime(startTime);
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
  ) - LAGOS_UTC_OFFSET_MINUTES * 60_000);
}

function ymd(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function generateRecurringOccurrences(input: {
  daysOfWeek: number[];
  startTime: string;
  startDate: string;
  endDate?: string | null;
  durationMinutes?: number;
  bufferMinutes?: number;
  timezone?: string;
  weeksToGenerate?: number;
}): GeneratedOccurrence[] {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  assertAfricaLagosTimezone(timezone);

  const days = normalizeDays(input.daysOfWeek);
  const durationMinutes = parseInteger(input.durationMinutes, DEFAULT_DURATION_MINUTES);
  const bufferMinutes = parseInteger(input.bufferMinutes, DEFAULT_BUFFER_MINUTES);
  const weeksToGenerate = parseInteger(input.weeksToGenerate, WEEKS_TO_GENERATE);

  if (durationMinutes < 30 || durationMinutes > 240) {
    throw new Error('Duration must be 30-240 minutes.');
  }

  if (bufferMinutes < 0 || bufferMinutes > 120) {
    throw new Error('Buffer must be 0-120 minutes.');
  }

  const startDay = startOfUtcDay(input.startDate);
  const windowEnd = new Date(startDay.getTime() + weeksToGenerate * 7 * 24 * 60 * 60_000);
  const endDate = input.endDate ? addMinutes(startOfUtcDay(input.endDate), 24 * 60) : null;
  const finalDay = endDate && endDate < windowEnd ? endDate : windowEnd;

  const occurrences: GeneratedOccurrence[] = [];
  for (let cursor = new Date(startDay); cursor < finalDay; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!days.includes(cursor.getUTCDay())) continue;

    occurrences.push({
      requestedStartAt: lagosLocalDateToUtc(ymd(cursor), input.startTime).toISOString(),
      durationMinutes,
      bufferMinutes,
    });
  }

  return occurrences;
}

function bookingWindow(booking: {
  requested_start_at?: string;
  requestedStartAt?: string;
  duration_minutes?: number;
  durationMinutes?: number;
  buffer_minutes?: number | null;
  bufferMinutes?: number;
}) {
  const start = new Date(booking.requested_start_at ?? booking.requestedStartAt ?? '');
  const durationMinutes = booking.duration_minutes ?? booking.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const bufferMinutes = booking.buffer_minutes ?? booking.bufferMinutes ?? DEFAULT_BUFFER_MINUTES;
  return {
    start,
    end: addMinutes(start, durationMinutes + (bufferMinutes ?? 0)),
  };
}

function windowsOverlap(
  left: ReturnType<typeof bookingWindow>,
  right: ReturnType<typeof bookingWindow>,
) {
  return left.start < right.end && right.start < left.end;
}

function findGeneratedConflicts(occurrences: GeneratedOccurrence[]) {
  const conflicts: string[] = [];
  for (let leftIndex = 0; leftIndex < occurrences.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < occurrences.length; rightIndex += 1) {
      if (windowsOverlap(bookingWindow(occurrences[leftIndex]), bookingWindow(occurrences[rightIndex]))) {
        conflicts.push(occurrences[rightIndex].requestedStartAt);
      }
    }
  }
  return conflicts;
}

async function assertNoBookingConflicts(input: {
  supabase: SupabaseServerClient;
  tutorId: string;
  studentId: string;
  occurrences: GeneratedOccurrence[];
}) {
  if (input.occurrences.length === 0) {
    throw new Error('No classes were generated. Check the selected days and date range.');
  }

  const generatedConflicts = findGeneratedConflicts(input.occurrences);
  if (generatedConflicts.length > 0) {
    throw new Error('Generated class times overlap each other. Adjust the days, time, duration, or buffer.');
  }

  const firstStart = input.occurrences[0].requestedStartAt;
  const last = input.occurrences[input.occurrences.length - 1];
  const lastEnd = addMinutes(new Date(last.requestedStartAt), last.durationMinutes + last.bufferMinutes).toISOString();

  const { data, error } = await input.supabase
    .from('bookings')
    .select('id, tutor_id, student_id, requested_start_at, duration_minutes, buffer_minutes, status')
    .neq('status', 'declined')
    .gte('requested_start_at', addMinutes(new Date(firstStart), -360).toISOString())
    .lte('requested_start_at', lastEnd);

  if (error) throw new Error(error.message);

  const existing = ((data ?? []) as ExistingBookingRow[]).filter(
    (booking) => booking.tutor_id === input.tutorId || booking.student_id === input.studentId,
  );

  for (const occurrence of input.occurrences) {
    const occurrenceWindow = bookingWindow(occurrence);
    const conflict = existing.find((booking) => windowsOverlap(occurrenceWindow, bookingWindow(booking)));
    if (conflict) {
      const party = conflict.tutor_id === input.tutorId ? 'tutor' : 'student';
      throw new Error(`Recurring class conflicts with an existing ${party} booking at ${new Date(conflict.requested_start_at).toLocaleString()}.`);
    }
  }
}

async function assertClassPlanRelationships(input: {
  supabase: SupabaseServerClient;
  parentId: string;
  studentId: string;
  tutorId: string;
}) {
  const [{ data: link, error: linkError }, { data: tutor, error: tutorError }] = await Promise.all([
    input.supabase
      .from('parent_student_links')
      .select('parent_id')
      .eq('parent_id', input.parentId)
      .eq('student_id', input.studentId)
      .maybeSingle(),
    input.supabase
      .from('tutors')
      .select('id')
      .eq('id', input.tutorId)
      .maybeSingle(),
  ]);

  if (linkError) throw new Error(linkError.message);
  if (tutorError) throw new Error(tutorError.message);
  if (!link) throw new Error('Selected student is not linked to the selected parent.');
  if (!tutor) throw new Error('Selected tutor was not found.');
}

async function profileNameMapForIds(supabase: SupabaseServerClient, profileIds: string[]) {
  const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));
  if (uniqueProfileIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', uniqueProfileIds);

  if (error) throw new Error(error.message);

  return new Map(((data ?? []) as ProfileNameRow[]).map((row) => [row.id, row.display_name]));
}

export async function listClassPlanFormOptions(): Promise<ClassPlanFormOptions> {
  const supabase = await createServerClient();

  const [{ data: parents, error: parentsError }, { data: students, error: studentsError }, { data: tutors, error: tutorsError }] =
    await Promise.all([
      supabase.from('parents').select('id, profile_id').order('created_at', { ascending: true }),
      supabase.from('students').select('id, profile_id, grade_level').order('created_at', { ascending: true }),
      supabase.from('tutors').select('id, profile_id, headline, subjects').order('created_at', { ascending: true }),
    ]);

  if (parentsError) throw new Error(parentsError.message);
  if (studentsError) throw new Error(studentsError.message);
  if (tutorsError) throw new Error(tutorsError.message);

  const parentRows = (parents ?? []) as ParentRow[];
  const studentRows = (students ?? []) as StudentRow[];
  const tutorRows = (tutors ?? []) as TutorRow[];
  const names = await profileNameMapForIds(supabase, [
    ...parentRows.map((row) => row.profile_id),
    ...studentRows.map((row) => row.profile_id),
    ...tutorRows.map((row) => row.profile_id),
  ]);

  return {
    parents: parentRows
      .map((parent) => ({ id: parent.id, label: names.get(parent.profile_id) ?? `Parent ${parent.id.slice(0, 8)}` }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    students: studentRows
      .map((student) => {
        const name = names.get(student.profile_id) ?? `Student ${student.id.slice(0, 8)}`;
        return { id: student.id, label: student.grade_level ? `${name} (Grade ${student.grade_level})` : name };
      })
      .sort((left, right) => left.label.localeCompare(right.label)),
    tutors: tutorRows
      .map((tutor) => {
        const name = names.get(tutor.profile_id);
        const subjects = tutor.subjects?.length ? ` (${tutor.subjects.join(', ')})` : '';
        return { id: tutor.id, label: `${name ? `${name} - ` : ''}${tutor.headline}${subjects}` };
      })
      .sort((left, right) => left.label.localeCompare(right.label)),
  };
}

async function currentAdminProfileId(supabase: SupabaseServerClient) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('You must be logged in.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) throw new Error('Profile not found for current user.');

  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('profile_id', profile.id)
    .eq('role', 'admin')
    .single();

  if (roleError || !role) throw new Error('Only admins can create recurring class plans.');

  return profile.id as string;
}

export async function createRecurringClassPlan(input: RecurringClassPlanInput): Promise<CreatedRecurringClassPlan> {
  const supabase = await createServerClient();
  const profileId = await currentAdminProfileId(supabase);

  const subject = input.subject.trim();
  if (subject.length < 2) throw new Error('Subject is required.');

  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const durationMinutes = parseInteger(input.durationMinutes, DEFAULT_DURATION_MINUTES);
  const bufferMinutes = parseInteger(input.bufferMinutes, DEFAULT_BUFFER_MINUTES);
  const daysOfWeek = normalizeDays(input.daysOfWeek);
  await assertClassPlanRelationships({
    supabase,
    parentId: input.parentId,
    studentId: input.studentId,
    tutorId: input.tutorId,
  });

  const occurrences = generateRecurringOccurrences({
    daysOfWeek,
    startTime: input.startTime,
    startDate: input.startDate,
    endDate: input.endDate || null,
    durationMinutes,
    bufferMinutes,
    timezone,
  });

  await assertNoBookingConflicts({
    supabase,
    tutorId: input.tutorId,
    studentId: input.studentId,
    occurrences,
  });

  const classPlan: ClassPlanInsert = {
    parent_id: input.parentId,
    student_id: input.studentId,
    tutor_id: input.tutorId,
    subject,
    timezone,
    days_of_week: daysOfWeek,
    start_time: input.startTime,
    duration_minutes: durationMinutes,
    buffer_minutes: bufferMinutes,
    start_date: input.startDate,
    end_date: input.endDate || null,
    status: 'active',
    created_by_profile_id: profileId,
  };

  const { data: insertedPlan, error: planError } = await supabase
    .from('class_plans')
    .insert(classPlan)
    .select('id')
    .single();

  if (planError || !insertedPlan) {
    throw new Error(planError?.message ?? 'Could not create class plan.');
  }

  const classPlanId = insertedPlan.id as string;
  const { error: bookingError } = await supabase.from('bookings').insert(
    occurrences.map((occurrence) => ({
      parent_id: input.parentId,
      student_id: input.studentId,
      tutor_id: input.tutorId,
      subject,
      requested_start_at: occurrence.requestedStartAt,
      duration_minutes: occurrence.durationMinutes,
      buffer_minutes: occurrence.bufferMinutes,
      status: 'accepted',
      booking_kind: 'recurring',
      class_plan_id: classPlanId,
      notes: `Generated from recurring class plan. ${timezone} ${input.startTime}.`,
    })),
  );

  if (bookingError) {
    await supabase.from('class_plans').delete().eq('id', classPlanId);
    throw new Error(bookingError.message);
  }

  return {
    classPlanId,
    generatedCount: occurrences.length,
  };
}
