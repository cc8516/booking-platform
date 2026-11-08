export interface AuthTokens {
  idToken: string;
  accessToken: string;
  /** Epoch milliseconds when the tokens expire. */
  expiresAt: number;
}

export interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
  username?: string;
  groups: string[];
}

export interface AuthSession {
  tokens: AuthTokens;
  user: AuthUser;
}
