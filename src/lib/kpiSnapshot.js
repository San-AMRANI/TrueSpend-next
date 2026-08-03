import * as db from './database';

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortTransactions(transactions) {
  return [...transactions].sort((left, right) => {
    const dateCompare = String(left.date).localeCompare(String(right.date));
    if (dateCompare !== 0) return dateCompare;
    return Number(left.id) - Number(right.id);
  });
}

async function getSettingsSnapshot() {
  const [initialBank, initialCash, payday] = await Promise.all([
    db.getSetting('initial_bank'),
    db.getSetting('initial_cash'),
    db.getSetting('payday'),
  ]);

  return {
    initialBank: toNumber(initialBank),
    initialCash: toNumber(initialCash),
    payday: Number.parseInt(payday || '25', 10) || 25,
  };
}

async function getDebtSnapshot() {
  const debts = await db.getDebts();

  const normalizedDebts = debts.map(debt => {
    const remainingBalance = toNumber(debt.remaining_balance);

    return {
      ...debt,
      remaining_balance: +remainingBalance.toFixed(2),
      status: remainingBalance <= 0 ? 'Cleared' : 'Pending',
    };
  });

  const receivables = normalizedDebts
    .filter(debt => debt.status === 'Pending' && debt.type === 'Receivable')
    .reduce((sum, debt) => sum + toNumber(debt.remaining_balance), 0);

  const payables = normalizedDebts
    .filter(debt => debt.status === 'Pending' && debt.type === 'Payable')
    .reduce((sum, debt) => sum + toNumber(debt.remaining_balance), 0);

  return { normalizedDebts, receivables, payables };
}

async function buildKpiSnapshot() {
  const [transactions, settings, debtSnapshot] = await Promise.all([
    db.getTransactions(),
    getSettingsSnapshot(),
    getDebtSnapshot(),
  ]);

  const orderedTransactions = sortTransactions(transactions);
  let bankBalance = settings.initialBank;
  let cashBalance = settings.initialCash;
  let totalGrossExpenses = 0;
  let totalReimbursable = 0;

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

  const totalLiquidity = bankBalance + cashBalance;
  const netPosition = totalLiquidity + debtSnapshot.receivables - debtSnapshot.payables;
  const adjustedTrueSpend = totalGrossExpenses - totalReimbursable;

  return {
    bankBalance: +bankBalance.toFixed(2),
    cashBalance: +cashBalance.toFixed(2),
    totalLiquidity: +totalLiquidity.toFixed(2),
    receivables: +debtSnapshot.receivables.toFixed(2),
    payables: +debtSnapshot.payables.toFixed(2),
    netPosition: +netPosition.toFixed(2),
    adjustedTrueSpend: +adjustedTrueSpend.toFixed(2),
    totalGrossExpenses: +totalGrossExpenses.toFixed(2),
    daysUntilPayday: getDaysUntilPaydayValue(settings.payday),
    transactions: orderedTransactions,
    debts: debtSnapshot.normalizedDebts,
  };
}

function getDaysUntilPaydayValue(payday) {
  const today = new Date();
  const nextPayday = new Date(today.getFullYear(), today.getMonth(), payday);
  if (nextPayday <= today) nextPayday.setMonth(nextPayday.getMonth() + 1);
  const diff = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

async function getDaysUntilPayday() {
  const { payday } = await getSettingsSnapshot();
  return getDaysUntilPaydayValue(payday);
}

function calculateDailyAllowance(totalLiquidity, days) {
  return +(totalLiquidity / days).toFixed(2);
}

export { buildKpiSnapshot, getDaysUntilPayday, calculateDailyAllowance };