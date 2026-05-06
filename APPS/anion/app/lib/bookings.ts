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
