import mysql from 'mysql2/promise';

let pool;

export function getDb() {
  if (!pool) {
    if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER) {
      throw new Error('MySQL connection variables (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE) must be set.');
    }
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true, // Need this for initDb
    });
  }
  return pool;
}

export async function initDb() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      amount DOUBLE NOT NULL,
      type VARCHAR(50) NOT NULL,
      source_wallet VARCHAR(50) NOT NULL,
      category VARCHAR(255),
      notes TEXT,
      reimbursable_amount DOUBLE DEFAULT 0,
      linked_contact VARCHAR(255)
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS debts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contact_name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      original_amount DOUBLE NOT NULL,
      remaining_balance DOUBLE NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending',
      linked_transaction_id INT
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL
    );
  `);

  try { await db.query(`ALTER TABLE transactions ADD COLUMN title VARCHAR(255)`); } catch(e) {}
  try { await db.query(`ALTER TABLE debts ADD COLUMN linked_transaction_id INT`); } catch(e) {}

  const settings = [['initial_bank','0'], ['initial_cash','0'], ['payday','25']];
  for (const [k, v] of settings) {
    await db.query(`INSERT IGNORE INTO settings (\`key\`, value) VALUES (?, ?)`, [k, v]);
  }

  const cats = ['Groceries','Dining Out','Entertainment','Transport','Utilities','Salary','ATM','Family','Grooming','Wardrobe','Income','Debts & Transfers','Debt Repayment'];
  for (const c of cats) {
    await db.query(`INSERT IGNORE INTO categories (name) VALUES (?)`, [c]);
  }
}

export async function getSetting(key) {
  const db = getDb();
  const [rows] = await db.query(`SELECT value FROM settings WHERE \`key\` = ?`, [key]);
  return rows.length > 0 ? rows[0].value : null;
}

export async function updateSetting(key, value) {
  const db = getDb();
  await db.query(`REPLACE INTO settings (\`key\`, value) VALUES (?, ?)`, [key, String(value)]);
}

export async function getCategories() {
  const db = getDb();
  const [rows] = await db.query(`SELECT name FROM categories ORDER BY name`);
  return rows.map(r => r.name);
}

export async function addCategory(name) {
  const db = getDb();
  try {
    await db.query(`INSERT INTO categories (name) VALUES (?)`, [name]);
    return true;
  } catch(e) {
    return false;
  }
}

export async function deleteCategory(name) {
  const db = getDb();
  await db.query(`DELETE FROM categories WHERE name = ?`, [name]);
}

export async function addTransaction({ date, title, amount, type, source_wallet, category, notes = '', reimbursable_amount = 0, linked_contact = '' }) {
  const db = getDb();
  const [result] = await db.query(
    `INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [date, title, amount, type, source_wallet, category, notes, reimbursable_amount, linked_contact]
  );

  if (reimbursable_amount > 0 && linked_contact) {
    await db.query(
      `INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status, linked_transaction_id)
       VALUES (?, 'Receivable', ?, ?, 'Pending', ?)`,
      [linked_contact, reimbursable_amount, reimbursable_amount, result.insertId]
    );
  }
  return result.insertId;
}

export async function deleteTransaction(id) {
  const db = getDb();
  await db.query(`DELETE FROM debts WHERE linked_transaction_id = ?`, [id]);
  await db.query(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export async function getTransactions() {
  const db = getDb();
  const [rows] = await db.query(`SELECT * FROM transactions ORDER BY date DESC, id DESC`);
  return rows;
}

export async function addDebt({ contact_name, type, amount }) {
  const db = getDb();
  await db.query(
    `INSERT INTO debts (contact_name, type, original_amount, remaining_balance, status)
     VALUES (?, ?, ?, ?, 'Pending')`,
    [contact_name, type, amount, amount]
  );
}

export async function getDebts() {
  const db = getDb();
  const [rows] = await db.query(`SELECT * FROM debts ORDER BY id DESC`);
  return rows;
}

export async function settleDebt({ debt_id, wallet, amount_paid = null }) {
  const db = getDb();
  const [rows] = await db.query(`SELECT * FROM debts WHERE id = ?`, [debt_id]);
  const debt = rows.length > 0 ? rows[0] : null;
  if (!debt) return;

  const actual = (amount_paid === null || amount_paid >= debt.remaining_balance) ? debt.remaining_balance : amount_paid;
  const isFullSettlement = actual >= debt.remaining_balance;

  if (isFullSettlement) {
    await db.query(`UPDATE debts SET status = 'Cleared', remaining_balance = 0 WHERE id = ?`, [debt_id]);
  } else {
    await db.query(`UPDATE debts SET remaining_balance = ? WHERE id = ?`, [debt.remaining_balance - actual, debt_id]);
  }

  const txType = debt.type === 'Receivable' ? 'Income' : 'Expense';
  const today = new Date().toISOString().split('T')[0];
  await db.query(
    `INSERT INTO transactions (date, title, amount, type, source_wallet, category, notes)
     VALUES (?, ?, ?, ?, ?, 'Debt Repayment', ?)`,
    [today, `Settlement: ${debt.contact_name}`, actual, txType, wallet, `Settled ${debt.type} with ${debt.contact_name}`]
  );
}
