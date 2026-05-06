'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { loadSession, subscribeToAuth } from '../lib/auth';

type CurrentUserState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

export function useCurrentUser(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>({
    user: null,
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    loadSession().then((session) => {
      setState({ user: session?.user ?? null, session: session ?? null, isLoading: false });
    });

    const subscription = subscribeToAuth((session) => {
      setState({ user: session?.user ?? null, session: session ?? null, isLoading: false });
    });

    return () => {
      if (subscription && 'data' in subscription) {
        subscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  return state;
}