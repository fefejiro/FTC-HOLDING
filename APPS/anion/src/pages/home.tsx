import { StatusCard } from '../components/shared/StatusCard';
import type { AppUser } from '../lib/foundation-data';

type HomePageProps = {
  currentUser: AppUser;
  tutorCount: number;
  bookingCount: number;
  studentCount: number;
};

export function HomePage({ currentUser, tutorCount, bookingCount, studentCount }: HomePageProps) {
  return (
    <section className="panel hero-panel">
      <h2>Phase 1 Foundation</h2>
      <p>
        Anion now has a working foundation slice for the four build priorities: auth and role model,
        tutor discovery, booking requests, and parent/student profile setup.
      </p>
      <div className="card-grid three-up">
        <StatusCard title="Active role" detail={`${currentUser.displayName} (${currentUser.role})`} />
        <StatusCard title="Tutor directory" detail={`${tutorCount} seeded tutors ready for discovery`} />
        <StatusCard title="Booking state" detail={`${bookingCount} visible booking records in the current role scope`} />
        <StatusCard title="Profile setup" detail={`${studentCount} student profile records visible to this session`} />
      </div>
    </section>
  );
}