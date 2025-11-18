import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

export default function VerifyLogin() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your login...');

  useEffect(() => {
    const completeSignIn = async () => {
      try {
        // Check if this is a sign-in link
        if (!isSignInWithEmailLink(auth, window.location.href)) {
          setStatus('error');
          setMessage('Invalid login link. Please try logging in again.');
          return;
        }

        // Get email from localStorage (set by login page)
        let email = window.localStorage.getItem('emailForSignIn');
        
        if (!email) {
          // If email is not in localStorage, prompt user
          email = window.prompt('Please provide your email for confirmation');
        }

        if (!email) {
          setStatus('error');
          setMessage('Email is required to complete login.');
          return;
        }

        // Sign in with email link
        const userCredential = await signInWithEmailLink(auth, email, window.location.href);
        const user = userCredential.user;

        // Get token and set session
        const token = await user.getIdToken();

        // Set session via API
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        // Clear email from localStorage
        window.localStorage.removeItem('emailForSignIn');

        setStatus('success');
        setMessage('Login successful! Redirecting...');

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (error: any) {
        console.error('Error completing sign-in:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to complete login. Please try again.');
      }
    };

    completeSignIn();
  }, [router]);

  return (
    <>
      <Head>
        <title>Verifying Login - LakhDatar Fast Grow Pvt Ltd</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          {status === 'verifying' && (
            <>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e2e8f0',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 20px'
              }} />
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: '#1e293b' }}>
                Verifying Login
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px' }}>{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '32px'
              }}>
                ✓
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: '#10b981' }}>
                Login Successful!
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px' }}>{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#ef4444',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '32px',
                color: 'white'
              }}>
                ✕
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: '#ef4444' }}>
                Verification Failed
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>{message}</p>
              <button
                onClick={() => router.push('/')}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
