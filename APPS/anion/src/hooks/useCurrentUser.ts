'use client';

import { useEffect, useState } from 'react';
import { loadSession, subscribeToAuth } from '../lib/auth';
import type { AuthSession, AuthUser } from '../lib/auth';

type CurrentUserState = {
  user: AuthUser | null;
  session: AuthSession | null;
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