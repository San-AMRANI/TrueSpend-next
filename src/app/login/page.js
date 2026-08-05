'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    const data = await res.json();

    if (data.success) {
      document.cookie = `token=${data.token}; path=/; max-age=604800`; // 7 days
      router.push('/dashboard');
    } else {
      setError(data.message || 'Invalid credentials. Please try again.');
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
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>

          <button type="submit" className="btn btn-primary" style={{width:'100%', justifyContent:'center'}} disabled={loading}>
            {loading ? 'Verifying...' : '🔓 Login'}
          </button>
        </form>

        <p className={styles.loginNote}>Session persists for 7 days</p>
      </div>
    </div>
  );
}
