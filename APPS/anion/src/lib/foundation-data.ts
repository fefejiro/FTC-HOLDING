import type { BookingRecord, ParentProfile, StudentProfile, TutorProfile } from '../types/domain';

export type AppRole = 'student' | 'parent' | 'tutor' | 'operator';

export type AppUser = {
  id: string;
  authUserId?: string;
  profileId?: string;
  studentId?: string;
  parentId?: string;
  tutorId?: string;
  displayName: string;
  role: AppRole;
  email: string;
  linkedStudentIds?: string[];
  headline?: string;
};

export const defaultDemoRole: AppRole = 'parent';

export type TutorDirectoryEntry = TutorProfile & {
  displayName: string;
  bio: string;
  audience: string;
  hourlyRate: string;
};

export type BookingRequestRecord = BookingRecord & {
  tutorName: string;
  studentName: string;
  requestedSlot: string;
  requestedBy: AppRole;
  notes: string;
};

export const appUsers: Record<AppRole, AppUser> = {
  student: {
    id: 'student-zoe',
    authUserId: 'student-auth-zoe',
    profileId: 'profile-student-zoe',
    studentId: 'student-zoe',
    displayName: 'Zoe Fejiro',
    role: 'student',
    email: 'zoe@anion.app',
  },
  parent: {
    id: 'parent-grace',
    authUserId: 'parent-auth-grace',
    profileId: 'profile-parent-grace',
    parentId: 'parent-grace',
    displayName: 'Grace Fejiro',
    role: 'parent',
    email: 'grace@anion.app',
    linkedStudentIds: ['student-zoe'],
  },
  tutor: {
    id: 'tutor-ada',
    authUserId: 'tutor-auth-ada',
    profileId: 'profile-tutor-ada',
    tutorId: 'tutor-ada',
    displayName: 'Ada Nwosu',
    role: 'tutor',
    email: 'ada@anion.app',
    headline: 'STEM tutor and exam coach',
  },
  operator: {
    id: 'operator-ftc',
    authUserId: 'operator-auth-ftc',
    profileId: 'profile-operator-ftc',
    displayName: 'FTC Operator',
    role: 'operator',
    email: 'hello@unalabs.cloud',
  },
};

export const studentProfiles: StudentProfile[] = [
  {
    id: 'student-zoe',
    displayName: 'Zoe Fejiro',
    gradeLevel: 'Grade 8',
  },
  {
    id: 'student-kemi',
    displayName: 'Kemi Adebayo',
    gradeLevel: 'Grade 11',
  },
];

export const parentProfiles: ParentProfile[] = [
  {
    id: 'parent-grace',
    displayName: 'Grace Fejiro',
    linkedStudentIds: ['student-zoe'],
  },
];

export const tutorDirectorySeed: TutorDirectoryEntry[] = [
  {
    id: 'tutor-ada',
    displayName: 'Ada Nwosu',
    headline: 'STEM tutor and exam coach',
    subjects: ['Mathematics', 'Physics', 'Exam Prep'],
    timezone: 'America/Toronto',
    bio: 'Focused on senior primary and secondary learners preparing for structured exams.',
    audience: 'Middle school to SS3',
    hourlyRate: '$35/hr',
  },
  {
    id: 'tutor-yemi',
    displayName: 'Yemi Bassey',
    headline: 'English and writing mentor',
    subjects: ['English', 'Literature', 'Essay Coaching'],
    timezone: 'America/Toronto',
    bio: 'Helps students build confidence in comprehension, structured writing, and oral prep.',
    audience: 'Upper primary to high school',
    hourlyRate: '$30/hr',
  },
  {
    id: 'tutor-zara',
    displayName: 'Zara Bello',
    headline: 'Coding and robotics tutor',
    subjects: ['Coding', 'Scratch', 'Robotics'],
    timezone: 'America/Toronto',
    bio: 'Project-based technical tutoring for curious learners who need guided build sessions.',
    audience: 'Kids and teens',
    hourlyRate: '$40/hr',
  },
];

export const bookingSeed: BookingRequestRecord[] = [
  {
    id: 'booking-1',
    tutorId: 'tutor-ada',
    tutorName: 'Ada Nwosu',
    studentId: 'student-zoe',
    studentName: 'Zoe Fejiro',
    status: 'pending',
    requestedSlot: '2026-04-28 17:00 ET',
    requestedBy: 'parent',
    notes: 'Needs help preparing for next week\'s math test.',
  },
  {
    id: 'booking-2',
    tutorId: 'tutor-yemi',
    tutorName: 'Yemi Bassey',
    studentId: 'student-kemi',
    studentName: 'Kemi Adebayo',
    status: 'confirmed',
    requestedSlot: '2026-04-30 19:00 ET',
    requestedBy: 'student',
    notes: 'Essay review ahead of literature submission.',
  },
];
