import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './authContext';
import { buildLoginUrl, buildLogoutUrl, clearSession, loadSession } from './cognito';
import type { AuthSession } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());

  const signIn = useCallback((returnTo = '/') => {
    window.location.assign(buildLoginUrl(returnTo));
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
    window.location.assign(buildLogoutUrl());
  }, []);

  // Implicit grant has no refresh token: drop the session when it expires.
  useEffect(() => {
    if (!session) return;
    const msLeft = session.tokens.expiresAt - Date.now();
    const timer = window.setTimeout(() => {
      clearSession();
      setSession(null);
    }, Math.max(msLeft, 0));
    return () => window.clearTimeout(timer);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: session !== null,
      signIn,
      signOut,
      completeSignIn: setSession,
    }),
    [session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
