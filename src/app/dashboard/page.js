'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import styles from './dashboard.module.css';

const COLORS = ['#6366f1','#22c55e','#f97316','#3b82f6','#a855f7','#eab308','#ef4444','#14b8a6','#f43f5e','#8b5cf6'];
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
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [kpis, setKpis] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catData, setCatData] = useState([]);
  const [cashflowData, setCashflowData] = useState([]);
  const [settings, setSettings] = useState({ initial_bank: 0, initial_cash: 0, payday: 25 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Transaction form state
  const [txForm, setTxForm] = useState({ date: new Date().toISOString().split('T')[0], title: '', amount: '', type: 'Expense', source_wallet: 'Bank', category: 'Groceries', notes: '', reimbursable_amount: '', linked_contact: '', is_split: false });

  // ATM form state
  const [atmForm, setAtmForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', notes: '' });

  // Debt form state
  const [debtForm, setDebtForm] = useState({ contact_name: '', type: 'Receivable', amount: '' });
  const [settleForm, setSettleForm] = useState({});

  // Category form
  const [newCat, setNewCat] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState({ initial_bank: '', initial_cash: '', payday: '' });

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [k, t, d, c, cats, cf] = await Promise.all([
      fetch('/api/kpis').then(r => r.json()),
      fetch('/api/transactions').then(r => r.json()),
      fetch('/api/debts').then(r => r.json()),
      fetch('/api/analytics/categories').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/analytics/cashflow').then(r => r.json()),
    ]);
    setKpis(k);
    setTransactions(t);
    setDebts(d);
    setCatData(c);
    setCategories(cats);
    setCashflowData(cf);

    // Load settings separately
    const [ib, ic, pd] = await Promise.all([
      fetch('/api/settings/initial_bank').then(r => r.json()),
      fetch('/api/settings/initial_cash').then(r => r.json()),
      fetch('/api/settings/payday').then(r => r.json()),
    ]);
    setSettingsForm({ initial_bank: ib.value || 0, initial_cash: ic.value || 0, payday: pd.value || 25 });
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(txForm.category)) {
      setTxForm(f => ({ ...f, category: categories[0] }));
    }
  }, [categories]);

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  }

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

  async function addDebt(e) {
    e.preventDefault();
    await fetch('/api/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact_name: debtForm.contact_name, type: debtForm.type, amount: parseFloat(debtForm.amount) }) });
    setDebtForm({ contact_name: '', type: 'Receivable', amount: '' });
    showMsg('✅ Debt recorded!');
    fetchAll();
  }

  async function settleDebt(debt_id, remaining_balance) {
    const sf = settleForm[debt_id] || {};
    const wallet = sf.wallet || 'Bank';
    const amount_paid = sf.amount !== undefined ? parseFloat(sf.amount) : null;
    await fetch('/api/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ debt_id, wallet, amount_paid }) });
    showMsg('✅ Debt settled!');
    fetchAll();
  }

  async function addCategory(e) {
    e.preventDefault();
    const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCat.trim() }) });
    if (res.ok) { setNewCat(''); fetchAll(); }
    else showMsg('❌ Category already exists!');
  }

  async function deleteCategory(name) {
    await fetch(`/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
    fetchAll();
  }

  async function saveSettings(e) {
    e.preventDefault();
    await Promise.all([
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'initial_bank', value: String(settingsForm.initial_bank) }) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'initial_cash', value: String(settingsForm.initial_cash) }) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'payday', value: String(settingsForm.payday) }) }),
    ]);
    showMsg('✅ Settings saved!');
    fetchAll();
  }

  const activeDebts = debts.filter(d => d.status === 'Pending');
  const clearedDebts = debts.filter(d => d.status === 'Cleared');

  return (
    <div className={styles.layout}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>💸 TrueSpend</span>
        </div>
        <div className={styles.headerRight}>
          {msg && <span className={styles.toast}>{msg}</span>}
          <a href="/api/export" className="btn btn-ghost btn-sm" download>⬇ Export CSV</a>
          <button className="btn btn-ghost btn-sm" onClick={logout}>🚪 Logout</button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Tabs */}
        <div className="tabs">
          {[['dashboard','📊 Dashboard'],['analytics','📈 Analytics'],['transactions','📝 Transactions'],['debts','🤝 Debts'],['settings','⚙️ Settings']].map(([key,label]) => (
            <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {loading && <div className={styles.loading}>Loading data...</div>}

        {/* DASHBOARD TAB */}
        {!loading && tab === 'dashboard' && kpis && (
          <div>
            <div className="section-header">Liquid Assets</div>
            <div className="grid-3" style={{marginBottom: 24}}>
              <MetricCard label="Bank Balance" value={kpis.bankBalance} />
              <MetricCard label="Cash on Hand" value={kpis.cashBalance} />
              <MetricCard label="Total Liquidity" value={kpis.totalLiquidity} color="blue" />
            </div>

            <div className="grid-2" style={{marginBottom: 24}}>
              <div>
                <div className="section-header">Debts &amp; Net Position</div>
                <div className="grid-2" style={{marginBottom: 12}}>
                  <MetricCard label="Receivables" value={kpis.receivables} />
                  <MetricCard label="Payables" value={kpis.payables} color="red" />
                </div>
                <MetricCard label="Net Position" value={kpis.netPosition} color={kpis.netPosition >= 0 ? 'green' : 'red'} />
              </div>
              <div>
                <div className="section-header">Spending Pace</div>
                <div className="grid-2" style={{marginBottom: 12}}>
                  <MetricCard label="True Spend" value={kpis.adjustedTrueSpend} color="orange" />
                  <MetricCard label="Days to Payday" value={kpis.daysUntilPayday} color="neutral" unit="days" />
                </div>
                <MetricCard label="Daily Allowance" value={kpis.dailyAllowance} color="blue" />
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {!loading && tab === 'analytics' && (
          <div>
            <div className="section-header">Spending Analytics</div>
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
        )}

        {/* TRANSACTIONS TAB */}
        {!loading && tab === 'transactions' && (
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
        )}

        {/* DEBTS TAB */}
        {!loading && tab === 'debts' && (
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
        )}

        {/* SETTINGS TAB */}
        {!loading && tab === 'settings' && (
          <div className="grid-2" style={{alignItems:'flex-start'}}>
            <div>
              <div className="section-header">Core Settings</div>
              <div className="card" style={{marginBottom: 24}}>
                <form onSubmit={saveSettings}>
                  <div className="form-group">
                    <label className="form-label">Initial Bank Balance (MAD)</label>
                    <input className="form-input" type="number" step="0.01" value={settingsForm.initial_bank} onChange={e => setSettingsForm(f=>({...f,initial_bank:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Cash Balance (MAD)</label>
                    <input className="form-input" type="number" step="0.01" value={settingsForm.initial_cash} onChange={e => setSettingsForm(f=>({...f,initial_cash:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payday (Day of Month)</label>
                    <input className="form-input" type="number" min="1" max="31" value={settingsForm.payday} onChange={e => setSettingsForm(f=>({...f,payday:e.target.value}))} />
                  </div>
                  <button className="btn btn-primary" type="submit" style={{width:'100%', justifyContent:'center'}}>💾 Save Settings</button>
                </form>
              </div>

              <div className="section-header">REST API</div>
              <div className="card">
                <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:8}}>All endpoints are available for external access via HTTP Basic Auth:</p>
                <code style={{display:'block', background:'var(--surface2)', padding:'10px 14px', borderRadius:6, fontSize:'0.78rem', color:'var(--green)'}}>
                  curl -u SanSpend:'!4ZwqYFBHX*r@f' http://[host]/api/kpis
                </code>
              </div>
            </div>

            <div>
              <div className="section-header">Custom Categories</div>
              <div className="card">
                {categories.map(cat => (
                  <div key={cat} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontSize:'0.88rem'}}>{cat}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteCategory(cat)}>Remove</button>
                  </div>
                ))}
                <form onSubmit={addCategory} style={{marginTop: 14, display:'flex', gap:8}}>
                  <input className="form-input" type="text" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category name" required />
                  <button className="btn btn-primary" type="submit">Add</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
