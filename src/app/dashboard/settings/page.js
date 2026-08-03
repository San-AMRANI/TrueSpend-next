'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from '../dashboard.module.css';
import { LogoutButton } from '../LogoutButton';
import { notifyDataChanged, useDataRefresh } from '@/lib/dataRefresh';

export default function SettingsPage() {
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [settingsForm, setSettingsForm] = useState({ initial_bank: '', initial_cash: '', payday: '' });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cats, ib, ic, pd] = await Promise.all([
      fetch('/api/categories', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/settings/initial_bank', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/settings/initial_cash', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/settings/payday', { cache: 'no-store' }).then(r => r.json()),
    ]);
    setCategories(cats);
    setSettingsForm({ initial_bank: ib.value || 0, initial_cash: ic.value || 0, payday: pd.value || 25 });
    setLoading(false);
  }, []);

  useDataRefresh(fetchAll);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function addCategory(e) {
    e.preventDefault();
    const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCat.trim() }) });
    if (!res.ok) {
      showMsg('❌ Category already exists!');
      return;
    }
    setNewCat('');
    await fetchAll();
    notifyDataChanged();
  }

  async function deleteCategory(name) {
    const res = await fetch(`/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (!res.ok) {
      showMsg('❌ Failed to remove category');
      return;
    }
    await fetchAll();
    notifyDataChanged();
  }

  async function saveSettings(e) {
    e.preventDefault();
    const responses = await Promise.all([
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'initial_bank', value: String(settingsForm.initial_bank) }) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'initial_cash', value: String(settingsForm.initial_cash) }) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'payday', value: String(settingsForm.payday) }) }),
    ]);
    if (responses.some(res => !res.ok)) {
      showMsg('❌ Failed to save settings');
      return;
    }
    showMsg('✅ Settings saved!');
    notifyDataChanged();
  }

  if (loading) return <div className={styles.loading}>Loading data...</div>;

  return (
    <div>
      {msg && <div className={styles.toast}>{msg}</div>}
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Settings</h1>
      
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

          <div className="section-header" style={{marginTop: 24}}>Account Actions</div>
          <div className="card" style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
            <a href="/api/export" className="btn btn-ghost" download>⬇ Export CSV Data</a>
            <LogoutButton />
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
    </div>
  );
}
