import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { auth } from '@/lib/firebase';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  UserCredential
} from 'firebase/auth';

export default function VerifyLink() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    setIsValidLink(isSignInWithEmailLink(auth, currentUrl));

    const queryEmail = typeof router.query.email === 'string' ? router.query.email : '';
    if (queryEmail) {
      try {
        setEmail(decodeURIComponent(queryEmail));
      } catch {
        setEmail(queryEmail);
      }
    }
  }, [router.query]);

  const completeLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Email is required to complete login.');
      return;
    }

    if (typeof window === 'undefined') {
      setError('This action must be completed in a browser.');
      return;
    }

    try {
      setProcessing(true);
      const credential: UserCredential = await signInWithEmailLink(
        auth,
        email,
        window.location.href
      );

      const token = await credential.user.getIdToken();

      const response = await fetch('/api/auth/complete-link-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save session.');
      }

      setMessage('Login confirmed. Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error completing link login:', err);
      setError(
        err?.message || 'Unable to complete login. Please try again or request a new link.'
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Head>
        <title>Verify Secure Login - LakhDatar Fast Grow Pvt Ltd</title>
      </Head>
      <div className="container" style={{ maxWidth: '520px', padding: '60px 20px' }}>
        <div className="card" style={{ padding: '32px', borderRadius: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>
            Complete Secure Login
          </h1>
          <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>
            {isValidLink
              ? 'Enter your email to confirm this secure login request.'
              : 'This link is invalid or expired.'}
          </p>

          {isValidLink && (
            <form onSubmit={completeLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5f5'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={processing}
                style={{ marginTop: '8px' }}
              >
                {processing ? 'Completing...' : 'Confirm Login'}
              </button>
            </form>
          )}

          {error && (
            <p style={{ color: '#dc2626', marginTop: '20px', fontSize: '14px' }}>
              {error}
            </p>
          )}
          {message && (
            <p style={{ color: '#16a34a', marginTop: '20px', fontSize: '14px' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

