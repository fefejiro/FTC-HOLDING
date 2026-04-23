import { TutorCard } from '../components/tutors/TutorCard';
import type { TutorDirectoryEntry } from '../lib/foundation-data';

type TutorsPageProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  tutors: TutorDirectoryEntry[];
  onRequestBooking: (tutorId: string) => void;
};

export function TutorsPage({ searchTerm, onSearchTermChange, tutors, onRequestBooking }: TutorsPageProps) {
  return (
    <section className="panel">
      <h2>Tutor Discovery</h2>
      <p>Discovery stays narrow in Phase 1: subject search, tutor summary, and booking CTA.</p>
      <label className="field">
        <span>Search tutors by subject or keyword</span>
        <input value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} />
      </label>
      <div className="card-grid three-up">
        {tutors.map((tutor) => (
          <TutorCard key={tutor.id} tutor={tutor} onRequestBooking={onRequestBooking} />
        ))}
      </div>
    </section>
  );
}