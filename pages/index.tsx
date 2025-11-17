import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'login' | 'otp' | 'forgot'>('login');
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotStage, setForgotStage] = useState<'request' | 'verify'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // Check if already logged in
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          router.push('/dashboard');
        }
      });
  }, [router]);

  const resetMessages = () => {
    setError('');
    setInfoMessage('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        setStep('otp');
        setInfoMessage('OTP sent to your email. Please enter it below.');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      await res.json();
      if (res.ok) {
        setInfoMessage('OTP sent to your email. Enter it with a new password.');
        setForgotStage('verify');
      } else {
        setError('Unable to send OTP. Please try again.');
      }
    } catch (error) {
      setError('Failed to send reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setInfoMessage('Password updated successfully. Please login.');
        setStep('login');
        setForgotStage('request');
        setPassword('');
        setForgotOtp('');
        setNewPassword('');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('Failed to reset password.');
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
          
          {/* Jai Shree Shyam Text with Enhanced Styling */}
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
          
          <div style={{ marginTop: '32px' }}>
            {infoMessage && (
              <div className="alert alert-success" style={{ animation: 'slideIn 0.3s ease' }}>
                {infoMessage}
              </div>
            )}
            {error && (
              <div className="alert alert-error" style={{ animation: 'slideIn 0.3s ease' }}>
                {error}
              </div>
            )}

            {step === 'login' && (
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your admin email"
                    autoComplete="email"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
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
                  {loading ? (
                    <>
                      <span className="spinner" style={{ marginRight: '8px' }} />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotStage('request');
                    setStep('forgot');
                    resetMessages();
                  }}
                >
                  Forgot Password?
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleOtpSubmit}>
                <div className="form-group">
                  <label>Enter OTP sent to {email}</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    placeholder="Enter 6-digit OTP"
                    style={{ fontSize: '16px', letterSpacing: '4px', textAlign: 'center' }}
                    maxLength={6}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '8px', padding: '14px', fontSize: '16px', fontWeight: 700 }}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={() => {
                    setStep('login');
                    setOtp('');
                    resetMessages();
                  }}
                >
                  ← Back to Login
                </button>
              </form>
            )}

            {step === 'forgot' && (
              <>
                {forgotStage === 'request' && (
                  <form onSubmit={handleForgotRequest}>
                    <div className="form-group">
                      <label>Registered Email</label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        placeholder="Enter your admin email"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700 }}
                      disabled={loading}
                    >
                      {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: '100%', marginTop: '12px' }}
                      onClick={() => {
                        setStep('login');
                        resetMessages();
                      }}
                    >
                      ← Back to Login
                    </button>
                  </form>
                )}

                {forgotStage === 'verify' && (
                  <form onSubmit={handleResetPassword}>
                    <div className="form-group">
                      <label>OTP sent to {forgotEmail}</label>
                      <input
                        type="text"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        required
                        placeholder="Enter OTP"
                        style={{ fontSize: '16px', letterSpacing: '4px', textAlign: 'center' }}
                        maxLength={6}
                      />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Enter new password"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700 }}
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Reset Password'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: '100%', marginTop: '12px' }}
                      onClick={() => {
                        setStep('login');
                        setForgotStage('request');
                        resetMessages();
                      }}
                    >
                      ← Back to Login
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          <p
            style={{
              marginTop: '24px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '13px',
              opacity: 0.8
            }}
          >
            Default admin email: <strong style={{ color: '#6366f1' }}>admin@example.com</strong>
          </p>
        </div>
      </div>
    </>
  );
}

