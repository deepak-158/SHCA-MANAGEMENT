'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FiMail, FiLock, FiLogIn, FiShield, FiUsers, FiBookOpen, FiUser } from 'react-icons/fi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const { login, user, getDashboardPath, changePassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      router.push(getDashboardPath(user.role));
    }
  }, [user, router, getDashboardPath]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.mustChangePassword) {
          setShowPasswordChange(true);
        } else {
          router.push(getDashboardPath(result.user.role));
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const result = await changePassword(newPassword);
      if (result.success) {
        setShowPasswordChange(false);
        router.push(getDashboardPath(user.role));
      } else {
        setPasswordError(result.error || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordError('Something went wrong. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Background decoration */}
      <div style={styles.bgDecor1} />
      <div style={styles.bgDecor2} />

      <div style={styles.container}>
        {/* Left panel - branding */}
        <div style={styles.brandPanel}>
          <div style={styles.brandContent}>
            <div style={styles.logoIcon}>🎓</div>
            <h1 style={styles.brandTitle}>School Management System</h1>
            <p style={styles.brandSubtitle}>
              A complete platform for managing academics, attendance, examinations, and school administration efficiently.
            </p>
            <div style={styles.featureList}>
              {['Academic Tracking', 'Attendance Management', 'Exam & Results', 'Timetable Management'].map((f) => (
                <div key={f} style={styles.featureItem}>
                  <span style={styles.featureCheck}>✓</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - login form */}
        <div style={styles.formPanel}>
          <div style={styles.formContainer}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>Welcome Back</h2>
              <p style={styles.formSubtitle}>Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleLogin} style={styles.form}>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div style={styles.inputWrapper}>
                  <FiMail style={styles.inputIcon} />
                  <input
                    className="input"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div style={styles.inputWrapper}>
                  <FiLock style={styles.inputIcon} />
                  <input
                    className="input"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                ) : (
                  <>
                    <FiLogIn /> Sign In
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Change Your Password</h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>You must set a new password before continuing.</p>
            </div>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <div style={styles.inputWrapper}>
                  <FiLock style={styles.inputIcon} />
                  <input className="input" type="password" placeholder="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} style={{ paddingLeft: '2.5rem' }} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <div style={styles.inputWrapper}>
                  <FiLock style={styles.inputIcon} />
                  <input className="input" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} style={{ paddingLeft: '2.5rem' }} />
                </div>
              </div>
              {passwordError && (
                <div style={styles.errorBox}>
                  <span>⚠️</span> {passwordError}
                </div>
              )}
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={changingPassword}>
                {changingPassword ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Set New Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #f0fdfa 100%)',
    position: 'relative',
    overflow: 'hidden',
    padding: '1rem',
  },
  bgDecor1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)',
    top: '-100px',
    right: '-100px',
  },
  bgDecor2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)',
    bottom: '-80px',
    left: '-80px',
  },
  container: {
    display: 'flex',
    width: '100%',
    maxWidth: '960px',
    minHeight: '600px',
    background: '#fff',
    borderRadius: '1.25rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  brandPanel: {
    flex: '1 1 45%',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
    padding: '3rem 2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  brandContent: {
    position: 'relative',
    zIndex: 1,
    color: '#fff',
  },
  logoIcon: {
    fontSize: '3rem',
    marginBottom: '1.5rem',
  },
  brandTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: '1rem',
  },
  brandSubtitle: {
    fontSize: '0.9375rem',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    marginBottom: '2rem',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.8)',
  },
  featureCheck: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(16,185,129,0.3)',
    color: '#6ee7b7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6875rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  formPanel: {
    flex: '1 1 55%',
    padding: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: '380px',
  },
  formHeader: {
    marginBottom: '2rem',
  },
  formTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.375rem',
  },
  formSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    fontSize: '1rem',
    zIndex: 1,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 0.875rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.5rem',
    fontSize: '0.8125rem',
    color: '#dc2626',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '1.75rem 0 1.25rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e2e8f0',
  },
  dividerText: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  demoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.625rem',
  },
  demoCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.875rem 0.5rem',
    borderRadius: '0.75rem',
    border: '1.5px solid',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  demoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
  },
  demoLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  demoDesc: {
    fontSize: '0.625rem',
    color: '#94a3b8',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalBox: {
    background: '#fff',
    borderRadius: '1rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
};
