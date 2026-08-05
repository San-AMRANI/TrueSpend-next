'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './dashboard.module.css';

const fmt = (n) => `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

function MetricCard({ label, value, color = 'green', unit = 'MAD' }) {
  const cls = color === 'red' ? 'neg' : color === 'neutral' ? 'neutral' : color === 'blue' ? 'blue' : color === 'orange' ? 'orange' : '';
  return (
    <div className="metric-card">
      <div className="label">{label}</div>
      <div className={`value ${cls}`}>{unit === 'MAD' ? fmt(value) : value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/kpi-snapshot', { cache: 'no-store' });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setSnapshot(data);
    } catch (fetchError) {
      setError('Unable to load live ledger data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    window.addEventListener('focus', loadSnapshot);
    return () => window.removeEventListener('focus', loadSnapshot);
  }, [loadSnapshot]);

  if (loading) {
    return <div className={styles.loading}>Loading fresh ledger data...</div>;
  }

  if (error) {
    return (
      <div>
        <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '16px'}}>Dashboard</h1>
        <div className="card" style={{padding: 24}}>
          <p style={{margin: 0, color: 'var(--text-dim)'}}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Dashboard</h1>

      <div className="section-header">Liquid Assets</div>
      <div className="grid-3" style={{marginBottom: 24}}>
        <MetricCard label="Bank Balance" value={snapshot.bankBalance} />
        <MetricCard label="Cash on Hand" value={snapshot.cashBalance} />
        <MetricCard label="Total Liquidity" value={snapshot.totalLiquidity} color="blue" />
      </div>

      <div className="grid-2" style={{marginBottom: 24}}>
        <div>
          <div className="section-header">Debts &amp; Net Position</div>
          <div className="grid-2" style={{marginBottom: 12}}>
            <MetricCard label="Receivables" value={snapshot.receivables} />
            <MetricCard label="Payables" value={snapshot.payables} color="red" />
          </div>
          <MetricCard label="Net Position" value={snapshot.netPosition} color={snapshot.netPosition >= 0 ? 'green' : 'red'} />
        </div>
        <div>
          <div className="section-header">Spending Pace</div>
          <div className="grid-2" style={{marginBottom: 12}}>
            <MetricCard label="True Spend" value={snapshot.adjustedTrueSpend} color="orange" />
            <MetricCard label="Days to Payday" value={snapshot.daysUntilPayday} color="neutral" unit="days" />
          </div>
          <MetricCard label="Daily Allowance" value={snapshot.dailyAllowance} color="blue" />
        </div>
      </div>
    </div>
  );
}
