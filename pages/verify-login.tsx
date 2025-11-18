import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

export default function VerifyLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkValid, setLinkValid] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    const valid = isSignInWithEmailLink(auth, currentUrl);
    setLinkValid(valid);

    if (!valid) {
      setError('This login link is invalid or has expired.');
      return;
    }

    const queryEmail = router.query.email;
    if (typeof queryEmail === 'string') {
      setEmail(queryEmail);
    }
  }, [router.query]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkValid) return;
    if (!email) {
      setError('Please enter the email address used for login.');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('Verifying your login link...');

    try {
      const userCredential = await signInWithEmailLink(auth, email, window.location.href);
      const token = await userCredential.user.getIdToken();

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkToken: token })
      });

      const data = await res.json();

      if (res.ok && data.authenticated) {
        setStatus('Login confirmed! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 1200);
      } else {
        setError(data.error || 'Failed to complete login.');
        setStatus('');
      }
    } catch (err: any) {
      console.error('Error verifying login link:', err);
      setError(err.message || 'Unable to verify this login link.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Verify Login - LakhDatar Fast Grow Pvt Ltd</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
        padding: '20px'
      }}>
        <div className="card" style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>Verify Your Login</h1>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            We sent a secure login link to your email. Please confirm below to finish signing in.
          </p>

          {!linkValid && (
            <div className="alert alert-error" style={{ marginBottom: '24px' }}>
              {error || 'Invalid login link.'}
            </div>
          )}

          {linkValid && (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              {status && (
                <div className="alert" style={{ background: '#ecfdf5', color: '#065f46' }}>
                  {status}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Verifying...' : 'Complete Login'}
              </button>
            </form>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: '20px' }}
            onClick={() => router.push('/')}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </>
  );
}

