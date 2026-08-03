import styles from './dashboard.module.css';
import RefreshOnDataChange from './RefreshOnDataChange';
import { LogoutButton } from './LogoutButton'; // Need to create this client component

export default function DashboardLayout({ children }) {
  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.logo}>💸 TrueSpend</span>
        </div>
        <nav className={styles.sidebarNav}>
          <a href="/dashboard" className={styles.navLink}>📊 Dashboard</a>
          <a href="/dashboard/analytics" className={styles.navLink}>📈 Analytics</a>
          <a href="/dashboard/transactions" className={styles.navLink}>📝 Transactions</a>
          <a href="/dashboard/debts" className={styles.navLink}>🤝 Debts</a>
          <a href="/dashboard/settings" className={styles.navLink}>⚙️ Settings</a>
        </nav>
        <div className={styles.sidebarFooter}>
          <a href="/api/export" className="btn btn-ghost btn-sm" style={{width: '100%', marginBottom: '8px'}} download>⬇ Export CSV</a>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <RefreshOnDataChange />
        {children}
      </main>
    </div>
  );
}
