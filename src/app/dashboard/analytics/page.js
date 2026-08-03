'use client';
import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import styles from '../dashboard.module.css';
import { useDataRefresh } from '@/lib/dataRefresh';

const COLORS = ['#6366f1','#22c55e','#f97316','#3b82f6','#a855f7','#eab308','#ef4444','#14b8a6','#f43f5e','#8b5cf6'];
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

  useDataRefresh(fetchAll);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className={styles.loading}>Loading data...</div>;

  return (
    <div>
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Analytics</h1>
      
      <div className="grid-2">
        <div className="card">
          <h3 style={{marginBottom: 16, fontSize: '1rem', fontWeight: 700}}>True Spend by Category</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={catData} dataKey="trueSpend" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={55}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e22', border: '1px solid #2e2e35', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{color:'var(--text-dim)', textAlign:'center', padding: 40}}>No expense data</p>}
          <div style={{display:'flex', flexWrap:'wrap', gap: 8, marginTop: 12}}>
            {catData.map((d, i) => (
              <span key={d.category} style={{fontSize:'0.75rem', display:'flex', alignItems:'center', gap:4}}>
                <span style={{display:'inline-block', width:10, height:10, borderRadius:'50%', background: COLORS[i % COLORS.length]}}></span>
                {d.category} ({fmt(d.trueSpend)})
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{marginBottom: 16, fontSize: '1rem', fontWeight: 700}}>Daily Cashflow</h3>
          {cashflowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e35" />
                <XAxis dataKey="date" stroke="#555566" tick={{fontSize:11}} />
                <YAxis stroke="#555566" tick={{fontSize:11}} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e1e22', border: '1px solid #2e2e35', borderRadius: 8 }} />
                <Legend wrapperStyle={{fontSize:'0.8rem'}} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" name="Gross Expense" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="trueSpend" name="True Spend" stroke="#f97316" strokeWidth={2} dot={{r:3}} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{color:'var(--text-dim)', textAlign:'center', padding: 40}}>No cashflow data</p>}
        </div>
      </div>
    </div>
  );
}
