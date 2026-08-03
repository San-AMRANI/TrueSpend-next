import styles from './dashboard.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '16px'}}>Dashboard</h1>
      <div className="card" style={{padding: 24}}>
        <p style={{margin: 0, color: 'var(--text-dim)'}}>
          Dashboard KPI cards have been removed.
        </p>
      </div>
    </div>
  );
}
