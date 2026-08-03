import styles from './dashboard.module.css';
import { calculateKpis, getDaysUntilPayday, calculateDailyAllowance } from '@/lib/logic';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export default async function DashboardPage() {
  const kpis = await calculateKpis();
  const daysUntilPayday = await getDaysUntilPayday();
  const dailyAllowance = calculateDailyAllowance(kpis.totalLiquidity, daysUntilPayday);

  return (
    <div>
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Dashboard</h1>
      
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
            <MetricCard label="Days to Payday" value={daysUntilPayday} color="neutral" unit="days" />
          </div>
          <MetricCard label="Daily Allowance" value={dailyAllowance} color="blue" />
        </div>
      </div>
    </div>
  );
}
