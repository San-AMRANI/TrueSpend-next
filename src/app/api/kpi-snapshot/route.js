
import { NextResponse } from 'next/server';
import { initDb, getTransactions, getDebts, getSetting } from '@/lib/database';
import { getDaysUntilPayday } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const dailyAllowance = daysUntilPayday > 0 ? +(totalLiquidity / daysUntilPayday).toFixed(2) : totalLiquidity;

  return {
    bankBalance: +bankBalance.toFixed(2),
    cashBalance: +cashBalance.toFixed(2),
    totalLiquidity: +totalLiquidity.toFixed(2),
    receivables: +receivables.toFixed(2),
    payables: +payables.toFixed(2),
    netPosition: +netPosition.toFixed(2),
    adjustedTrueSpend: +adjustedTrueSpend.toFixed(2),
    daysUntilPayday,
    dailyAllowance: +dailyAllowance.toFixed(2),
  };
}

export async function GET() {
  try {
    await initDb();
    const [transactions, debts, initial_bank, initial_cash, payday] = await Promise.all([
      getTransactions(),
      getDebts(),
      getSetting('initial_bank'),
      getSetting('initial_cash'),
      getSetting('payday'),
    ]);

    const snapshot = computeSnapshot(transactions, debts, {
      initial_bank: initial_bank || '0',
      initial_cash: initial_cash || '0',
      payday: payday || '25',
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching KPI data', error: error.message }, { status: 500 });
  }
}
