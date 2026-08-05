'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './dashboard.module.css';

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

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDaysUntilPayday(payday) {
  const today = new Date();
  const nextPayday = new Date(today.getFullYear(), today.getMonth(), payday);
  if (nextPayday <= today) nextPayday.setMonth(nextPayday.getMonth() + 1);
  const diff = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function computeSnapshot(transactions, debts, settings) {
  let bankBalance = toNumber(settings.initial_bank);
  let cashBalance = toNumber(settings.initial_cash);
  let totalGrossExpenses = 0;
  let totalReimbursable = 0;

  const orderedTransactions = [...transactions].sort((left, right) => {
    const dateCompare = String(left.date).localeCompare(String(right.date));
    if (dateCompare !== 0) return dateCompare;
    return Number(left.id) - Number(right.id);
  });

  for (const tx of orderedTransactions) {
    const amount = toNumber(tx.amount);
    const wallet = tx.source_wallet === 'Cash' ? 'cash' : 'bank';

    if (tx.type === 'Income') {
      if (wallet === 'cash') cashBalance += amount;
      else bankBalance += amount;
      continue;
    }

    if (tx.type === 'Expense') {
      if (wallet === 'cash') cashBalance -= amount;
      else bankBalance -= amount;

      if (tx.category !== 'Debt Repayment') {
        totalGrossExpenses += amount;
        totalReimbursable += toNumber(tx.reimbursable_amount);
      }
      continue;
    }

    if (tx.type === 'Transfer') {
      if (wallet === 'cash') {
        cashBalance -= amount;
        bankBalance += amount;
      } else {
        bankBalance -= amount;
        cashBalance += amount;
      }
    }
  }

  const normalizedDebts = debts.map(debt => ({
    ...debt,
    remaining_balance: +toNumber(debt.remaining_balance).toFixed(2),
  }));

  const receivables = normalizedDebts
    .filter(debt => debt.status === 'Pending' && debt.type === 'Receivable')
    .reduce((sum, debt) => sum + toNumber(debt.remaining_balance), 0);

  const payables = normalizedDebts
    .filter(debt => debt.status === 'Pending' && debt.type === 'Payable')
    .reduce((sum, debt) => sum + toNumber(debt.remaining_balance), 0);

  const totalLiquidity = bankBalance + cashBalance;
  const netPosition = totalLiquidity + receivables - payables;
  const adjustedTrueSpend = totalGrossExpenses - totalReimbursable;
  const daysUntilPayday = getDaysUntilPayday(Number(settings.payday || 25));
  const dailyAllowance = +(totalLiquidity / daysUntilPayday).toFixed(2);

  return {
    bankBalance: +bankBalance.toFixed(2),
    cashBalance: +cashBalance.toFixed(2),
    totalLiquidity: +totalLiquidity.toFixed(2),
    receivables: +receivables.toFixed(2),
    payables: +payables.toFixed(2),
    netPosition: +netPosition.toFixed(2),
    adjustedTrueSpend: +adjustedTrueSpend.toFixed(2),
    daysUntilPayday,
    dailyAllowance,
  };
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [transactions, debts, initialBank, initialCash, payday] = await Promise.all([
        fetch('/api/transactions', { cache: 'no-store' }).then(res => res.json()),
        fetch('/api/debts', { cache: 'no-store' }).then(res => res.json()),
        fetch('/api/settings/initial_bank', { cache: 'no-store' }).then(res => res.json()),
        fetch('/api/settings/initial_cash', { cache: 'no-store' }).then(res => res.json()),
        fetch('/api/settings/payday', { cache: 'no-store' }).then(res => res.json()),
      ]);

      setSnapshot(computeSnapshot(transactions, debts, {
        initial_bank: initialBank.value,
        initial_cash: initialCash.value,
        payday: payday.value,
      }));
    } catch (fetchError) {
      setError('Unable to load live ledger data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    window.addEventListener('focus', loadSnapshot);
    return () => window.removeEventListener('focus', loadSnapshot);
  }, [loadSnapshot]);

  if (loading) {
    return <div className={styles.loading}>Loading fresh ledger data...</div>;
  }

  if (error) {
    return (
      <div>
        <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '16px'}}>Dashboard</h1>
        <div className="card" style={{padding: 24}}>
          <p style={{margin: 0, color: 'var(--text-dim)'}}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '32px'}}>Dashboard</h1>

      <div className="section-header">Liquid Assets</div>
      <div className="grid-3" style={{marginBottom: 24}}>
        <MetricCard label="Bank Balance" value={snapshot.bankBalance} />
        <MetricCard label="Cash on Hand" value={snapshot.cashBalance} />
        <MetricCard label="Total Liquidity" value={snapshot.totalLiquidity} color="blue" />
      </div>

      <div className="grid-2" style={{marginBottom: 24}}>
        <div>
          <div className="section-header">Debts &amp; Net Position</div>
          <div className="grid-2" style={{marginBottom: 12}}>
            <MetricCard label="Receivables" value={snapshot.receivables} />
            <MetricCard label="Payables" value={snapshot.payables} color="red" />
          </div>
          <MetricCard label="Net Position" value={snapshot.netPosition} color={snapshot.netPosition >= 0 ? 'green' : 'red'} />
        </div>
        <div>
          <div className="section-header">Spending Pace</div>
          <div className="grid-2" style={{marginBottom: 12}}>
            <MetricCard label="True Spend" value={snapshot.adjustedTrueSpend} color="orange" />
            <MetricCard label="Days to Payday" value={snapshot.daysUntilPayday} color="neutral" unit="days" />
          </div>
          <MetricCard label="Daily Allowance" value={snapshot.dailyAllowance} color="blue" />
        </div>
      </div>
    </div>
  );
}
