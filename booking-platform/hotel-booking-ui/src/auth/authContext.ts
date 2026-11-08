import { createContext } from 'react';
import type { AuthSession } from './types';

export interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isHotelManager: boolean;
  signIn: (returnTo?: string) => void;
  signOut: () => void;
  completeSignIn: (session: AuthSession) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
