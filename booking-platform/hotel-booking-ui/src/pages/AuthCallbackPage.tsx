import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handleCallbackHash } from '../auth/cognito';
import { useAuth } from '../auth/useAuth';

export function AuthCallbackPage() {
  const { completeSignIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false); // StrictMode runs effects twice in dev; state is single-use.

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    try {
      const { session, returnTo } = handleCallbackHash(window.location.hash);
      completeSignIn(session);
      navigate(returnTo, { replace: true }); // also strips tokens from the URL
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed.');
    }
  }, [completeSignIn, navigate]);

  if (error) {
    return (
      <section>
        <h1>Sign in failed</h1>
        <p className="error">{error}</p>
        <Link to="/">Back home</Link>
      </section>
    );
  }
  return <p className="status">Signing you in…</p>;
}
