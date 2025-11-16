import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
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
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 50%, #ffd700 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Company Logo - Top Left Corner */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 100,
          width: '160px',
          height: '50px'
        }}>
          <Image
            src="/images/lfgpl-logo.png"
            alt="LakhDatar Fast Grow Pvt Ltd"
            fill
            style={{ objectFit: 'contain' }}
            priority
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target) target.style.display = 'none';
            }}
          />
        </div>

        {/* Animated Background Elements */}
        <div className="login-bg-animation" style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 2px, transparent 2px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none'
        }} />
        
        <div className="card" style={{ 
          maxWidth: '480px', 
          width: '100%', 
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: 'none'
        }}>
          {/* Baba Shyam Logo */}
          <div style={{
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'relative',
              width: '200px',
              height: '200px',
              maxWidth: '100%'
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
                      parent.innerHTML = '<div style="font-size: 64px; color: #fff; text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">🕉️</div>';
                    }
                  }
                }}
              />
            </div>
          </div>
          
          <h1 style={{ 
            marginBottom: '32px', 
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 50%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '1px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
            width: '100%'
          }}>
            जय श्री श्याम
          </h1>
          
          <form onSubmit={handleSubmit} style={{ marginTop: '32px' }}>
            {error && (
              <div className="alert alert-error" style={{ animation: 'slideIn 0.3s ease' }}>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
                autoComplete="username"
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
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <p style={{ 
            marginTop: '24px', 
            textAlign: 'center', 
            color: '#64748b', 
            fontSize: '13px',
            opacity: 0.8
          }}>
            Default credentials: <strong style={{ color: '#6366f1' }}>admin</strong> / <strong style={{ color: '#6366f1' }}>admin123</strong>
          </p>
        </div>
      </div>
    </>
  );
}

