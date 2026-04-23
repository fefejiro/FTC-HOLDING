import type { TutorDirectoryEntry } from '../../lib/foundation-data';

type TutorCardProps = {
  tutor: TutorDirectoryEntry;
  onRequestBooking: (tutorId: string) => void;
};

export function TutorCard({ tutor, onRequestBooking }: TutorCardProps) {
  return (
    <article className="card">
      <strong>{tutor.displayName}</strong>
      <p>{tutor.headline}</p>
      <p>{tutor.bio}</p>
      <p>Subjects: {tutor.subjects.join(', ')}</p>
      <p>Audience: {tutor.audience}</p>
      <p>Timezone: {tutor.timezone}</p>
      <p>Rate: {tutor.hourlyRate}</p>
      <button className="button" onClick={() => onRequestBooking(tutor.id)} type="button">
        Start booking request
      </button>
    </article>
  );
}