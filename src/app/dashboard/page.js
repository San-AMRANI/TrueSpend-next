'use client';

import { useState, useEffect } from 'react';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKpis() {
      try {
        const res = await fetch('/api/kpis');
        const data = await res.json();
        setKpis(data);
      } catch (err) {
        console.error('Error fetching KPIs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKpis();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!kpis) {
    return <div>Error loading KPIs. Please try again later.</div>;
  }

  return (
    <div>
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Dashboard</h1>
      
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>${kpis.bankBalance.toFixed(2)}</div>
          <div className={styles.kpiLabel}>Bank Balance</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>${kpis.cashBalance.toFixed(2)}</div>
          <div className={styles.kpiLabel}>Cash Balance</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>${kpis.totalLiquidity.toFixed(2)}</div>
          <div className={styles.kpiLabel}>Total Liquidity</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>${kpis.netBalance.toFixed(2)}</div>
          <div className={styles.kpiLabel}>Net Balance</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{kpis.daysUntilPayday}</div>
          <div className={styles.kpiLabel}>Days Until Payday</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>${kpis.dailyAllowance.toFixed(2)}</div>
          <div className={styles.kpiLabel}>Daily Allowance</div>
        </div>
      </div>
    </div>
  );
}
