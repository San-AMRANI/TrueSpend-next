// Run this once to seed initial data from V11 report
// Usage: node scripts/seed.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'truespend.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, title TEXT,
    amount REAL NOT NULL, type TEXT NOT NULL, source_wallet TEXT NOT NULL,
    category TEXT, notes TEXT, reimbursable_amount REAL DEFAULT 0, linked_contact TEXT
  );
  CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, contact_name TEXT NOT NULL, type TEXT NOT NULL,
    original_amount REAL NOT NULL, remaining_balance REAL NOT NULL, status TEXT DEFAULT 'Pending', linked_transaction_id INTEGER
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);
`);

// Clear existing
db.exec(`DELETE FROM transactions; DELETE FROM debts; DELETE FROM sqlite_sequence WHERE name='transactions'; DELETE FROM sqlite_sequence WHERE name='debts';`);

// Settings
const setSetting = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
setSetting.run('initial_bank', '0');
setSetting.run('initial_cash', '0');
setSetting.run('payday', '25');

// Categories
const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`);
['Groceries','Dining Out','Entertainment','Transport','Utilities','Salary','ATM','Family','Grooming','Wardrobe','Income','Debts & Transfers','Debt Repayment'].forEach(c => insertCat.run(c));

const addTx = db.prepare(`INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const addDebt = db.prepare(`INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status, linked_transaction_id) VALUES (?, ?, ?, ?, 'Pending', ?)`);

const D = '2026-07-15';
function tx(date, title, amount, type, wallet, cat, notes, reimb = 0, contact = '') {
  const r = addTx.run(date, title, amount, type, wallet, cat, notes, reimb, contact);
  if (reimb > 0 && contact) addDebt.run(contact, 'Receivable', reimb, reimb, r.lastInsertRowid);
  return r.lastInsertRowid;
}

// Income
tx(D, 'Oracle R&D Center', 6036.70, 'Income', 'Bank', 'Salary', 'Salary / Payroll');
tx(D, 'Yassmine Amrani', 100.00, 'Income', 'Bank', 'Income', 'Loan repayment received');
tx(D, 'Sister', 11.00, 'Income', 'Cash', 'Income', 'Cash gift / help (+ 1 MAD cash adjustment)');

// Bank expenses
tx(D, 'Yassmine Amrani', 2100.00, 'Expense', 'Bank', 'Debts & Transfers', 'Loan repayment transfer');
tx(D, 'Marjane Bouskoura', 196.05, 'Expense', 'Bank', 'Groceries', 'Groceries, TPE');
tx(D, 'SRM Casablanca-Settat', 191.37, 'Expense', 'Bank', 'Utilities', 'Utilities');
tx(D, 'McDo Mohammed V', 60.00, 'Expense', 'Bank', 'Dining Out', 'Card, paid for friends');
tx(D, 'McDo Aeria G-64', 54.00, 'Expense', 'Bank', 'Dining Out', 'Card, 40 friends + 14 personal');
tx(D, 'Orange Maroc', 50.00, 'Expense', 'Bank', 'Utilities', 'Telecom');
tx(D, 'Ben Pause Gourm', 35.00, 'Expense', 'Bank', 'Dining Out', 'Card');
tx(D, 'Station Prestig', 30.00, 'Expense', 'Bank', 'Transport', 'Fuel, card');
tx(D, 'Boca Oracle', 26.00, 'Expense', 'Bank', 'Dining Out', 'Coffee, card');
tx(D, 'McDo Mohammed V', 21.00, 'Expense', 'Bank', 'Dining Out', 'Card');
tx(D, 'Boca Oracle Coffee', 14.00, 'Expense', 'Bank', 'Dining Out', 'Card');
tx(D, 'Boca Oracle Coffee', 7.00, 'Expense', 'Bank', 'Dining Out', 'Card');
tx(D, 'Boca Oracle', 26.00, 'Expense', 'Bank', 'Dining Out', 'Card/TPE');
tx(D, 'Boca Oracle', 57.00, 'Expense', 'Bank', 'Dining Out', 'Card/TPE');
tx(D, 'Coffee', 30.00, 'Expense', 'Bank', 'Dining Out', 'Card (Personal)');
tx(D, 'Cinema (Spider-Man)', 127.00, 'Expense', 'Bank', 'Entertainment', 'Card (50 Personal + 77 Social)');
tx(D, 'Supermarket', 105.00, 'Expense', 'Bank', 'Groceries', "Card (14 Biscuits + 91 Friend's Cat)", 91.00, 'Friend (Cat supplies)');

// Manual debt for remaining 9 MAD to make receivable = 100
db.prepare(`INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status) VALUES (?, 'Receivable', ?, ?, 'Pending')`).run('Friend (Cat supplies)', 9.00, 9.00);

// ATM withdrawals
tx(D, 'ATM Withdrawal', 400.00, 'Transfer', 'Bank', 'ATM', 'Fully allocated');
tx(D, 'ATM Withdrawal', 300.00, 'Transfer', 'Bank', 'ATM', 'Fully allocated');
tx(D, 'ATM Withdrawal', 100.00, 'Transfer', 'Bank', 'ATM', 'Fully allocated');
tx(D, 'ATM Withdrawal', 50.00, 'Transfer', 'Bank', 'ATM', '45 spent + 5 change retained');

// Cash expenses
tx(D, 'Suit rental', 300.00, 'Expense', 'Cash', 'Wardrobe', 'Ceremony / wardrobe');
tx(D, 'Loan to friend', 200.00, 'Expense', 'Cash', 'Debts & Transfers', 'Later repaid in cash', 200.00, 'Friend (200 Loan)');
tx(D, "McDonald's", 72.00, 'Expense', 'Cash', 'Dining Out', 'Food');
tx(D, 'Cash to Mom', 50.00, 'Expense', 'Cash', 'Family', 'Family');
tx(D, 'Chicken', 50.00, 'Expense', 'Cash', 'Groceries', 'Groceries');
tx(D, 'Barbershop (1)', 45.00, 'Expense', 'Cash', 'Grooming', 'Grooming');
tx(D, 'Station fuel', 35.00, 'Expense', 'Cash', 'Transport', 'Transport');
tx(D, 'Station fuel', 20.00, 'Expense', 'Cash', 'Transport', 'Transport');
tx(D, 'Coffee', 15.00, 'Expense', 'Cash', 'Dining Out', 'Food & beverage');
tx(D, 'McCafé', 14.00, 'Expense', 'Cash', 'Dining Out', 'Food & beverage');
tx(D, 'Fuel', 30.00, 'Expense', 'Cash', 'Transport', 'Cash fuel expense');
tx(D, 'Barbershop (2)', 20.00, 'Expense', 'Cash', 'Grooming', 'New Grooming (Cash)');
tx(D, 'Clothes', 190.00, 'Expense', 'Cash', 'Wardrobe', 'New Cash paid (Total 210 MAD, 20 MAD pending)');

// Clothes seller payable
db.prepare(`INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status) VALUES ('Clothes Seller', 'Payable', 20.00, 20.00, 'Pending')`).run();

// Settle the 200 MAD loan (Friend paid back)
const loanDebt = db.prepare(`SELECT id FROM debts WHERE contact_name = 'Friend (200 Loan)' AND status = 'Pending'`).get();
if (loanDebt) {
  db.prepare(`UPDATE debts SET status = 'Cleared', remaining_balance = 0 WHERE id = ?`).run(loanDebt.id);
  db.prepare(`INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes) VALUES (?, ?, ?, 'Income', 'Cash', 'Debt Repayment', ?)`).run(D, 'Settlement: Friend (200 Loan)', 200.00, 'Friend repaid 200 MAD loan');
}

console.log('✅ Database seeded successfully!');
console.log('Verifying final balances...');

const txs = db.prepare('SELECT * FROM transactions').all();
let bank = 0, cash = 0;
for (const t of txs) {
  if (t.type === 'Income') { if (t.source_wallet === 'Bank') bank += t.amount; else cash += t.amount; }
  else if (t.type === 'Expense') { if (t.source_wallet === 'Bank') bank -= t.amount; else cash -= t.amount; }
  else if (t.type === 'Transfer') { bank -= t.amount; cash += t.amount; }
}
console.log(`Bank: ${bank.toFixed(2)} (expected: 2157.28)`);
console.log(`Cash: ${cash.toFixed(2)} (expected: 20.00)`);

db.close();
