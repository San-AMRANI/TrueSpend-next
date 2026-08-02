const db = require('./database');

function calculateKpis() {
  const transactions = db.getTransactions();
  const debts = db.getDebts();

  const initialBank = parseFloat(db.getSetting('initial_bank') || 0);
  const initialCash = parseFloat(db.getSetting('initial_cash') || 0);

  let bankBalance = initialBank;
  let cashBalance = initialCash;
  let totalReimbursable = 0;
  let totalGrossExpenses = 0;

  for (const tx of transactions) {
    const amt = tx.amount;
    if (tx.type === 'Income') {
      if (tx.source_wallet === 'Bank') bankBalance += amt;
      else cashBalance += amt;
    } else if (tx.type === 'Expense') {
      if (tx.source_wallet === 'Bank') bankBalance -= amt;
      else cashBalance -= amt;
      if (tx.category !== 'Debt Repayment') {
        totalGrossExpenses += amt;
        totalReimbursable += (tx.reimbursable_amount || 0);
      }
    } else if (tx.type === 'Transfer') {
      // ATM: Bank → Cash
      bankBalance -= amt;
      cashBalance += amt;
    }
  }

  const pendingDebts = debts.filter(d => d.status === 'Pending');
  const receivables = pendingDebts.filter(d => d.type === 'Receivable').reduce((s, d) => s + d.remaining_balance, 0);
  const payables = pendingDebts.filter(d => d.type === 'Payable').reduce((s, d) => s + d.remaining_balance, 0);

  const totalLiquidity = bankBalance + cashBalance;
  const netPosition = totalLiquidity + receivables - payables;
  const adjustedTrueSpend = totalGrossExpenses - totalReimbursable;

  return {
    bankBalance: +bankBalance.toFixed(2),
    cashBalance: +cashBalance.toFixed(2),
    totalLiquidity: +totalLiquidity.toFixed(2),
    receivables: +receivables.toFixed(2),
    payables: +payables.toFixed(2),
    netPosition: +netPosition.toFixed(2),
    adjustedTrueSpend: +adjustedTrueSpend.toFixed(2),
    totalGrossExpenses: +totalGrossExpenses.toFixed(2),
  };
}

function getDaysUntilPayday() {
  const payday = parseInt(db.getSetting('payday') || 25);
  const today = new Date();
  const nextPayday = new Date(today.getFullYear(), today.getMonth(), payday);
  if (nextPayday <= today) nextPayday.setMonth(nextPayday.getMonth() + 1);
  const diff = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function calculateDailyAllowance(totalLiquidity) {
  const days = getDaysUntilPayday();
  return +(totalLiquidity / days).toFixed(2);
}

function getExpensesByCategory() {
  const transactions = db.getTransactions();
  const categoryMap = {};
  for (const tx of transactions) {
    if (tx.type === 'Expense' && tx.category !== 'Debt Repayment') {
      const cat = tx.category || 'Uncategorized';
      const trueSpend = tx.amount - (tx.reimbursable_amount || 0);
      categoryMap[cat] = (categoryMap[cat] || 0) + trueSpend;
    }
  }
  return Object.entries(categoryMap)
    .filter(([, v]) => v > 0)
    .map(([category, trueSpend]) => ({ category, trueSpend: +trueSpend.toFixed(2) }))
    .sort((a, b) => b.trueSpend - a.trueSpend);
}

function getDailyCashflow() {
  const transactions = db.getTransactions();
  const dayMap = {};
  for (const tx of transactions) {
    const d = tx.date;
    if (!dayMap[d]) dayMap[d] = { date: d, income: 0, expense: 0, trueSpend: 0 };
    if (tx.type === 'Income') dayMap[d].income += tx.amount;
    if (tx.type === 'Expense') {
      dayMap[d].expense += tx.amount;
      dayMap[d].trueSpend += tx.amount - (tx.reimbursable_amount || 0);
    }
  }
  return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { calculateKpis, getDaysUntilPayday, calculateDailyAllowance, getExpensesByCategory, getDailyCashflow };
