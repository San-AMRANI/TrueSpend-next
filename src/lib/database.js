import { sql } from '@vercel/postgres';

export async function initDb() {
  await sql`
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
  await sql`
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
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL
    );
  `;

  const settings = [['initial_bank','0'], ['initial_cash','0'], ['payday','25']];
  for (const [k, v] of settings) {
    await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
  }

  const cats = ['Groceries','Dining Out','Entertainment','Transport','Utilities','Salary','ATM','Family','Grooming','Wardrobe','Income','Debts & Transfers','Debt Repayment'];
  for (const c of cats) {
    await sql`INSERT INTO categories (name) VALUES (${c}) ON CONFLICT (name) DO NOTHING`;
  }
}

export async function getSetting(key) {
  const { rows } = await sql`SELECT value FROM settings WHERE key = ${key}`;
  return rows.length > 0 ? rows[0].value : null;
}

export async function updateSetting(key, value) {
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${String(value)}) 
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

export async function getCategories() {
  const { rows } = await sql`SELECT name FROM categories ORDER BY name`;
  return rows.map(r => r.name);
}

export async function addCategory(name) {
  try {
    await sql`INSERT INTO categories (name) VALUES (${name})`;
    return true;
  } catch(e) {
    return false;
  }
}

export async function deleteCategory(name) {
  await sql`DELETE FROM categories WHERE name = ${name}`;
}

export async function addTransaction({ date, title, amount, type, source_wallet, category, notes = '', reimbursable_amount = 0, linked_contact = '' }) {
  const { rows } = await sql`
    INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact)
    VALUES (${date}, ${title}, ${amount}, ${type}, ${source_wallet}, ${category}, ${notes}, ${reimbursable_amount}, ${linked_contact})
    RETURNING id
  `;
  const insertId = rows[0].id;

  if (reimbursable_amount > 0 && linked_contact) {
    await sql`
      INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status, linked_transaction_id)
      VALUES (${linked_contact}, 'Receivable', ${reimbursable_amount}, ${reimbursable_amount}, 'Pending', ${insertId})
    `;
  }
  return insertId;
}

async function getTransactionById(id) {
  const { rows } = await sql`SELECT * FROM transactions WHERE id = ${id}`;
  return rows.length > 0 ? rows[0] : null;
}

async function getDebtByLinkedTransactionId(transactionId) {
  const { rows } = await sql`SELECT * FROM debts WHERE linked_transaction_id = ${transactionId}`;
  return rows;
}

async function getDebtById(debtId) {
  const { rows } = await sql`SELECT * FROM debts WHERE id = ${debtId}`;
  return rows.length > 0 ? rows[0] : null;
}

async function recomputeDebtFromLedger(debtId) {
  const debt = await getDebtById(debtId);
  if (!debt) return;

  const { rows: settlementRows } = await sql`
    SELECT COALESCE(SUM(amount), 0) AS settled_amount
    FROM transactions
    WHERE linked_debt_id = ${debtId}
  `;
  const settledAmount = parseFloat(settlementRows[0]?.settled_amount || 0);
  const remaining = Math.max(0, parseFloat(debt.original_amount) - settledAmount);
  const status = remaining <= 0 ? 'Cleared' : 'Pending';

  await sql`
    UPDATE debts
    SET remaining_balance = ${remaining}, status = ${status}
    WHERE id = ${debtId}
  `;
}

export async function deleteTransaction(id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid transaction id: ${id}`);
  }

  const tx = await getTransactionById(id);
  if (!tx) {
    return { rowCount: 0 };
  }

  const linkedDebts = await getDebtByLinkedTransactionId(id);
  for (const debt of linkedDebts) {
    await sql`DELETE FROM transactions WHERE linked_debt_id = ${debt.id}`;
    await sql`DELETE FROM debts WHERE id = ${debt.id}`;
  }

  if (tx.linked_debt_id) {
    await sql`DELETE FROM transactions WHERE id = ${id}`;
    await recomputeDebtFromLedger(tx.linked_debt_id);
    return { rowCount: 1 };
  }

  if (tx.category === 'Debt Repayment') {
    const inferredDebtId = await inferDebtIdFromSettlementTransaction(tx);
    if (inferredDebtId) {
      await sql`UPDATE transactions SET linked_debt_id = ${inferredDebtId} WHERE id = ${id}`;
      await sql`DELETE FROM transactions WHERE id = ${id}`;
      await recomputeDebtFromLedger(inferredDebtId);
      return { rowCount: 1 };
    }
  }

  return sql`DELETE FROM transactions WHERE id = ${id}`;
}

async function inferDebtIdFromSettlementTransaction(tx) {
  const contactFromTitle = (tx.title || '').replace(/^Settlement:\s*/i, '').trim();
  const contactFromNotes = (tx.notes || '').match(/with\s+(.+)$/i)?.[1]?.trim();
  const contactName = contactFromTitle || contactFromNotes || null;
  if (!contactName) return null;

  const { rows } = await sql`
    SELECT id
    FROM debts
    WHERE contact_name = ${contactName}
    ORDER BY id DESC
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0].id : null;
}

export async function getTransactions() {
  const { rows } = await sql`SELECT * FROM transactions ORDER BY date DESC, id DESC`;
  return rows;
}

export async function addDebt({ contact_name, type, amount }) {
  await sql`
    INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status)
    VALUES (${contact_name}, ${type}, ${amount}, ${amount}, 'Pending')
  `;
}

export async function getDebts() {
  const { rows } = await sql`SELECT * FROM debts ORDER BY id DESC`;
  return rows;
}

export async function settleDebt({ debt_id, wallet, amount_paid = null }) {
  const { rows } = await sql`SELECT * FROM debts WHERE id = ${debt_id}`;
  const debt = rows.length > 0 ? rows[0] : null;
  if (!debt) return;

  const remaining = parseFloat(debt.remaining_balance);
  const actual = (amount_paid === null || parseFloat(amount_paid) >= remaining) ? remaining : parseFloat(amount_paid);
  const isFullSettlement = actual >= remaining;

  if (isFullSettlement) {
    await sql`UPDATE debts SET status = 'Cleared', remaining_balance = 0 WHERE id = ${debt_id}`;
  } else {
    await sql`UPDATE debts SET remaining_balance = ${remaining - actual} WHERE id = ${debt_id}`;
  }

  const txType = debt.type === 'Receivable' ? 'Income' : 'Expense';
  const today = new Date().toISOString().split('T')[0];
  await sql`
    INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, linked_debt_id)
    VALUES (${today}, ${`Settlement: ${debt.contact_name}`}, ${actual}, ${txType}, ${wallet}, 'Debt Repayment', ${`Settled ${debt.type} with ${debt.contact_name}`}, ${debt_id})
  `;
}
