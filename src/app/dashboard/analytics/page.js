'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from '../dashboard.module.css';

const RechartsWrapper = dynamic(() => import('./Charts'), { ssr: false });

const fmt = (n) => `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

export default function AnalyticsPage() {
  const [catData, setCatData] = useState([]);
  const [cashflowData, setCashflowData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, cf] = await Promise.all([
      fetch('/api/analytics/categories', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/analytics/cashflow', { cache: 'no-store' }).then(r => r.json()),
    ]);
    setCatData(c);
    setCashflowData(cf);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className={styles.loading}>Loading data...</div>;

  return (
    <div>
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Analytics</h1>
      <RechartsWrapper catData={catData} cashflowData={cashflowData} fmt={fmt} />
    </div>
  );
}
