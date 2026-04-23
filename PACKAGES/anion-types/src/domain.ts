export type TutorProfile = {
  id: string;
  headline: string;
  subjects: string[];
  timezone: string;
};

export type StudentProfile = {
  id: string;
  displayName: string;
  gradeLevel: string | null;
};

export type ParentProfile = {
  id: string;
  displayName: string;
  linkedStudentIds: string[];
};

export type BookingRecord = {
  id: string;
  tutorId: string;
  studentId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
};

export type SessionRecord = {
  id: string;
  bookingId: string;
  status: 'scheduled' | 'ready' | 'live' | 'ended' | 'reviewed';
};

export type SubscriptionRecord = {
  id: string;
  stripeSubscriptionId: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
};