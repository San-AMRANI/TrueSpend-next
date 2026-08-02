'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from '../dashboard.module.css';

const fmt = (n) => `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [txForm, setTxForm] = useState({ date: new Date().toISOString().split('T')[0], title: '', amount: '', type: 'Expense', source_wallet: 'Bank', category: 'Groceries', notes: '', reimbursable_amount: '', linked_contact: '', is_split: false });
  const [atmForm, setAtmForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', notes: '' });

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [t, cats] = await Promise.all([
      fetch('/api/transactions').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]);
    setTransactions(t);
    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(txForm.category)) {
      setTxForm(f => ({ ...f, category: categories[0] }));
    }
  }, [categories]);

  async function addTransaction(e) {
    e.preventDefault();
    const body = {
      date: txForm.date, title: txForm.title, amount: parseFloat(txForm.amount),
      type: txForm.type, source_wallet: txForm.source_wallet, category: txForm.category,
      notes: txForm.notes, reimbursable_amount: txForm.is_split ? parseFloat(txForm.reimbursable_amount || 0) : 0,
      linked_contact: txForm.is_split ? txForm.linked_contact : '',
    };
    await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setTxForm(f => ({ ...f, title: '', amount: '', notes: '', reimbursable_amount: '', linked_contact: '', is_split: false }));
    showMsg('✅ Transaction saved!');
    fetchAll();
  }

  async function addAtm(e) {
    e.preventDefault();
    await fetch('/api/transactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: atmForm.date, title: 'ATM Withdrawal', amount: parseFloat(atmForm.amount), type: 'Transfer', source_wallet: 'Bank', category: 'ATM', notes: atmForm.notes }),
    });
    setAtmForm(f => ({ ...f, amount: '', notes: '' }));
    showMsg('✅ ATM Withdrawal recorded!');
    fetchAll();
  }

  async function deleteTx(id) {
    if (!confirm('Delete this transaction?')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    fetchAll();
  }

  if (loading) return <div className={styles.loading}>Loading data...</div>;

  return (
    <div>
      {msg && <div className={styles.toast}>{msg}</div>}
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Transactions</h1>
      
      <div className="grid-2" style={{alignItems:'flex-start'}}>
        <div>
          <div className="section-header">Add Transaction</div>
          <div className="card" style={{marginBottom: 16}}>
            <form onSubmit={addTransaction}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={txForm.date} onChange={e => setTxForm(f=>({...f,date:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={txForm.type} onChange={e => setTxForm(f=>({...f,type:e.target.value}))}>
                    <option>Expense</option><option>Income</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Title / Merchant</label>
                <input className="form-input" type="text" value={txForm.title} onChange={e => setTxForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Marjane Bouskoura" required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Amount (MAD)</label>
                  <input className="form-input" type="number" min="0.01" step="0.01" value={txForm.amount} onChange={e => setTxForm(f=>({...f,amount:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Wallet</label>
                  <select className="form-select" value={txForm.source_wallet} onChange={e => setTxForm(f=>({...f,source_wallet:e.target.value}))}>
                    <option>Bank</option><option>Cash</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={txForm.category} onChange={e => setTxForm(f=>({...f,category:e.target.value}))}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Detailed Notes</label>
                <textarea className="form-textarea" value={txForm.notes} onChange={e => setTxForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Card, 40 friends + 14 personal" />
              </div>
              <label className="form-checkbox" style={{marginBottom: 14}}>
                <input type="checkbox" checked={txForm.is_split} onChange={e => setTxForm(f=>({...f,is_split:e.target.checked}))} />
                Split / Fronted for someone?
              </label>
              {txForm.is_split && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Reimbursable Amount</label>
                    <input className="form-input" type="number" min="0" step="0.01" value={txForm.reimbursable_amount} onChange={e => setTxForm(f=>({...f,reimbursable_amount:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact (Who owes you?)</label>
                    <input className="form-input" type="text" value={txForm.linked_contact} onChange={e => setTxForm(f=>({...f,linked_contact:e.target.value}))} />
                  </div>
                </div>
              )}
              <button className="btn btn-primary" type="submit" style={{width:'100%', justifyContent:'center'}}>➕ Add Transaction</button>
            </form>
          </div>

          <div className="card">
            <h4 style={{marginBottom: 12, fontSize: '0.9rem', fontWeight: 700}}>🏧 ATM Withdrawal</h4>
            <form onSubmit={addAtm}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={atmForm.date} onChange={e => setAtmForm(f=>({...f,date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (MAD)</label>
                  <input className="form-input" type="number" min="10" step="10" value={atmForm.amount} onChange={e => setAtmForm(f=>({...f,amount:e.target.value}))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" type="text" value={atmForm.notes} onChange={e => setAtmForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. 45 spent + 5 change retained" />
              </div>
              <button className="btn btn-ghost" type="submit" style={{width:'100%', justifyContent:'center'}}>Record ATM Withdrawal</button>
            </form>
          </div>
        </div>

        <div>
          <div className="section-header">Recent Transactions (Top 30)</div>
          {transactions.slice(0, 30).map(tx => {
            const color = tx.type === 'Income' ? 'var(--green)' : tx.type === 'Expense' ? 'var(--red)' : 'var(--blue)';
            return (
              <div key={tx.id} className="tx-card" style={{borderLeftColor: color}}>
                <div className="tx-top">
                  <div style={{flex:1}}>
                    <div className="tx-title">{tx.title || tx.category}</div>
                    <div className="tx-meta">{tx.date} | {tx.source_wallet} | <span style={{color}}>{tx.type}</span> | {tx.category}</div>
                    {tx.notes && <div className="tx-notes">{tx.notes}</div>}
                    {tx.reimbursable_amount > 0 && <div className="tx-reimb">↳ Reimbursable: {fmt(tx.reimbursable_amount)} from {tx.linked_contact}</div>}
                  </div>
                  <div style={{textAlign:'right', flexShrink:0}}>
                    <div className="tx-amount" style={{color}}>{fmt(tx.amount)}</div>
                    <button className="btn btn-danger" style={{marginTop:6}} onClick={() => deleteTx(tx.id)}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
