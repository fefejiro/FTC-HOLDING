import type { ParentProfile, StudentProfile } from '../types/domain';
import type { AppUser } from '../lib/foundation-data';

type ProfileSetupPageProps = {
  currentUser: AppUser;
  students: StudentProfile[];
  parentProfile: ParentProfile | null;
};

export function ProfileSetupPage({ currentUser, students, parentProfile }: ProfileSetupPageProps) {
  const visibleStudents =
    currentUser.role === 'parent' && parentProfile
      ? students.filter((student) => parentProfile.linkedStudentIds.includes(student.id))
      : currentUser.role === 'student'
        ? students.filter((student) => student.id === (currentUser.studentId || currentUser.id))
        : students;

  return (
    <section className="panel">
      <h2>Parent and Student Profiles</h2>
      <p>
        Phase 1 profile setup keeps the data contract small: identity, role, linked students,
        and grade context. Anything beyond that waits until the booking loop is stable.
      </p>
      <div className="card-grid two-up">
        <article className="card">
          <h3>Active Identity</h3>
          <p><strong>{currentUser.displayName}</strong></p>
          <p>{currentUser.email}</p>
          <p>Role: {currentUser.role}</p>
        </article>
        <article className="card">
          <h3>Setup Checklist</h3>
          <ul>
            <li>Confirm role-aware onboarding fields</li>
            <li>Link parent accounts to student records</li>
            <li>Capture grade level before tutor matching</li>
            <li>Keep billing and lesson history out of Phase 1 setup</li>
          </ul>
        </article>
      </div>
      <div className="card-grid two-up">
        {visibleStudents.map((student) => (
          <article className="card" key={student.id}>
            <h3>{student.displayName}</h3>
            <p>Grade level: {student.gradeLevel || 'Pending'}</p>
            <p>Status: ready for discovery and booking.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
