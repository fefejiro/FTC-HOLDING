import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/auth/login';
import { TutorsPage } from './pages/tutors';
import { BookingsPage } from './pages/bookings';
import { LessonRoomPage } from './pages/lesson-room';
import { PricingPage } from './pages/pricing';
import { AdminDashboardPage } from './pages/admin/dashboard';
import { ProfileSetupPage } from './pages/profiles';
import { useCurrentUser } from './hooks/useCurrentUser';
import { useTutorDirectory } from './hooks/useTutorDirectory';
import { useBookings } from './hooks/useBookings';

export default function App() {
  const {
    user,
    authEnabled,
    authEmail,
    setAuthEmail,
    authMessage,
    requestMagicLink,
    signOutCurrentUser,
    activeRole,
    setActiveRole,
    availableRoles,
    students,
    parentProfile,
  } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTutorId, setSelectedTutorId] = useState('');
  const { tutors } = useTutorDirectory(searchTerm);
  const { bookings, createBookingRequest } = useBookings(user);

  return (
    <AppShell>
      <HomePage
        currentUser={user}
        tutorCount={tutors.length}
        bookingCount={bookings.length}
        studentCount={students.length}
      />
      <LoginPage
        currentUser={user}
        authEnabled={authEnabled}
        authEmail={authEmail}
        authMessage={authMessage}
        activeRole={activeRole}
        availableRoles={availableRoles}
        onAuthEmailChange={setAuthEmail}
        onMagicLinkRequest={requestMagicLink}
        onRoleChange={setActiveRole}
        onSignOut={signOutCurrentUser}
      />
      <ProfileSetupPage currentUser={user} students={students} parentProfile={parentProfile} />
      <TutorsPage
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        tutors={tutors}
        onRequestBooking={setSelectedTutorId}
      />
      <BookingsPage
        currentUser={user}
        tutors={tutors}
        students={students}
        selectedTutorId={selectedTutorId}
        bookings={bookings}
        onSubmit={(draft) => createBookingRequest(draft, tutors.find((tutor) => tutor.id === draft.tutorId))}
      />
      <LessonRoomPage />
      <PricingPage />
      <AdminDashboardPage
        tutorCount={tutors.length}
        bookingCount={bookings.length}
        studentCount={students.length}
      />
    </AppShell>
  );
}