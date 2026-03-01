import NoteCard from '../NoteCard';

export default function NoteCardExample() {
  return (
    <div className="p-4 max-w-md">
      <NoteCard
        id="1"
        title="Emma's allergies"
        content="Remember Emma is allergic to peanuts. Check all snacks before sending to school."
        createdBy="Alex"
        date="Oct 8"
      />
    </div>
  );
}
