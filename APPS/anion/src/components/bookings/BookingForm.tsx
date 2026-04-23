import { useState } from 'react';
import type { AppUser, BookingRequestRecord, TutorDirectoryEntry } from '../../lib/foundation-data';
import type { StudentProfile } from '../../types/domain';

type BookingFormProps = {
  currentUser: AppUser;
  tutors: TutorDirectoryEntry[];
  students: StudentProfile[];
  selectedTutorId: string;
  bookings: BookingRequestRecord[];
  onSubmit: (draft: { tutorId: string; studentId: string; requestedSlot: string; notes: string }) => void;
};

export function BookingForm({
  currentUser,
  tutors,
  students,
  selectedTutorId,
  bookings,
  onSubmit,
}: BookingFormProps) {
  const [tutorId, setTutorId] = useState(selectedTutorId || tutors[0]?.id || '');
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [requestedSlot, setRequestedSlot] = useState('2026-05-01T17:00:00.000Z');
  const [notes, setNotes] = useState('Focus on current learning gap and expected outcome for the session.');

  return (
    <section className="panel">
      <h2>Booking Request Flow</h2>
      <p>Booking is treated as a state machine first: who requested, which student, which tutor, and what slot.</p>
      <form
        className="booking-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ tutorId, studentId, requestedSlot, notes });
        }}
      >
        <label className="field">
          <span>Requesting role</span>
          <input disabled value={currentUser.role} />
        </label>
        <label className="field">
          <span>Tutor</span>
          <select value={tutorId} onChange={(event) => setTutorId(event.target.value)}>
            {tutors.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>{tutor.displayName}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Student</span>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.displayName}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Requested slot (ISO for now)</span>
          <input value={requestedSlot} onChange={(event) => setRequestedSlot(event.target.value)} />
        </label>
        <label className="field">
          <span>Session notes</span>
          <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button className="button button-active" type="submit">Create booking request</button>
      </form>

      <div className="card-grid two-up">
        {bookings.map((booking) => (
          <article className="card" key={booking.id}>
            <h3>{booking.studentName} → {booking.tutorName}</h3>
            <p>Status: {booking.status}</p>
            <p>Requested slot: {booking.requestedSlot}</p>
            <p>Requested by: {booking.requestedBy}</p>
            <p>{booking.notes}</p>
          </article>
        ))}
      </div>
    </section>
  );
}