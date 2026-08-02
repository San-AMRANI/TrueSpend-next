import { createClient } from '@libsql/client';

const IS_VERCEL = !!process.env.VERCEL;

let db;
export function getDb() {
  if (!db) {
    if (IS_VERCEL) {
      if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
        throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set on Vercel.');
      }
      db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      const path = require('path');
      const fs = require('fs');
      const DB_DIR = path.join(process.cwd(), 'data');
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
      const DB_PATH = path.join(DB_DIR, 'truespend.db');
      
      db = createClient({
        url: `file:${DB_PATH}`,
      });
    }
  }
  return db;
}

export async function initDb() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      source_wallet TEXT NOT NULL,
      category TEXT,
      notes TEXT,
      reimbursable_amount REAL DEFAULT 0,
      linked_contact TEXT
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_name TEXT NOT NULL,
      type TEXT NOT NULL,
      original_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      status TEXT DEFAULT 'Pending',
      linked_transaction_id INTEGER
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);

  try { await db.execute(`ALTER TABLE transactions ADD COLUMN title TEXT`); } catch(e) {}
  try { await db.execute(`ALTER TABLE debts ADD COLUMN linked_transaction_id INTEGER`); } catch(e) {}

  const settings = [['initial_bank','0'], ['initial_cash','0'], ['payday','25']];
  for (const [k, v] of settings) {
    await db.execute({ sql: `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, args: [k, v] });
  }

  const cats = ['Groceries','Dining Out','Entertainment','Transport','Utilities','Salary','ATM','Family','Grooming','Wardrobe','Income','Debts & Transfers','Debt Repayment'];
  for (const c of cats) {
    await db.execute({ sql: `INSERT OR IGNORE INTO categories (name) VALUES (?)`, args: [c] });
  }
}

export async function getSetting(key) {
  const db = getDb();
  const res = await db.execute({ sql: `SELECT value FROM settings WHERE key = ?`, args: [key] });
  return res.rows.length > 0 ? res.rows[0].value : null;
}

export async function updateSetting(key, value) {
  const db = getDb();
  await db.execute({ sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, args: [key, String(value)] });
}

export async function getCategories() {
  const db = getDb();
  const res = await db.execute(`SELECT name FROM categories ORDER BY name`);
  return res.rows.map(r => r.name);
}

export async function addCategory(name) {
  const db = getDb();
  try {
    await db.execute({ sql: `INSERT INTO categories (name) VALUES (?)`, args: [name] });
    return true;
  } catch(e) {
    return false;
  }
}

export async function deleteCategory(name) {
  const db = getDb();
  await db.execute({ sql: `DELETE FROM categories WHERE name = ?`, args: [name] });
}

export async function addTransaction({ date, title, amount, type, source_wallet, category, notes = '', reimbursable_amount = 0, linked_contact = '' }) {
  const db = getDb();
  const result = await db.execute({
    sql: `
      INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact]
  });

  if (reimbursable_amount > 0 && linked_contact) {
    await db.execute({
      sql: `
        INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status, linked_transaction_id)
        VALUES (?, 'Receivable', ?, ?, 'Pending', ?)
      `,
      args: [linked_contact, reimbursable_amount, reimbursable_amount, result.lastInsertRowid.toString()]
    });
  }
  return result.lastInsertRowid;
}

export async function deleteTransaction(id) {
  const db = getDb();
  await db.execute({ sql: `DELETE FROM debts WHERE linked_transaction_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM transactions WHERE id = ?`, args: [id] });
}

export async function getTransactions() {
  const db = getDb();
  const res = await db.execute(`SELECT * FROM transactions ORDER BY date DESC, id DESC`);
  return res.rows;
}

export async function addDebt({ contact_name, type, amount }) {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status)
      VALUES (?, ?, ?, ?, 'Pending')
    `,
    args: [contact_name, type, amount, amount]
  });
}

export async function getDebts() {
  const db = getDb();
  const res = await db.execute(`SELECT * FROM debts ORDER BY id DESC`);
  return res.rows;
}

export async function settleDebt({ debt_id, wallet, amount_paid = null }) {
  const db = getDb();
  const res = await db.execute({ sql: `SELECT * FROM debts WHERE id = ?`, args: [debt_id] });
  const debt = res.rows.length > 0 ? res.rows[0] : null;
  if (!debt) return;

  const actual = (amount_paid === null || amount_paid >= debt.remaining_balance) ? debt.remaining_balance : amount_paid;
  const isFullSettlement = actual >= debt.remaining_balance;

  if (isFullSettlement) {
    await db.execute({ sql: `UPDATE debts SET status = 'Cleared', remaining_balance = 0 WHERE id = ?`, args: [debt_id] });
  } else {
    await db.execute({ sql: `UPDATE debts SET remaining_balance = ? WHERE id = ?`, args: [debt.remaining_balance - actual, debt_id] });
  }

  const txType = debt.type === 'Receivable' ? 'Income' : 'Expense';
  const today = new Date().toISOString().split('T')[0];
  await db.execute({
    sql: `
      INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes)
      VALUES (?, ?, ?, ?, ?, 'Debt Repayment', ?)
    `,
    args: [today, `Settlement: ${debt.contact_name}`, actual, txType, wallet, `Settled ${debt.type} with ${debt.contact_name}`]
  });
}
