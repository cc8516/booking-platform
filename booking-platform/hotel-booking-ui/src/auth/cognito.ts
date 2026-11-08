import { cognitoConfig } from '../config/env';
import type { AuthSession, AuthUser } from './types';

const STATE_KEY = 'oauth_state';
const NONCE_KEY = 'oauth_nonce';
const SESSION_KEY = 'auth_session';
const RETURN_TO_KEY = 'auth_return_to';

function randomString(bytes = 16): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Builds the Hosted UI login URL (implicit grant => response_type=token). */
export function buildLoginUrl(returnTo = '/'): string {
  const state = randomString();
  const nonce = randomString();
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(NONCE_KEY, nonce);
  sessionStorage.setItem(RETURN_TO_KEY, returnTo);

  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    response_type: 'token',
    scope: cognitoConfig.scopes,
    redirect_uri: cognitoConfig.redirectUri,
    state,
    nonce,
  });
  return `${cognitoConfig.domain}/login?${params.toString()}`;
}

export function buildLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    logout_uri: cognitoConfig.logoutUri,
  });
  return `${cognitoConfig.domain}/logout?${params.toString()}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) throw new Error('Malformed token');
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
  return JSON.parse(json) as Record<string, unknown>;
}

function toUser(idTokenClaims: Record<string, unknown>): AuthUser {
  const groups = idTokenClaims['cognito:groups'];
  return {
    sub: String(idTokenClaims.sub),
    email: typeof idTokenClaims.email === 'string' ? idTokenClaims.email : undefined,
    name: typeof idTokenClaims.name === 'string' ? idTokenClaims.name : undefined,
    username:
      typeof idTokenClaims['cognito:username'] === 'string'
        ? idTokenClaims['cognito:username']
        : undefined,
    groups: Array.isArray(groups) ? groups.map(String) : [],
  };
}

export interface CallbackResult {
  session: AuthSession;
  returnTo: string;
}

/**
 * Parses the URL fragment Cognito redirects back with, validates `state` and
 * the id token `nonce`, and returns the session. Throws on any failure.
 */
export function handleCallbackHash(hash: string): CallbackResult {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  const error = params.get('error');
  if (error) throw new Error(params.get('error_description') ?? error);

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const expectedNonce = sessionStorage.getItem(NONCE_KEY);
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? '/';
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(NONCE_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);

  if (!expectedState || params.get('state') !== expectedState) {
    throw new Error('Invalid login state. Please try signing in again.');
  }

  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');
  const expiresIn = Number(params.get('expires_in'));
  if (!idToken || !accessToken || !Number.isFinite(expiresIn)) {
    throw new Error('Login response was missing tokens.');
  }

  const claims = decodeJwtPayload(idToken);
  if (claims.nonce !== expectedNonce) throw new Error('Invalid nonce in id token.');
  if (claims.aud !== cognitoConfig.clientId) throw new Error('Token audience mismatch.');

  const session: AuthSession = {
    tokens: { idToken, accessToken, expiresAt: Date.now() + expiresIn * 1000 },
    user: toUser(claims),
  };
  saveSession(session);
  return { session, returnTo };
}

// sessionStorage keeps tokens out of long-lived storage; they clear with the tab.
function saveSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.tokens.expiresAt <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
