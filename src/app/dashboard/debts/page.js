'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from '../dashboard.module.css';

const fmt = (n) => `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

export default function DebtsPage() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [debtForm, setDebtForm] = useState({ contact_name: '', type: 'Receivable', amount: '' });
  const [settleForm, setSettleForm] = useState({});

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    const d = await fetch('/api/debts').then(r => r.json());
    setDebts(d);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  async function addDebt(e) {
    e.preventDefault();
    await fetch('/api/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact_name: debtForm.contact_name, type: debtForm.type, amount: parseFloat(debtForm.amount) }) });
    setDebtForm({ contact_name: '', type: 'Receivable', amount: '' });
    showMsg('✅ Debt recorded!');
    fetchDebts();
  }

  async function settleDebt(debt_id, remaining_balance) {
    const sf = settleForm[debt_id] || {};
    const wallet = sf.wallet || 'Bank';
    const amount_paid = sf.amount !== undefined ? parseFloat(sf.amount) : null;
    await fetch('/api/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ debt_id, wallet, amount_paid }) });
    showMsg('✅ Debt settled!');
    fetchDebts();
  }

  if (loading) return <div className={styles.loading}>Loading data...</div>;

  const activeDebts = debts.filter(d => d.status === 'Pending');
  const clearedDebts = debts.filter(d => d.status === 'Cleared');

  return (
    <div>
      {msg && <div className={styles.toast}>{msg}</div>}
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Debts</h1>

      <div className="grid-2" style={{alignItems:'flex-start'}}>
        <div>
          <div className="section-header">Add Manual Debt</div>
          <div className="card" style={{marginBottom: 24}}>
            <form onSubmit={addDebt}>
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input className="form-input" type="text" value={debtForm.contact_name} onChange={e => setDebtForm(f=>({...f,contact_name:e.target.value}))} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={debtForm.type} onChange={e => setDebtForm(f=>({...f,type:e.target.value}))}>
                    <option>Receivable</option><option>Payable</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (MAD)</label>
                  <input className="form-input" type="number" min="0.01" step="0.01" value={debtForm.amount} onChange={e => setDebtForm(f=>({...f,amount:e.target.value}))} required />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{width:'100%', justifyContent:'center'}}>➕ Add Debt</button>
            </form>
          </div>

          {clearedDebts.length > 0 && (
            <>
              <div className="section-header">Cleared Debts</div>
              {clearedDebts.map(d => (
                <div key={d.id} className="tx-card" style={{borderLeftColor: 'var(--text-dim)'}}>
                  <div className="tx-top">
                    <div>
                      <div className="tx-title" style={{color:'var(--text-dim)'}}>{d.contact_name}</div>
                      <div className="tx-meta">{d.type} • Cleared</div>
                    </div>
                    <span className="badge badge-green">✓ {fmt(d.original_amount)}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div>
          <div className="section-header">Active Debts ({activeDebts.length})</div>
          {activeDebts.length === 0 && <div className="card" style={{textAlign:'center', color:'var(--green)'}}>🎉 No active debts!</div>}
          {activeDebts.map(d => {
            const color = d.type === 'Receivable' ? 'var(--green)' : 'var(--red)';
            const sf = settleForm[d.id] || {};
            return (
              <div key={d.id} className="tx-card" style={{borderLeftColor: color, marginBottom: 12}}>
                <div className="tx-top" style={{marginBottom: 10}}>
                  <div>
                    <div className="tx-title">{d.contact_name}</div>
                    <div className="tx-meta">{d.type}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'1.1rem', fontWeight:800, color}}>Remaining: {fmt(d.remaining_balance)}</div>
                    <div style={{fontSize:'0.75rem', color:'var(--text-dim)'}}>Original: {fmt(d.original_amount)}</div>
                  </div>
                </div>
                <details>
                  <summary>Settle debt</summary>
                  <div className="details-body">
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Wallet</label>
                        <select className="form-select" value={sf.wallet||'Bank'} onChange={e => setSettleForm(f=>({...f,[d.id]:{...sf,wallet:e.target.value}}))}>
                          <option>Bank</option><option>Cash</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Amount (default = full)</label>
                        <input className="form-input" type="number" min="0.01" step="0.01" max={d.remaining_balance} placeholder={d.remaining_balance} value={sf.amount||''} onChange={e => setSettleForm(f=>({...f,[d.id]:{...sf,amount:e.target.value}}))} />
                      </div>
                    </div>
                    <button className="btn btn-success" style={{width:'100%', justifyContent:'center'}} onClick={() => settleDebt(d.id, d.remaining_balance)}>Confirm Settlement</button>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
