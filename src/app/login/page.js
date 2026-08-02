'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError('Invalid credentials. Please try again.');
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginIcon}>💸</div>
        <h1 className={styles.loginTitle}>TrueSpend</h1>
        <p className={styles.loginSub}>Personal Finance Dashboard</p>

        <form onSubmit={handleLogin} className={styles.loginForm}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>

          <button type="submit" className="btn btn-primary" style={{width:'100%', justifyContent:'center'}} disabled={loading}>
            {loading ? 'Verifying...' : '🔓 Login'}
          </button>
        </form>

        <p className={styles.loginNote}>Session persists for 30 days</p>
      </div>
    </div>
  );
}
