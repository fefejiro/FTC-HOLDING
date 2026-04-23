import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authEnabled, loadSession, logout, sendMagicLink, subscribeToAuth } from '../lib/auth';
import { appUsers, defaultDemoRole, parentProfiles, studentProfiles, type AppRole, type AppUser } from '../lib/foundation-data';
import { fetchProfileBundle } from '../lib/supabase-data';
import type { ParentProfile, StudentProfile } from '../types/domain';

const DEMO_ROLE_STORAGE_KEY = 'anion-demo-role';

function getStoredDemoRole(): AppRole {
  if (typeof window === 'undefined') {
    return defaultDemoRole;
  }

  const storedRole = window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
  return (storedRole as AppRole) || defaultDemoRole;
}

function inferRoleFromSession(session: Session | null): AppRole {
  const sessionRole = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role;
  if (sessionRole === 'student' || sessionRole === 'parent' || sessionRole === 'tutor' || sessionRole === 'operator') {
    return sessionRole;
  }

  return defaultDemoRole;
}

function buildUserFromSession(session: Session, role: AppRole): AppUser {
  const seedUser = appUsers[role];
  return {
    ...seedUser,
    id: session.user.id,
    email: session.user.email || seedUser.email,
    displayName:
      (session.user.user_metadata?.display_name as string | undefined) ||
      (session.user.user_metadata?.full_name as string | undefined) ||
      seedUser.displayName,
    role,
  };
}

export function useCurrentUser() {
  const [activeRole, setActiveRoleState] = useState<AppRole>(getStoredDemoRole);
  const [session, setSession] = useState<Session | null>(null);
  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [profileRoles, setProfileRoles] = useState<AppRole[] | null>(null);
  const [profileStudents, setProfileStudents] = useState<StudentProfile[] | null>(null);
  const [profileParent, setProfileParent] = useState<ParentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(authEnabled());
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    if (!authEnabled()) {
      return;
    }

    let isMounted = true;

    loadSession()
      .then((currentSession) => {
        if (!isMounted) {
          return;
        }

        setSession(currentSession);
        if (currentSession) {
          setActiveRoleState(inferRoleFromSession(currentSession));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const subscription = subscribeToAuth((nextSession) => {
      setSession(nextSession);
      setProfileUser(null);
      setProfileRoles(null);
      setProfileStudents(null);
      setProfileParent(null);
      if (nextSession) {
        setActiveRoleState(inferRoleFromSession(nextSession));
      }
    });

    return () => {
      isMounted = false;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !authEnabled()) {
      return;
    }

    let isMounted = true;

    fetchProfileBundle(session.user.id)
      .then((bundle) => {
        if (!isMounted || !bundle) {
          return;
        }

        setProfileUser({
          ...bundle.user,
          email: session.user.email || bundle.user.email,
          role: bundle.availableRoles.includes(activeRole) ? activeRole : bundle.user.role,
        });
        setProfileRoles(bundle.availableRoles);
        setProfileStudents(bundle.students);
        setProfileParent(bundle.parentProfile);
        if (!bundle.availableRoles.includes(activeRole)) {
          setActiveRoleState(bundle.user.role);
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAuthMessage('Supabase session is active, but profile records are still missing. Demo fallback remains available.');
      });

    return () => {
      isMounted = false;
    };
  }, [session, activeRole]);

  function setActiveRole(role: AppRole) {
    setActiveRoleState(role);
    if (typeof window !== 'undefined' && !session) {
      window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
    }
  }

  const sessionUser = session ? buildUserFromSession(session, activeRole) : null;
  const fallbackUser = appUsers[activeRole];
  const user = profileUser || sessionUser || fallbackUser;
  const parentProfile = profileParent || parentProfiles.find((profile) => profile.id === user.parentId || profile.id === user.id) || null;
  const sourceStudents = profileStudents || studentProfiles;
  const visibleStudents =
    activeRole === 'parent' && parentProfile
      ? sourceStudents.filter((student) => parentProfile.linkedStudentIds.includes(student.id))
      : activeRole === 'student'
        ? sourceStudents.filter((student) => student.id === (user.studentId || user.id))
        : sourceStudents;

  async function requestMagicLink() {
    await sendMagicLink(authEmail);
    setAuthMessage(`Magic link sent to ${authEmail}. Open the email and come back here.`);
  }

  async function signOutCurrentUser() {
    await logout();
    setSession(null);
    setProfileUser(null);
    setProfileRoles(null);
    setProfileStudents(null);
    setProfileParent(null);
    setActiveRoleState(getStoredDemoRole());
    setAuthMessage('Signed out. Demo mode is active until Supabase session resumes.');
  }

  return {
    user,
    session,
    authEnabled: authEnabled(),
    authEmail,
    setAuthEmail,
    authMessage,
    requestMagicLink,
    signOutCurrentUser,
    activeRole,
    setActiveRole,
    availableRoles: profileRoles || (Object.keys(appUsers) as AppRole[]),
    parentProfile,
    students: visibleStudents,
    isLoading,
  };
}