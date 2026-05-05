import { BookingForm } from '../components/bookings/BookingForm';
import type { AppUser, BookingRequestRecord, TutorDirectoryEntry } from '../lib/foundation-data';
import type { StudentProfile } from '../types/domain';

type BookingsPageProps = {
  currentUser: AppUser;
  tutors: TutorDirectoryEntry[];
  students: StudentProfile[];
  selectedTutorId: string;
  bookings: BookingRequestRecord[];
  onSubmit: (draft: { tutorId: string; studentId: string; requestedSlot: string; notes: string }) => void;
};

export function BookingsPage(props: BookingsPageProps) {
  return <BookingForm {...props} />;
}