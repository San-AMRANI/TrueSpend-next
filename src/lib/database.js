const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const IS_VERCEL = !!process.env.VERCEL;
let DB_PATH;

if (IS_VERCEL) {
  const TMP_DB_PATH = path.join('/tmp', 'truespend.db');
  const BUNDLED_DB_PATH = path.join(process.cwd(), 'data', 'truespend.db');

  if (!fs.existsSync(TMP_DB_PATH)) {
    try {
      if (fs.existsSync(BUNDLED_DB_PATH)) {
        fs.copyFileSync(BUNDLED_DB_PATH, TMP_DB_PATH);
        
        // Copy WAL files if they exist
        const BUNDLED_SHM = BUNDLED_DB_PATH + '-shm';
        const BUNDLED_WAL = BUNDLED_DB_PATH + '-wal';
        if (fs.existsSync(BUNDLED_SHM)) {
          fs.copyFileSync(BUNDLED_SHM, TMP_DB_PATH + '-shm');
        }
        if (fs.existsSync(BUNDLED_WAL)) {
          fs.copyFileSync(BUNDLED_WAL, TMP_DB_PATH + '-wal');
        }
      }
    } catch (err) {
      console.error('Failed to copy database to /tmp:', err);
    }
  }
  DB_PATH = TMP_DB_PATH;
} else {
  const DB_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  DB_PATH = path.join(DB_DIR, 'truespend.db');
}

let db;
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDb(db);
  }
  return db;
}

function initDb(db) {
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_name TEXT NOT NULL,
      type TEXT NOT NULL,
      original_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      status TEXT DEFAULT 'Pending',
      linked_transaction_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);

  // Migrate: add title if missing
  try { db.exec(`ALTER TABLE transactions ADD COLUMN title TEXT`); } catch(e) {}
  try { db.exec(`ALTER TABLE debts ADD COLUMN linked_transaction_id INTEGER`); } catch(e) {}

  // Default settings
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  [['initial_bank','0'], ['initial_cash','0'], ['payday','25']].forEach(([k,v]) => insertSetting.run(k, v));

  // Default categories
  const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`);
  ['Groceries','Dining Out','Entertainment','Transport','Utilities','Salary','ATM','Family',
   'Grooming','Wardrobe','Income','Debts & Transfers','Debt Repayment'].forEach(c => insertCat.run(c));
}

// -------- SETTINGS --------
function getSetting(key) {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  return row ? row.value : null;
}

function updateSetting(key, value) {
  const db = getDb();
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, String(value));
}

// -------- CATEGORIES --------
function getCategories() {
  return getDb().prepare(`SELECT name FROM categories ORDER BY name`).all().map(r => r.name);
}

function addCategory(name) {
  try {
    getDb().prepare(`INSERT INTO categories (name) VALUES (?)`).run(name);
    return true;
  } catch(e) { return false; }
}

function deleteCategory(name) {
  getDb().prepare(`DELETE FROM categories WHERE name = ?`).run(name);
}

// -------- TRANSACTIONS --------
function addTransaction({ date, title, amount, type, source_wallet, category, notes = '', reimbursable_amount = 0, linked_contact = '' }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact);

  if (reimbursable_amount > 0 && linked_contact) {
    db.prepare(`
      INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status, linked_transaction_id)
      VALUES (?, 'Receivable', ?, ?, 'Pending', ?)
    `).run(linked_contact, reimbursable_amount, reimbursable_amount, result.lastInsertRowid);
  }
  return result.lastInsertRowid;
}

function deleteTransaction(id) {
  const db = getDb();
  db.prepare(`DELETE FROM debts WHERE linked_transaction_id = ?`).run(id);
  db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id);
}

function getTransactions() {
  return getDb().prepare(`SELECT * FROM transactions ORDER BY date DESC, id DESC`).all();
}

// -------- DEBTS --------
function addDebt({ contact_name, type, amount }) {
  getDb().prepare(`
    INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status)
    VALUES (?, ?, ?, ?, 'Pending')
  `).run(contact_name, type, amount, amount);
}

function getDebts() {
  return getDb().prepare(`SELECT * FROM debts ORDER BY id DESC`).all();
}

function settleDebt({ debt_id, wallet, amount_paid = null }) {
  const db = getDb();
  const debt = db.prepare(`SELECT * FROM debts WHERE id = ?`).get(debt_id);
  if (!debt) return;

  const actual = (amount_paid === null || amount_paid >= debt.remaining_balance) ? debt.remaining_balance : amount_paid;
  const isFullSettlement = actual >= debt.remaining_balance;

  if (isFullSettlement) {
    db.prepare(`UPDATE debts SET status = 'Cleared', remaining_balance = 0 WHERE id = ?`).run(debt_id);
  } else {
    db.prepare(`UPDATE debts SET remaining_balance = ? WHERE id = ?`).run(debt.remaining_balance - actual, debt_id);
  }

  const txType = debt.type === 'Receivable' ? 'Income' : 'Expense';
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes)
    VALUES (?, ?, ?, ?, ?, 'Debt Repayment', ?)
  `).run(today, `Settlement: ${debt.contact_name}`, actual, txType, wallet, `Settled ${debt.type} with ${debt.contact_name}`);
}

module.exports = { getSetting, updateSetting, getCategories, addCategory, deleteCategory, addTransaction, deleteTransaction, getTransactions, addDebt, getDebts, settleDebt };
