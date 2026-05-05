import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/home';
import { TutorsPage } from './pages/tutors';
import { BookingsPage } from './pages/bookings';
import { LessonRoomPage } from './pages/lesson-room';
import { PricingPage } from './pages/pricing';
import { AdminDashboardPage } from './pages/admin/dashboard';

export default function App() {
  return (
    <AppShell>
      <HomePage />
      <TutorsPage />
      <BookingsPage />
      <LessonRoomPage />
      <PricingPage />
      <AdminDashboardPage />
    </AppShell>
  );
}