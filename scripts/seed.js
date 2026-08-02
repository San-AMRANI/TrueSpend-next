// Seed database from V11 Full Report (July 2026)
// Usage: node scripts/seed.js

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'truespend.db');

const db = createClient({ url: `file:${DB_PATH}` });

async function seed() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, title TEXT,
      amount REAL NOT NULL, type TEXT NOT NULL, source_wallet TEXT NOT NULL,
      category TEXT, notes TEXT, reimbursable_amount REAL DEFAULT 0, linked_contact TEXT
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, contact_name TEXT NOT NULL, type TEXT NOT NULL,
      original_amount REAL NOT NULL, remaining_balance REAL NOT NULL, status TEXT DEFAULT 'Pending', linked_transaction_id INTEGER
    );
  `);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);`);
  await db.execute(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);`);

  await db.execute(`DELETE FROM transactions;`);
  await db.execute(`DELETE FROM debts;`);
  await db.execute(`DELETE FROM sqlite_sequence WHERE name='transactions';`);
  await db.execute(`DELETE FROM sqlite_sequence WHERE name='debts';`);

  await db.execute({ sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, args: ['initial_bank', '0'] });
  await db.execute({ sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, args: ['initial_cash', '0'] });
  await db.execute({ sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, args: ['payday', '25'] });

  const cats = ['Groceries','Dining Out','Entertainment','Transport','Utilities','Salary','ATM','Family','Grooming','Wardrobe','Income','Debts & Transfers','Debt Repayment'];
  for (const c of cats) {
    await db.execute({ sql: `INSERT OR IGNORE INTO categories (name) VALUES (?)`, args: [c] });
  }

  const D = '2026-07-15';
  async function tx(date, title, amount, type, wallet, cat, notes, reimb = 0, contact = '') {
    const r = await db.execute({
      sql: `INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [date, title, amount, type, wallet, cat, notes, reimb, contact]
    });
    if (reimb > 0 && contact) {
      await db.execute({
        sql: `INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status, linked_transaction_id) VALUES (?, 'Receivable', ?, ?, 'Pending', ?)`,
        args: [contact, reimb, reimb, r.lastInsertRowid.toString()]
      });
    }
    return r.lastInsertRowid;
  }

  await tx(D, 'Oracle R&D Center', 6036.70, 'Income', 'Bank', 'Salary', 'Salary / Payroll');
  await tx(D, 'Yassmine Amrani', 100.00, 'Income', 'Bank', 'Income', 'Loan repayment received');
  await tx(D, 'Sister', 11.00, 'Income', 'Cash', 'Income', 'Cash gift / help (+1 MAD cash adjustment)');

  await tx(D, 'Yassmine Amrani', 2100.00, 'Expense', 'Bank', 'Debts & Transfers', 'Loan repayment transfer');
  await tx(D, 'Marjane Bouskoura', 196.05, 'Expense', 'Bank', 'Groceries', 'Groceries, TPE');
  await tx(D, 'SRM Casablanca-Settat', 191.37, 'Expense', 'Bank', 'Utilities', 'Utilities');
  await tx(D, 'McDo Mohammed V', 60.00, 'Expense', 'Bank', 'Dining Out', 'Card, paid for friends');
  await tx(D, 'McDo Aeria G-64', 54.00, 'Expense', 'Bank', 'Dining Out', 'Card, 40 MAD friends + 14 MAD personal');
  await tx(D, 'Orange Maroc', 50.00, 'Expense', 'Bank', 'Utilities', 'Telecom');
  await tx(D, 'Ben Pause Gourm', 35.00, 'Expense', 'Bank', 'Dining Out', 'Card');
  await tx(D, 'Station Prestig', 30.00, 'Expense', 'Bank', 'Transport', 'Fuel, card');
  await tx(D, 'Boca Oracle', 26.00, 'Expense', 'Bank', 'Dining Out', 'Coffee, card');
  await tx(D, 'McDo Mohammed V', 21.00, 'Expense', 'Bank', 'Dining Out', 'Card');
  await tx(D, 'Boca Oracle Coffee', 14.00, 'Expense', 'Bank', 'Dining Out', 'Card');
  await tx(D, 'Boca Oracle Coffee', 7.00, 'Expense', 'Bank', 'Dining Out', 'Card');
  await tx(D, 'Boca Oracle', 26.00, 'Expense', 'Bank', 'Dining Out', 'Card/TPE');
  await tx(D, 'Boca Oracle', 57.00, 'Expense', 'Bank', 'Dining Out', 'Card/TPE');
  await tx(D, 'Coffee', 30.00, 'Expense', 'Bank', 'Dining Out', 'Card (Personal)');
  await tx(D, 'Cinema (Spider-Man)', 127.00, 'Expense', 'Bank', 'Entertainment', 'Card (50 MAD personal + 77 MAD social)');
  await tx(D, 'Supermarket', 105.00, 'Expense', 'Bank', 'Groceries', "Card (14 MAD biscuits + 91 MAD friend's cat supplies)", 91.00, 'Friend (Cat supplies)');

  await tx(D, 'MehDi Card Withdrawal', 400.00, 'Transfer', 'Bank', 'ATM', 'Fully allocated');
  await tx(D, 'Suit Rental Withdrawal', 300.00, 'Transfer', 'Bank', 'ATM', 'Fully allocated');
  await tx(D, 'Mom & Chicken Withdrawal', 100.00, 'Transfer', 'Bank', 'ATM', 'Fully allocated');
  await tx(D, 'Barbershop Withdrawal', 50.00, 'Transfer', 'Bank', 'ATM', '45 MAD spent + 5 MAD change retained');

  await tx(D, 'Suit Rental', 300.00, 'Expense', 'Cash', 'Wardrobe', 'Ceremony / wardrobe');
  await tx(D, 'Loan to Friend', 200.00, 'Expense', 'Cash', 'Debts & Transfers', 'Cash loan - later repaid in full', 200.00, 'Friend (200 Loan)');
  await tx(D, "McDonald's", 72.00, 'Expense', 'Cash', 'Dining Out', 'Food');
  await tx(D, 'Cash to Mom', 50.00, 'Expense', 'Cash', 'Family', 'Family assistance');
  await tx(D, 'Chicken', 50.00, 'Expense', 'Cash', 'Groceries', 'Groceries');
  await tx(D, 'Barbershop (1)', 45.00, 'Expense', 'Cash', 'Grooming', 'Grooming');
  await tx(D, 'Station Fuel', 35.00, 'Expense', 'Cash', 'Transport', 'Transport');
  await tx(D, 'Station Fuel', 20.00, 'Expense', 'Cash', 'Transport', 'Transport');
  await tx(D, 'Coffee', 15.00, 'Expense', 'Cash', 'Dining Out', 'Food & beverage');
  await tx(D, 'McCafe', 14.00, 'Expense', 'Cash', 'Dining Out', 'Food & beverage');
  await tx(D, 'Fuel', 30.00, 'Expense', 'Cash', 'Transport', 'Cash fuel expense');
  await tx(D, 'Barbershop (2)', 20.00, 'Expense', 'Cash', 'Grooming', 'Grooming (Cash)');
  await tx(D, 'Clothes', 190.00, 'Expense', 'Cash', 'Wardrobe', 'Cash paid (total 210 MAD; 20 MAD pending to seller)');

  await db.execute({ sql: `INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status) VALUES ('Clothes Seller', 'Payable', 20.00, 20.00, 'Pending')`, args: [] });
  await db.execute({ sql: `INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status) VALUES ('Friend (Cat supplies)', 'Receivable', 9.00, 9.00, 'Pending')`, args: [] });

  const loanDebtRes = await db.execute(`SELECT id FROM debts WHERE contact_name = 'Friend (200 Loan)' AND status = 'Pending'`);
  if (loanDebtRes.rows.length > 0) {
    const loanDebt = loanDebtRes.rows[0];
    await db.execute({ sql: `UPDATE debts SET status = 'Cleared', remaining_balance = 0 WHERE id = ?`, args: [loanDebt.id] });
    await db.execute({ sql: `INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes) VALUES (?, ?, ?, 'Income', 'Cash', 'Debt Repayment', ?)`, args: [D, 'Settlement: Friend (200 Loan)', 200.00, 'Friend repaid 200 MAD cash loan in full'] });
  }

  console.log('Verifying balances vs V11 report...');
  const txs = await db.execute('SELECT * FROM transactions');
  let bank = 0, cash = 0;
  for (const t of txs.rows) {
    if (t.type === 'Income') { if (t.source_wallet === 'Bank') bank += t.amount; else cash += t.amount; }
    else if (t.type === 'Expense') { if (t.source_wallet === 'Bank') bank -= t.amount; else cash -= t.amount; }
    else if (t.type === 'Transfer') { bank -= t.amount; cash += t.amount; }
  }
  console.log('Bank:  ' + bank.toFixed(2) + ' MAD  (expected: 2,157.28)');
  console.log('Cash:  ' + cash.toFixed(2) + ' MAD  (expected:    20.00)');
  console.log('Total: ' + (bank + cash).toFixed(2) + ' MAD  (expected: 2,177.28)');
  const debtsRes = await db.execute(`SELECT * FROM debts WHERE status = 'Pending'`);
  const debts = debtsRes.rows;
  const receivables = debts.filter(d => d.type === 'Receivable').reduce((s, d) => s + d.remaining_balance, 0);
  const payables = debts.filter(d => d.type === 'Payable').reduce((s, d) => s + d.remaining_balance, 0);
  console.log('Receivables: ' + receivables.toFixed(2) + ' MAD  (expected: 100.00)');
  console.log('Payables:    ' + payables.toFixed(2) + ' MAD  (expected:  20.00)');
  console.log('Net position: ' + (bank + cash + receivables - payables).toFixed(2) + ' MAD  (expected: 2,257.28)');
}

seed().catch(console.error);
