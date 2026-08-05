# TrueSpend API Documentation

This document provides a comprehensive guide to all the REST API endpoints available in the TrueSpend Next.js application.

## Authentication

All API endpoints (except for the `/api/auth/login` endpoint) require authentication. 

You can authenticate in two ways:
1. **Cookie-based Auth**: Send requests with a valid `auth_token` cookie (acquired via the login endpoint). This is the default when interacting with the API from the frontend.
2. **API Key/Header Auth**: Send the correct API authentication header (as verified by `verifyApiAuth` in the backend).

---

## 1. Authentication Endpoints

### 1.1. Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Description**: Authenticates a user and sets an `auth_token` cookie.
- **Request Body** (JSON):
  ```json
  {
    "username": "SanSpend",
    "password": "your_password"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true
  }
  ```
- **Response** (401 Unauthorized):
  ```json
  {
    "success": false,
    "message": "Invalid credentials"
  }
  ```

### 1.2. Logout
- **URL**: `/api/auth/logout`
- **Method**: `DELETE`
- **Description**: Logs the user out by clearing the `auth_token` cookie.
- **Response** (200 OK):
  ```json
  {
    "success": true
  }
  ```

---

## 2. Transactions

### 2.1. Get All Transactions
- **URL**: `/api/transactions`
- **Method**: `GET`
- **Description**: Retrieves a list of all transactions.
- **Response** (200 OK):
  ```json
  [
    {
      "id": 1,
      "date": "2026-08-01",
      "title": "Groceries",
      "amount": 50.00,
      "type": "expense",
      "source_wallet": "main",
      "category": "Food",
      "notes": "Weekly groceries",
      "reimbursable_amount": 0,
      "linked_contact": null
    }
  ]
  ```

### 2.2. Create Transaction
- **URL**: `/api/transactions`
- **Method**: `POST`
- **Description**: Creates a new transaction.
- **Request Body** (JSON):
  ```json
  {
    "date": "2026-08-02",
    "title": "Salary",
    "amount": 3000.00,
    "type": "income",
    "source_wallet": "main",
    "category": "Salary",
    "notes": "August salary",
    "reimbursable_amount": 0,
    "linked_contact": null
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "message": "Transaction created",
    "id": 2
  }
  ```

### 2.3. Delete Transaction
- **URL**: `/api/transactions/[id]`
- **Method**: `DELETE`
- **Description**: Deletes a transaction by its ID.
- **Path Parameters**:
  - `id` (integer): The ID of the transaction to delete.
- **Response** (200 OK):
  ```json
  {
    "message": "Transaction 2 deleted"
  }
  ```

---

## 3. Categories

### 3.1. Get All Categories
- **URL**: `/api/categories`
- **Method**: `GET`
- **Description**: Retrieves a list of all categories.
- **Response** (200 OK):
  ```json
  [
    "Food",
    "Rent",
    "Utilities"
  ]
  ```

### 3.2. Create Category
- **URL**: `/api/categories`
- **Method**: `POST`
- **Description**: Creates a new category.
- **Request Body** (JSON):
  ```json
  {
    "name": "Entertainment"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "message": "Category created"
  }
  ```
- **Response** (400 Bad Request - if it already exists):
  ```json
  {
    "error": "Category already exists"
  }
  ```

### 3.3. Delete Category
- **URL**: `/api/categories/[name]`
- **Method**: `DELETE`
- **Description**: Deletes a category by its name. Name should be URL-encoded.
- **Path Parameters**:
  - `name` (string): The URL-encoded name of the category to delete.
- **Response** (200 OK):
  ```json
  {
    "message": "Category deleted"
  }
  ```

---

## 4. Debts

### 4.1. Get All Debts
- **URL**: `/api/debts`
- **Method**: `GET`
- **Description**: Retrieves a list of all active or historical debts.
- **Response** (200 OK):
  ```json
  [
    {
      "debt_id": 1,
      "amount": 100,
      "contact": "John Doe",
      "type": "owed_to_me",
      "status": "pending"
    }
  ]
  ```

### 4.2. Create or Settle Debt
- **URL**: `/api/debts`
- **Method**: `POST`
- **Description**: Creates a new debt or settles an existing one if `debt_id` is provided.
- **Request Body (Create)**:
  ```json
  {
    "amount": 150,
    "contact": "Jane Doe",
    "type": "owed_by_me"
  }
  ```
- **Response (Create)** (201 Created):
  ```json
  {
    "message": "Debt created"
  }
  ```
- **Request Body (Settle)**:
  ```json
  {
    "debt_id": 1,
    "amount": 100
  }
  ```
- **Response (Settle)** (200 OK):
  ```json
  {
    "message": "Debt settled"
  }
  ```

---

## 5. Analytics & KPIs

### 5.1. Get KPIs
- **URL**: `/api/kpis`
- **Method**: `GET`
- **Description**: Retrieves Key Performance Indicators like total liquidity, days until payday, and daily allowance.
- **Response** (200 OK):
  ```json
  {
    "totalLiquidity": 1500.50,
    "monthlyExpenses": 800.00,
    "monthlyIncome": 3000.00,
    "daysUntilPayday": 12,
    "dailyAllowance": 45.50
  }
  ```

### 5.2. Get Expenses by Category
- **URL**: `/api/analytics/categories`
- **Method**: `GET`
- **Description**: Retrieves aggregate expense data grouped by category.
- **Response** (200 OK):
  ```json
  {
    "Food": 250.00,
    "Rent": 1000.00,
    "Utilities": 150.00
  }
  ```

### 5.3. Get Daily Cashflow
- **URL**: `/api/analytics/cashflow`
- **Method**: `GET`
- **Description**: Retrieves cashflow analytics on a daily basis.
- **Response** (200 OK):
  ```json
  [
    {
      "date": "2026-08-01",
      "income": 0,
      "expense": 50.00,
      "balance": 1500.50
    }
  ]
  ```

---

## 6. Settings

### 6.1. Get Setting by Key
- **URL**: `/api/settings/[key]`
- **Method**: `GET`
- **Description**: Retrieves a specific setting by its key.
- **Path Parameters**:
  - `key` (string): The configuration key.
- **Response** (200 OK):
  ```json
  {
    "key": "currency",
    "value": "USD"
  }
  ```

### 6.2. Update Setting
- **URL**: `/api/settings`
- **Method**: `POST`
- **Description**: Updates or creates a key-value setting pair.
- **Request Body** (JSON):
  ```json
  {
    "key": "currency",
    "value": "EUR"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "message": "Setting updated"
  }
  ```

---

## 7. Export

### 7.1. Export Transactions (CSV)
- **URL**: `/api/export`
- **Method**: `GET`
- **Description**: Exports all transactions as a CSV file. Sets `Content-Disposition` attachment to trigger a download in the browser.
- **Response** (200 OK):
  ```csv
  "id","date","title","amount","type","source_wallet","category","notes","reimbursable_amount","linked_contact"
  "1","2026-08-01","Groceries","50","expense","main","Food","Weekly groceries","0",""
  ```
