import styles from './dashboard.module.css';

export default function Loading() {
  return <div className={styles.loading}>Calculating fresh KPI data...</div>;
}