import { useEffect, useState } from 'react';
import { authEnabled } from '../lib/auth';
import { bookingSeed, studentProfiles } from '../lib/foundation-data';
import { createBookingRequestRecord, fetchBookingRequests } from '../lib/supabase-data';
import type { AppUser, BookingRequestRecord, TutorDirectoryEntry } from '../lib/foundation-data';

type BookingDraft = {
  tutorId: string;
  studentId: string;
  requestedSlot: string;
  notes: string;
};

export function useBookings(currentUser: AppUser) {
  const [bookings, setBookings] = useState<BookingRequestRecord[]>(bookingSeed);
  const [isLoading, setIsLoading] = useState(authEnabled());

  useEffect(() => {
    if (!authEnabled()) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetchBookingRequests(currentUser)
      .then((records) => {
        if (isMounted) {
          setBookings(records);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBookings(bookingSeed);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, currentUser.role, currentUser.studentId, currentUser.parentId, currentUser.tutorId]);

  const visibleBookings = bookings.filter((booking) => {
    if (currentUser.role === 'operator') {
      return true;
    }

    if (currentUser.role === 'tutor') {
      return booking.tutorId === (currentUser.tutorId || currentUser.id);
    }

    if (currentUser.role === 'student') {
      return booking.studentId === (currentUser.studentId || currentUser.id);
    }

    return (currentUser.linkedStudentIds || []).includes(booking.studentId);
  });

  async function createBookingRequest(draft: BookingDraft, tutor: TutorDirectoryEntry | undefined) {
    const student = studentProfiles.find((entry) => entry.id === draft.studentId);
    if (!student || !tutor) {
      return;
    }

    if (authEnabled() && (currentUser.parentId || currentUser.studentId || currentUser.tutorId)) {
      try {
        await createBookingRequestRecord(currentUser, draft);
        const records = await fetchBookingRequests(currentUser);
        setBookings(records);
        return;
      } catch {
        // Fall through to local seeded behavior if Supabase is not ready yet.
      }
    }

    const newBooking: BookingRequestRecord = {
      id: `booking-${bookings.length + 1}`,
      tutorId: draft.tutorId,
      tutorName: tutor.displayName,
      studentId: draft.studentId,
      studentName: student.displayName,
      status: 'pending',
      requestedSlot: draft.requestedSlot,
      requestedBy: currentUser.role,
      notes: draft.notes,
    };

    setBookings((currentBookings) => [newBooking, ...currentBookings]);
  }

  return {
    bookings: visibleBookings,
    isLoading,
    createBookingRequest,
  };
}