import { useEffect, useState } from 'react';
import { authEnabled } from '../lib/auth';
import { fetchTutorDirectoryEntries } from '../lib/supabase-data';
import { tutorDirectorySeed, type TutorDirectoryEntry } from '../lib/foundation-data';

export function useTutorDirectory(searchTerm: string) {
  const [sourceTutors, setSourceTutors] = useState<TutorDirectoryEntry[]>(tutorDirectorySeed);
  const [isLoading, setIsLoading] = useState(authEnabled());

  useEffect(() => {
    if (!authEnabled()) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetchTutorDirectoryEntries()
      .then((entries) => {
        if (isMounted) {
          setSourceTutors(entries);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSourceTutors(tutorDirectorySeed);
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
  }, []);

  const normalizedTerm = searchTerm.trim().toLowerCase();
  const tutors = sourceTutors.filter((tutor) => {
    if (!normalizedTerm) {
      return true;
    }

    const haystack = [tutor.displayName, tutor.headline, tutor.audience, ...tutor.subjects]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedTerm);
  });

  return {
    tutors,
    isLoading,
  };
}