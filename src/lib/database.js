let sqlClient = null;

if (process.env.POSTGRES_URL) {
  try {
    const postgres = require('@vercel/postgres');
    sqlClient = postgres.sql;
  } catch (err) {
    console.warn('[TrueSpend] @vercel/postgres module unavailable, using in-memory store');
  }
}

// In-Memory Fallback Storage
const memoryStore = {
  settings: {
    initial_bank: '0',
    initial_cash: '0',
    payday: '25',
  },
  categories: [
    'Groceries', 'Dining Out', 'Entertainment', 'Transport', 'Utilities',
    'Salary', 'ATM', 'Family', 'Grooming', 'Wardrobe', 'Income',
    'Debts & Transfers', 'Debt Repayment'
  ],
  nextTxId: 100,
  nextDebtId: 50,
  transactions: [],
  debts: [],
};

// Seed initial memory data
function seedMemoryData() {
  if (memoryStore.transactions.length > 0) return;

  const D = '2026-07-15';
  const initialTxs = [
    { date: D, title: 'Oracle R&D Center', amount: 6036.70, type: 'Income', source_wallet: 'Bank', category: 'Salary', notes: 'Salary / Payroll', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Yassmine Amrani', amount: 100.00, type: 'Income', source_wallet: 'Bank', category: 'Income', notes: 'Loan repayment received', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Sister', amount: 11.00, type: 'Income', source_wallet: 'Cash', category: 'Income', notes: 'Cash gift / help (+1 MAD cash adjustment)', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Yassmine Amrani', amount: 2100.00, type: 'Expense', source_wallet: 'Bank', category: 'Debts & Transfers', notes: 'Loan repayment transfer', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Marjane Bouskoura', amount: 196.05, type: 'Expense', source_wallet: 'Bank', category: 'Groceries', notes: 'Groceries, TPE', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'SRM Casablanca-Settat', amount: 191.37, type: 'Expense', source_wallet: 'Bank', category: 'Utilities', notes: 'Utilities', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'McDo Mohammed V', amount: 60.00, type: 'Expense', source_wallet: 'Bank', category: 'Dining Out', notes: 'Card, paid for friends', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Orange Maroc', amount: 50.00, type: 'Expense', source_wallet: 'Bank', category: 'Utilities', notes: 'Telecom', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Supermarket', amount: 105.00, type: 'Expense', source_wallet: 'Bank', category: 'Groceries', notes: 'Cat supplies', reimbursable_amount: 91.00, linked_contact: 'Friend (Cat supplies)' },
    { date: D, title: 'MehDi Card Withdrawal', amount: 400.00, type: 'Transfer', source_wallet: 'Bank', category: 'ATM', notes: 'Fully allocated', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Suit Rental Withdrawal', amount: 300.00, type: 'Transfer', source_wallet: 'Bank', category: 'ATM', notes: 'Fully allocated', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Suit Rental', amount: 300.00, type: 'Expense', source_wallet: 'Cash', category: 'Wardrobe', notes: 'Ceremony / wardrobe', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'McDonald\'s', amount: 72.00, type: 'Expense', source_wallet: 'Cash', category: 'Dining Out', notes: 'Food', reimbursable_amount: 0, linked_contact: '' },
    { date: D, title: 'Clothes', amount: 190.00, type: 'Expense', source_wallet: 'Cash', category: 'Wardrobe', notes: 'Cash paid', reimbursable_amount: 0, linked_contact: '' },
  ];

  for (const tx of initialTxs) {
    const id = memoryStore.nextTxId++;
    const record = { id, ...tx };
    memoryStore.transactions.push(record);

    if (tx.reimbursable_amount > 0 && tx.linked_contact) {
      const debtId = memoryStore.nextDebtId++;
      memoryStore.debts.push({
        id: debtId,
        contact_name: tx.linked_contact,
        type: 'Receivable',
        original_amount: tx.reimbursable_amount,
        remaining_balance: tx.reimbursable_amount,
        status: 'Pending',
        linked_transaction_id: id,
      });
    }
  }

  memoryStore.debts.push({
    id: memoryStore.nextDebtId++,
    contact_name: 'Clothes Seller',
    type: 'Payable',
    original_amount: 20.00,
    remaining_balance: 20.00,
    status: 'Pending',
    linked_transaction_id: null,
  });
}

seedMemoryData();

export async function initDb() {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      await sqlClient`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          date VARCHAR(255) NOT NULL,
          title VARCHAR(255),
          amount NUMERIC NOT NULL,
          type VARCHAR(50) NOT NULL,
          source_wallet VARCHAR(50) NOT NULL,
          category VARCHAR(255),
          notes TEXT,
          reimbursable_amount NUMERIC DEFAULT 0,
          linked_contact VARCHAR(255),
          linked_debt_id INTEGER
        );
      `;
      await sqlClient`
        CREATE TABLE IF NOT EXISTS debts (
          id SERIAL PRIMARY KEY,
          contact_name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          original_amount NUMERIC NOT NULL,
          remaining_balance NUMERIC NOT NULL,
          status VARCHAR(50) DEFAULT 'Pending',
          linked_transaction_id INTEGER
        );
      `;
      await sqlClient`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL);`;
      return;
    } catch (e) {
      console.warn('[TrueSpend] Postgres initDb failed, falling back to in-memory store:', e.message);
    }
  }
}

export async function getSetting(key) {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      const { rows } = await sqlClient`SELECT value FROM settings WHERE key = ${key}`;
      return rows.length > 0 ? rows[0].value : null;
    } catch (e) {
      console.warn('[TrueSpend] Postgres getSetting failed, fallback to memory');
    }
  }
  return memoryStore.settings[key] ?? null;
}

export async function updateSetting(key, value) {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      await sqlClient`
        INSERT INTO settings (key, value) VALUES (${key}, ${String(value)}) 
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
      return;
    } catch (e) {
      console.warn('[TrueSpend] Postgres updateSetting failed, fallback to memory');
    }
  }
  memoryStore.settings[key] = String(value);
}

export async function getCategories() {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      const { rows } = await sqlClient`SELECT name FROM categories ORDER BY name`;
      return rows.map(r => r.name);
    } catch (e) {
      console.warn('[TrueSpend] Postgres getCategories failed, fallback to memory');
    }
  }
  return [...memoryStore.categories].sort();
}

export async function addCategory(name) {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      await sqlClient`INSERT INTO categories (name) VALUES (${name})`;
      return true;
    } catch (e) {
      // ignore
    }
  }
  if (!memoryStore.categories.includes(name)) {
    memoryStore.categories.push(name);
    return true;
  }
  return false;
}

export async function deleteCategory(name) {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      await sqlClient`DELETE FROM categories WHERE name = ${name}`;
      return;
    } catch (e) {
      // ignore
    }
  }
  memoryStore.categories = memoryStore.categories.filter(c => c !== name);
}

export async function addTransaction({ date, title, amount, type, source_wallet, category, notes = '', reimbursable_amount = 0, linked_contact = '' }) {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      const { rows } = await sqlClient`
        INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact)
        VALUES (${date}, ${title}, ${amount}, ${type}, ${source_wallet}, ${category}, ${notes}, ${reimbursable_amount}, ${linked_contact})
        RETURNING id
      `;
      const insertId = rows[0].id;
      if (reimbursable_amount > 0 && linked_contact) {
        await sqlClient`
          INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status, linked_transaction_id)
          VALUES (${linked_contact}, 'Receivable', ${reimbursable_amount}, ${reimbursable_amount}, 'Pending', ${insertId})
        `;
      }
      return insertId;
    } catch (e) {
      console.warn('[TrueSpend] Postgres addTransaction failed, fallback to memory');
    }
  }

  const insertId = memoryStore.nextTxId++;
  const tx = {
    id: insertId,
    date,
    title,
    amount: parseFloat(amount),
    type,
    source_wallet,
    category,
    notes,
    reimbursable_amount: parseFloat(reimbursable_amount || 0),
    linked_contact,
  };
  memoryStore.transactions.push(tx);

  if (reimbursable_amount > 0 && linked_contact) {
    const debtId = memoryStore.nextDebtId++;
    memoryStore.debts.push({
      id: debtId,
      contact_name: linked_contact,
      type: 'Receivable',
      original_amount: parseFloat(reimbursable_amount),
      remaining_balance: parseFloat(reimbursable_amount),
      status: 'Pending',
      linked_transaction_id: insertId,
    });
  }

  return insertId;
}

export async function getTransactions() {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      const { rows } = await sqlClient`SELECT * FROM transactions ORDER BY date DESC, id DESC`;
      return rows;
    } catch (e) {
      console.warn('[TrueSpend] Postgres getTransactions failed, fallback to memory');
    }
  }

  return [...memoryStore.transactions].sort((a, b) => {
    const dateComp = String(b.date).localeCompare(String(a.date));
    if (dateComp !== 0) return dateComp;
    return b.id - a.id;
  });
}

export async function addDebt({ contact_name, type, amount }) {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      await sqlClient`
        INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status)
        VALUES (${contact_name}, ${type}, ${amount}, ${amount}, 'Pending')
      `;
      return;
    } catch (e) {
      console.warn('[TrueSpend] Postgres addDebt failed, fallback to memory');
    }
  }

  const debtId = memoryStore.nextDebtId++;
  memoryStore.debts.push({
    id: debtId,
    contact_name,
    type,
    original_amount: parseFloat(amount),
    remaining_balance: parseFloat(amount),
    status: 'Pending',
    linked_transaction_id: null,
  });
}

export async function getDebts() {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      const { rows } = await sqlClient`SELECT * FROM debts ORDER BY id DESC`;
      return rows;
    } catch (e) {
      console.warn('[TrueSpend] Postgres getDebts failed, fallback to memory');
    }
  }

  return [...memoryStore.debts].sort((a, b) => b.id - a.id);
}

export async function settleDebt({ debt_id, wallet, amount_paid = null }) {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      const { rows } = await sqlClient`SELECT * FROM debts WHERE id = ${debt_id}`;
      const debt = rows.length > 0 ? rows[0] : null;
      if (debt) {
        const remaining = parseFloat(debt.remaining_balance);
        const actual = (amount_paid === null || parseFloat(amount_paid) >= remaining) ? remaining : parseFloat(amount_paid);
        const isFullSettlement = actual >= remaining;

        if (isFullSettlement) {
          await sqlClient`UPDATE debts SET status = 'Cleared', remaining_balance = 0 WHERE id = ${debt_id}`;
        } else {
          await sqlClient`UPDATE debts SET remaining_balance = ${remaining - actual} WHERE id = ${debt_id}`;
        }

        const txType = debt.type === 'Receivable' ? 'Income' : 'Expense';
        const today = new Date().toISOString().split('T')[0];
        await sqlClient`
          INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, linked_debt_id)
          VALUES (${today}, ${`Settlement: ${debt.contact_name}`}, ${actual}, ${txType}, ${wallet}, 'Debt Repayment', ${`Settled ${debt.type} with ${debt.contact_name}`}, ${debt_id})
        `;
        return;
      }
    } catch (e) {
      console.warn('[TrueSpend] Postgres settleDebt failed, fallback to memory');
    }
  }

  const debt = memoryStore.debts.find(d => d.id === debt_id);
  if (!debt) return;

  const remaining = parseFloat(debt.remaining_balance);
  const actual = (amount_paid === null || parseFloat(amount_paid) >= remaining) ? remaining : parseFloat(amount_paid);
  const isFullSettlement = actual >= remaining;

  if (isFullSettlement) {
    debt.status = 'Cleared';
    debt.remaining_balance = 0;
  } else {
    debt.remaining_balance = remaining - actual;
  }

  const txType = debt.type === 'Receivable' ? 'Income' : 'Expense';
  const today = new Date().toISOString().split('T')[0];
  const txId = memoryStore.nextTxId++;

  memoryStore.transactions.push({
    id: txId,
    date: today,
    title: `Settlement: ${debt.contact_name}`,
    amount: actual,
    type: txType,
    source_wallet: wallet,
    category: 'Debt Repayment',
    notes: `Settled ${debt.type} with ${debt.contact_name}`,
    reimbursable_amount: 0,
    linked_contact: '',
    linked_debt_id: debt_id,
  });
}

export async function deleteTransaction(id) {
  if (sqlClient && process.env.POSTGRES_URL) {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`Invalid transaction id: ${id}`);
      }

      const { rows: txRows } = await sqlClient`SELECT * FROM transactions WHERE id = ${id}`;
      const tx = txRows.length > 0 ? txRows[0] : null;
      if (!tx) return { rowCount: 0 };

      const { rows: linkedDebts } = await sqlClient`SELECT * FROM debts WHERE linked_transaction_id = ${id}`;
      for (const debt of linkedDebts) {
        await sqlClient`DELETE FROM transactions WHERE linked_debt_id = ${debt.id}`;
        await sqlClient`DELETE FROM debts WHERE id = ${debt.id}`;
      }

      if (tx.linked_debt_id) {
        await sqlClient`DELETE FROM transactions WHERE id = ${id}`;
        await recomputeDebtFromLedgerPostgres(tx.linked_debt_id);
        return { rowCount: 1 };
      }

      return await sqlClient`DELETE FROM transactions WHERE id = ${id}`;
    } catch (e) {
      console.warn('[TrueSpend] Postgres deleteTransaction failed, fallback to memory');
    }
  }

  const index = memoryStore.transactions.findIndex(t => t.id === id);
  if (index === -1) return { rowCount: 0 };

  const tx = memoryStore.transactions[index];

  // If debts were linked to this transaction
  const linkedDebts = memoryStore.debts.filter(d => d.linked_transaction_id === id);
  for (const debt of linkedDebts) {
    memoryStore.transactions = memoryStore.transactions.filter(t => t.linked_debt_id !== debt.id);
    memoryStore.debts = memoryStore.debts.filter(d => d.id !== debt.id);
  }

  const linkedDebtId = tx.linked_debt_id;
  memoryStore.transactions.splice(index, 1);

  if (linkedDebtId) {
    recomputeDebtFromLedgerMemory(linkedDebtId);
  }

  return { rowCount: 1 };
}

async function recomputeDebtFromLedgerPostgres(debtId) {
  const { rows: debtRows } = await sqlClient`SELECT * FROM debts WHERE id = ${debtId}`;
  const debt = debtRows.length > 0 ? debtRows[0] : null;
  if (!debt) return;

  const { rows: settlementRows } = await sqlClient`
    SELECT COALESCE(SUM(amount), 0) AS settled_amount
    FROM transactions
    WHERE linked_debt_id = ${debtId}
  `;
  const settledAmount = parseFloat(settlementRows[0]?.settled_amount || 0);
  const remaining = Math.max(0, parseFloat(debt.original_amount) - settledAmount);
  const status = remaining <= 0 ? 'Cleared' : 'Pending';

  await sqlClient`
    UPDATE debts
    SET remaining_balance = ${remaining}, status = ${status}
    WHERE id = ${debtId}
  `;
}

function recomputeDebtFromLedgerMemory(debtId) {
  const debt = memoryStore.debts.find(d => d.id === debtId);
  if (!debt) return;

  const settledAmount = memoryStore.transactions
    .filter(t => t.linked_debt_id === debtId)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const remaining = Math.max(0, parseFloat(debt.original_amount) - settledAmount);
  debt.remaining_balance = remaining;
  debt.status = remaining <= 0 ? 'Cleared' : 'Pending';
}
