import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [loginLinkMessage, setLoginLinkMessage] = useState('');

  // No auto-login check - user must login every time website opens

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setEmailNotVerified(false);
    setEmailVerificationSent(false);
    setLoginLinkMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.linkSent) {
        setLoginLinkMessage(data.message || 'Secure login link sent. Please check your inbox to finish signing in.');
      } else if (res.ok && data.authenticated) {
        router.push('/dashboard');
      } else {
        if (data.emailVerified === false) {
          setEmailNotVerified(true);
          setEmailVerificationSent(data.resendEmail || false);
          setError(data.message || 'Please verify your email address before logging in.');
        } else {
          setError(data.error || 'Login failed');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        setEmailVerificationSent(true);
        setError('');
        alert(data.message || 'Account created successfully! Please check your email to verify your account.');
        setStep('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Password reset email sent. Please check your inbox.');
        setShowForgotPassword(false);
        setStep('login');
        setError('');
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setEmailVerificationSent(true);
        alert(data.message || 'Verification email sent. Please check your inbox.');
      } else {
        setError(data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - LakhDatar Fast Grow Pvt Ltd</title>
      </Head>
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8c42 25%, #ffa500 50%, #ffcc00 75%, #ffd700 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Background Patterns */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        {/* Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          fontSize: '80px',
          opacity: 0.1,
          animation: 'float 6s ease-in-out infinite'
        }}>🕉️</div>
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          fontSize: '80px',
          opacity: 0.1,
          animation: 'float 8s ease-in-out infinite'
        }}>🏹</div>
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '10%',
          fontSize: '60px',
          opacity: 0.08,
          animation: 'float 7s ease-in-out infinite'
        }}>🙏</div>
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          fontSize: '60px',
          opacity: 0.08,
          animation: 'float 9s ease-in-out infinite'
        }}>💰</div>

        {/* Company Logo - Top Left Corner */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 100,
          width: '180px',
          height: '60px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <Image
            src="/images/lfgpl-logo.png"
            alt="LakhDatar Fast Grow Pvt Ltd"
            fill
            style={{ objectFit: 'contain', padding: '8px' }}
            priority
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target) target.style.display = 'none';
            }}
          />
        </div>

        {/* Animated Background Dots */}
        <div className="login-bg-animation" style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 2px, transparent 2px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none'
        }} />
        
        <div className="card" style={{ 
          maxWidth: '500px', 
          width: '100%', 
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
          backdropFilter: 'blur(20px)'
        }}>
          {/* Decorative Top Border */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #ff6b6b 0%, #ffa500 50%, #ffd700 100%)',
            borderRadius: '12px 12px 0 0'
          }} />
          
          {/* Baba Shyam Logo with Ring */}
          <div style={{
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div className="shyam-icon-ring" style={{
              position: 'absolute',
              width: '220px',
              height: '220px',
              border: '3px solid',
              borderColor: '#ffd700 #ffa500 #ff6b6b #ffd700',
              borderRadius: '50%',
              animation: 'spin 20s linear infinite'
            }} />
            
            <div style={{
              position: 'relative',
              width: '180px',
              height: '180px',
              maxWidth: '100%',
              filter: 'drop-shadow(0 8px 24px rgba(255, 165, 0, 0.4))'
            }}>
              <Image
                src="/images/shyam-baba-logo.png"
                alt="Shyam Baba"
                fill
                style={{ objectFit: 'contain' }}
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target) {
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div style="font-size: 80px; animation: pulse 2s ease-in-out infinite;">🕉️</div>';
                    }
                  }
                }}
              />
            </div>
          </div>
          
          {/* Jai Shree Shyam Text */}
          <div style={{
            position: 'relative',
            marginBottom: '32px',
            padding: '16px 0'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '100px',
              opacity: 0.03,
              pointerEvents: 'none'
            }}>🙏</div>
            
            <h1 style={{ 
              margin: 0,
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8c42 25%, #ffa500 50%, #ffcc00 75%, #ffd700 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '42px',
              fontWeight: 900,
              letterSpacing: '2px',
              textAlign: 'center',
              width: '100%',
              position: 'relative',
              textShadow: '0 0 30px rgba(255, 165, 0, 0.5)',
              animation: 'pulse 3s ease-in-out infinite'
            }}>
              जय श्री श्याम
            </h1>
            
            <div style={{
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              fontSize: '24px',
              opacity: 0.6
            }}>
              <span>🙏</span>
              <span>🏹</span>
              <span>🕉️</span>
            </div>
          </div>

          {/* Email Verification Notice */}
          {emailVerificationSent && (
            <div className="alert" style={{ 
              background: '#dbeafe', 
              color: '#1e40af', 
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              margin: '0 20px 16px 20px',
              border: '1px solid #93c5fd'
            }}>
              ✓ Verification email sent! Please check your inbox and click the verification link.
            </div>
          )}

          {/* Email Not Verified Notice */}
          {emailNotVerified && (
            <div className="alert" style={{ 
              background: '#fef3c7', 
              color: '#92400e', 
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              margin: '0 20px 16px 20px',
              border: '1px solid #fcd34d'
            }}>
              ⚠️ Email not verified. Please check your inbox and click the verification link.
              {!emailVerificationSent && (
                <button
                  onClick={handleResendVerification}
                  style={{
                    display: 'block',
                    marginTop: '8px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                  disabled={loading}
                >
                  Resend Verification Email
                </button>
              )}
            </div>
          )}

          {/* Login Form */}
          {step === 'login' && !showForgotPassword && (
            <form onSubmit={handleLogin} style={{ marginTop: '32px' }}>
              {loginLinkMessage && (
                <div className="alert" style={{ 
                  background: '#ecfdf5',
                  color: '#065f46',
                  marginBottom: '16px',
                  margin: '0 20px 16px 20px',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid #6ee7b7',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                  {loginLinkMessage}
                </div>
              )}
              {error && (
                <div className="alert alert-error" style={{ animation: 'slideIn 0.3s ease', marginBottom: '16px', margin: '0 20px 16px 20px' }}>
                  {error}
                </div>
              )}
              
              <div className="form-group" style={{ margin: '0 20px' }}>
                <label>Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  autoComplete="email"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div className="form-group" style={{ margin: '16px 20px' }}>
                <label>Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div style={{ margin: '0 20px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    marginTop: '8px',
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: 700
                  }}
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '16px 20px 0 20px', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('register');
                    setError('');
                    setEmailVerificationSent(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#10b981',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {step === 'register' && (
            <form onSubmit={handleRegister} style={{ marginTop: '32px' }}>
              {error && (
                <div className="alert alert-error" style={{ animation: 'slideIn 0.3s ease', marginBottom: '16px', margin: '0 20px 16px 20px' }}>
                  {error}
                </div>
              )}
              
              <div className="form-group" style={{ margin: '0 20px' }}>
                <label>Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  autoComplete="email"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div className="form-group" style={{ margin: '16px 20px' }}>
                <label>Password * (Min 6 characters)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password (min 6 characters)"
                  autoComplete="new-password"
                  style={{ fontSize: '16px' }}
                  minLength={6}
                />
              </div>

              <div className="form-group" style={{ margin: '16px 20px' }}>
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  style={{ fontSize: '16px' }}
                  minLength={6}
                />
              </div>

              <div style={{ margin: '0 20px' }}>
                <button 
                  type="submit" 
                  className="btn btn-success" 
                  style={{ 
                    width: '100%', 
                    marginTop: '8px',
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  }}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setError('');
                  setEmailVerificationSent(false);
                  setPassword('');
                  setConfirmPassword('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginTop: '16px',
                  marginBottom: '8px'
                }}
              >
                ← Back to Login
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {showForgotPassword && (
            <form onSubmit={handleForgotPassword} style={{ marginTop: '32px' }}>
              {error && (
                <div className="alert alert-error" style={{ animation: 'slideIn 0.3s ease', marginBottom: '16px', margin: '0 20px 16px 20px' }}>
                  {error}
                </div>
              )}
              
              <div className="form-group" style={{ margin: '0 20px' }}>
                <label>Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  autoComplete="email"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div style={{ margin: '0 20px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    marginTop: '8px',
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: 700
                  }}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Password Reset Link'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginTop: '16px',
                  marginBottom: '8px'
                }}
              >
                ← Back to Login
              </button>
            </form>
          )}

          <p style={{ 
            marginTop: '24px', 
            textAlign: 'center', 
            color: '#64748b', 
            fontSize: '13px',
            opacity: 0.8,
            marginBottom: '20px'
          }}>
            Secure login with email verification
          </p>
        </div>
      </div>
    </>
  );
}
