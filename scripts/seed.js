require('dotenv').config();
const { sql } = require('@vercel/postgres');

async function seed() {
  if (!process.env.POSTGRES_URL) {
    console.error('ERROR: POSTGRES_URL must be set in .env');
    process.exit(1);
  }

  console.log('Connected to Vercel Postgres (Neon) database.');

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
      linked_contact VARCHAR(255)
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
  await sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT);`;
  await sql`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL);`;

  await sql`TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;`;
  await sql`TRUNCATE TABLE debts RESTART IDENTITY CASCADE;`;

  const settings = [['initial_bank','0'], ['initial_cash','0'], ['payday','25']];
  for (const [k, v] of settings) {
    await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  }

  const cats = ['Groceries','Dining Out','Entertainment','Transport','Utilities','Salary','ATM','Family','Grooming','Wardrobe','Income','Debts & Transfers','Debt Repayment'];
  for (const c of cats) {
    await sql`INSERT INTO categories (name) VALUES (${c}) ON CONFLICT (name) DO NOTHING`;
  }

  const D = '2026-07-15';
  async function tx(date, title, amount, type, wallet, cat, notes, reimb = 0, contact = '') {
    const { rows } = await sql`
      INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact) 
      VALUES (${date}, ${title}, ${amount}, ${type}, ${wallet}, ${cat}, ${notes}, ${reimb}, ${contact})
      RETURNING id
    `;
    const insertId = rows[0].id;
    
    if (reimb > 0 && contact) {
      await sql`
        INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status, linked_transaction_id) 
        VALUES (${contact}, 'Receivable', ${reimb}, ${reimb}, 'Pending', ${insertId})
      `;
    }
    return insertId;
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

  await sql`INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status) VALUES ('Clothes Seller', 'Payable', 20.00, 20.00, 'Pending')`;
  await sql`INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status) VALUES ('Friend (Cat supplies)', 'Receivable', 9.00, 9.00, 'Pending')`;

  const { rows: loanDebtRes } = await sql`SELECT id FROM debts WHERE contact_name = 'Friend (200 Loan)' AND status = 'Pending'`;
  if (loanDebtRes.length > 0) {
    const loanDebt = loanDebtRes[0];
    await sql`UPDATE debts SET status = 'Cleared', remaining_balance = 0 WHERE id = ${loanDebt.id}`;
    await sql`INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes) VALUES (${D}, 'Settlement: Friend (200 Loan)', 200.00, 'Income', 'Cash', 'Debt Repayment', 'Friend repaid 200 MAD cash loan in full')`;
  }

  console.log('Verifying balances vs V11 report...');
  const { rows: txs } = await sql`SELECT * FROM transactions`;
  let bank = 0, cash = 0;
  for (const t of txs) {
    const amt = parseFloat(t.amount);
    if (t.type === 'Income') { if (t.source_wallet === 'Bank') bank += amt; else cash += amt; }
    else if (t.type === 'Expense') { if (t.source_wallet === 'Bank') bank -= amt; else cash -= amt; }
    else if (t.type === 'Transfer') { bank -= amt; cash += amt; }
  }
  console.log('Bank:  ' + bank.toFixed(2) + ' MAD  (expected: 2,157.28)');
  console.log('Cash:  ' + cash.toFixed(2) + ' MAD  (expected:    20.00)');
  console.log('Total: ' + (bank + cash).toFixed(2) + ' MAD  (expected: 2,177.28)');
  
  const { rows: debts } = await sql`SELECT * FROM debts WHERE status = 'Pending'`;
  const receivables = debts.filter(d => d.type === 'Receivable').reduce((s, d) => s + parseFloat(d.remaining_balance), 0);
  const payables = debts.filter(d => d.type === 'Payable').reduce((s, d) => s + parseFloat(d.remaining_balance), 0);
  console.log('Receivables: ' + receivables.toFixed(2) + ' MAD  (expected: 100.00)');
  console.log('Payables:    ' + payables.toFixed(2) + ' MAD  (expected:  20.00)');
  console.log('Net position: ' + (bank + cash + receivables - payables).toFixed(2) + ' MAD  (expected: 2,257.28)');
}

seed().catch(console.error);
