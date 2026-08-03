import Link from 'next/link';
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
          <Link href="/dashboard" prefetch={false} className={styles.navLink}>📊 Dashboard</Link>
          <Link href="/dashboard/analytics" prefetch={false} className={styles.navLink}>📈 Analytics</Link>
          <Link href="/dashboard/transactions" prefetch={false} className={styles.navLink}>📝 Transactions</Link>
          <Link href="/dashboard/debts" prefetch={false} className={styles.navLink}>🤝 Debts</Link>
          <Link href="/dashboard/settings" prefetch={false} className={styles.navLink}>⚙️ Settings</Link>
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
