import * as db from './database';

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getWalletKey(wallet) {
  return wallet === 'Cash' ? 'cash' : 'bank';
}

function sortLedgerRows(rows) {
  return [...rows].sort((left, right) => {
    const dateCompare = String(left.date).localeCompare(String(right.date));
    if (dateCompare !== 0) return dateCompare;
    return Number(left.id) - Number(right.id);
  });
}

async function getSnapshotSettings() {
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

async function buildDebtSnapshot() {
  const debts = await db.getDebts();
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

  return { normalizedDebts, receivables, payables };
}

async function buildLedgerSnapshot() {
  const [transactions, settings, debtSnapshot] = await Promise.all([
    db.getTransactions(),
    getSnapshotSettings(),
    buildDebtSnapshot(),
  ]);

  const orderedTransactions = sortLedgerRows(transactions);

  let bankBalance = settings.initialBank;
  let cashBalance = settings.initialCash;
  let totalGrossExpenses = 0;
  let totalReimbursable = 0;

  for (const tx of orderedTransactions) {
    const amount = toNumber(tx.amount);
    const walletKey = getWalletKey(tx.source_wallet);

    if (tx.type === 'Income') {
      if (walletKey === 'cash') cashBalance += amount;
      else bankBalance += amount;
      continue;
    }

    if (tx.type === 'Expense') {
      if (walletKey === 'cash') cashBalance -= amount;
      else bankBalance -= amount;

      if (tx.category !== 'Debt Repayment') {
        totalGrossExpenses += amount;
        totalReimbursable += toNumber(tx.reimbursable_amount);
      }
      continue;
    }

    if (tx.type === 'Transfer') {
      if (walletKey === 'cash') {
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
    payday: settings.payday,
    transactions: orderedTransactions,
    debts: debtSnapshot.normalizedDebts,
  };
}

async function getDaysUntilPayday() {
  const { payday } = await getSnapshotSettings();
  const today = new Date();
  const nextPayday = new Date(today.getFullYear(), today.getMonth(), payday);
  if (nextPayday <= today) nextPayday.setMonth(nextPayday.getMonth() + 1);
  const diff = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function calculateDailyAllowance(totalLiquidity, days) {
  return +(totalLiquidity / days).toFixed(2);
}

async function getExpensesByCategory() {
  const { transactions } = await buildLedgerSnapshot();
  const categoryMap = {};

  for (const tx of transactions) {
    if (tx.type !== 'Expense' || tx.category === 'Debt Repayment') continue;
    const category = tx.category || 'Uncategorized';
    const trueSpend = toNumber(tx.amount) - toNumber(tx.reimbursable_amount);
    categoryMap[category] = (categoryMap[category] || 0) + trueSpend;
  }

  return Object.entries(categoryMap)
    .filter(([, value]) => value > 0)
    .map(([category, trueSpend]) => ({ category, trueSpend: +trueSpend.toFixed(2) }))
    .sort((left, right) => right.trueSpend - left.trueSpend);
}

async function getDailyCashflow() {
  const { transactions } = await buildLedgerSnapshot();
  const dayMap = {};

  for (const tx of transactions) {
    const day = tx.date;
    if (!dayMap[day]) {
      dayMap[day] = { date: day, income: 0, expense: 0, transfer: 0, trueSpend: 0 };
    }

    const amount = toNumber(tx.amount);
    if (tx.type === 'Income') {
      dayMap[day].income += amount;
    } else if (tx.type === 'Expense') {
      dayMap[day].expense += amount;
      if (tx.category !== 'Debt Repayment') {
        dayMap[day].trueSpend += amount - toNumber(tx.reimbursable_amount);
      }
    } else if (tx.type === 'Transfer') {
      dayMap[day].transfer += amount;
    }
  }

  return Object.values(dayMap).sort((left, right) => left.date.localeCompare(right.date));
}

export { buildLedgerSnapshot, getDaysUntilPayday, calculateDailyAllowance, getExpensesByCategory, getDailyCashflow };