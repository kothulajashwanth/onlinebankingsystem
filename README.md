# Secure Online Banking and Fund Transfer System
> **College Java Lab Project**  
> **Architecture:** Full-Stack Java Application (Java + JDBC + MySQL + Web Frontend)  
> **Status:** Production-Ready Real Banking System (ZERO Mock Data)

---

## 📌 Project Overview

The **Secure Online Banking and Fund Transfer System** is an enterprise-grade digital banking web application engineered for college laboratory demonstrations and academic viva evaluations.

The system is now completely connected to a **real MySQL database (`secure_banking`)** through **Java JDBC**. All mock data, fake accounts, sample users, and simulated transactions have been permanently removed. Every operation performed in the user interface directly reads from and commits to the database.

---

## 🏛️ System Architecture

```
User Browser / UI
       │  (JSON / HTTP REST)
       ▼
Java HTTP Server (com.banking.Main on port 8080)
       │
Service Layer (AuthService, AccountService, TransferService)
       │
Security & Validation (PasswordHasher, SessionManager, InputValidator)
       │
DAO Layer (UserDAO, AccountDAO, TransactionDAO)
       │  (PreparedStatements & ACID Transactions)
       ▼
JDBC Driver (MySQL Connector/J)
       │
MySQL Database (secure_banking)
```

---

## 🗄️ Database Tables (`secure_banking`)

| Table Name | Purpose | Key Attributes |
|---|---|---|
| **`users`** | Real registered customer records | `id` (PK), `full_name`, `email` (UNIQUE), `phone`, `date_of_birth`, `address`, `username` (UNIQUE), `password_hash`, `salt`, `role`, `created_at` |
| **`accounts`** | Real customer bank accounts | `id` (PK), `user_id` (FK), `account_number` (UNIQUE), `account_type`, `balance` (`DECIMAL(15,2)`), `status`, `ifsc_code`, `branch_name`, `daily_limit` |
| **`transactions`** | Immutable financial audit ledger | `id` (PK), `transaction_id` (UNIQUE), `sender_account`, `receiver_account`, `sender_name`, `receiver_name`, `amount` (`DECIMAL(15,2)`), `transaction_type`, `description`, `status`, `created_at` |
| **`login_attempts`** | Security audit trail for logins | `id` (PK), `username`, `ip_address`, `attempt_time`, `success` |

---

## 🔒 Security & ACID Integrity Measures

1. **Password Hashing:** Passwords are never stored in plaintext. Each registered user receives a unique 16-byte cryptographic salt, hashed with **SHA-256**. Verification uses constant-time byte comparisons to prevent timing attacks.
2. **Server-Side Session Authentication:** The application issues cryptographically random UUID tokens on login. Client-supplied user IDs are never trusted. All database queries for balance, profile, and transfers are resolved server-side from the active session.
3. **PreparedStatements Everywhere:** 100% of database queries use parameterized SQL (`PreparedStatement`) to eliminate SQL Injection attacks.
4. **DECIMAL Monetary Columns:** All balances and transaction amounts use `DECIMAL(15, 2)` in MySQL and `java.math.BigDecimal` in Java. Float or double precision rounding issues are strictly avoided.
5. **Atomic Fund Transfers (ACID Compliance):**
   ```java
   conn.setAutoCommit(false);
   // 1. Lock sender row FOR UPDATE & check balance >= amount
   // 2. Lock receiver row FOR UPDATE
   // 3. Deduct amount from sender
   // 4. Credit amount to receiver
   // 5. Insert transaction audit records
   conn.commit();
   // If ANY step fails -> conn.rollback()
   ```

---

## 🚀 How to Setup and Run the Application

### Prerequisites
- **Java Development Kit (JDK 17+)** installed (`java -version`, `javac -version`)
- **MySQL Server 8.0+** running locally on port 3306

### Step 1: Configure MySQL Connection
Open `db.properties` in the project root folder and specify your MySQL credentials:
```properties
db.url=jdbc:mysql://localhost:3306/secure_banking?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
db.user=root
db.password=YOUR_MYSQL_PASSWORD
```

### Step 2: Initialize Database and Tables
Double-click `database/setup_database.bat` or run the following in PowerShell / Command Prompt:
```powershell
mysql -u root -p < database/schema.sql
```
This automatically creates the `secure_banking` database and all 4 tables (`users`, `accounts`, `transactions`, `login_attempts`).

### Step 3: Compile and Launch the Java Server
Double-click **`build_and_run.bat`** in the project root directory.

The script automatically:
1. Downloads `mysql-connector-j-8.4.0.jar` into the `lib/` directory if not present.
2. Compiles all Java classes (`javac`).
3. Starts the server on **`http://localhost:8080/`**.

*(Alternatively, if using Maven: `mvn compile exec:java`)*

### Step 4: Open in Your Browser
Open your browser and navigate to:
```
http://localhost:8080/
```

---

## 🧪 Comprehensive Real User Testing Flow

Follow these steps to demonstrate real-world behavior for your lab examiner:

### Scenario 1: User A Registration & First Login
1. Click **"Open Account"** (`#register`).
2. Register **User A**:
   - Full Name: `Rajesh Kumar`
   - Email: `rajesh@example.com`
   - Phone: `9876543210`
   - Date of Birth: `2000-05-15`
   - Address: `MG Road, Bengaluru`
   - Username: `rajesh_k`
   - Password: `Password@123`
   - Account Type: `Savings`
3. Click **"Create Account"**. A real unique 12-digit account number (e.g. `458210482914`) is generated and saved to MySQL.
4. Click **"Done"** to enter the Dashboard. Notice the initial balance is `₹0.00`.

### Scenario 2: Real Deposit
1. In User A's dashboard, click **"Deposit"**.
2. Select or enter **`₹25,000`**, Remarks: *"Initial deposit"*.
3. Click **"Proceed to Deposit"** ➔ Authorize the transaction.
4. The backend adds `₹25,000.00` to the account in MySQL and commits.
5. Notice User A's balance updates to **`₹25,000.00`**.

### Scenario 3: User B Registration
1. Sign out of User A's session.
2. Click **"Open Account"**.
3. Register **User B**:
   - Full Name: `Ananya Sharma`
   - Email: `ananya@example.com`
   - Phone: `9812345678`
   - Date of Birth: `2001-08-20`
   - Address: `Park Street, Kolkata`
   - Username: `ananya_s`
   - Password: `Password@123`
   - Account Type: `Savings`
4. Note User B's generated account number (e.g. `458298716235`). Initial balance is `₹0.00`.

### Scenario 4: Real Fund Transfer (User A ➔ User B)
1. Sign out of User B and log back in as User A (`rajesh_k` / `Password@123`).
2. Click **"Transfer Funds"**.
3. **Step 1:** Enter User B's account number. Notice the system looks up MySQL and displays the verified beneficiary: *"Ananya Sharma"*.
4. **Step 2:** Enter Amount: **`₹8,000`**.
5. **Step 3:** Enter Purpose: *"Project expenses"*.
6. **Step 4:** Review the order summary and click **"Confirm Transfer"**.
7. Confirm in the dialog. The atomic JDBC transaction deducts `₹8,000.00` from User A, credits `₹8,000.00` to User B, and logs the transaction.
8. Notice User A's balance is now **`₹17,000.00`**.

### Scenario 5: Verification in User B's Account
1. Sign out and log in as User B (`ananya_s` / `Password@123`).
2. Notice User B's balance is now **`₹8,000.00`**.
3. Click **"Transaction History"**. User B sees the incoming credit from Rajesh Kumar with status **`SUCCESS`**.
4. Click the transaction row to view the official digital **E-Receipt**.

### Scenario 6: MySQL Database Verification
Open MySQL Workbench or MySQL CLI and run:
```sql
USE secure_banking;

-- Verify Users
SELECT id, full_name, email, username, created_at FROM users;

-- Verify Balances (Exact DECIMAL values)
SELECT a.account_number, u.full_name, a.account_type, a.balance, a.status 
FROM accounts a 
JOIN users u ON a.user_id = u.id;

-- Verify Audit Transactions Ledger
SELECT transaction_id, sender_name, receiver_name, amount, transaction_type, status, created_at 
FROM transactions 
ORDER BY created_at DESC;
```

---

## 🎓 College Lab Viva Questions & Answers

**Q1: How does the application prevent race conditions and dirty reads during fund transfers?**  
*Answer:* We use JDBC row-level locking via `SELECT balance FROM accounts WHERE account_number = ? FOR UPDATE` inside an atomic transaction with `connection.setAutoCommit(false)`. Any concurrent transaction attempting to read or modify the same account balance must wait until the current transaction issues `connection.commit()` or `connection.rollback()`.

**Q2: Why do you use `BigDecimal` instead of `double` or `float` for currency?**  
*Answer:* Floating-point types (`float` and `double`) use binary representation (IEEE 754) which cannot represent fractional decimal numbers like `0.1` exactly, causing rounding errors in financial transactions. `BigDecimal` provides arbitrary-precision signed decimal numbers, guaranteeing exact calculations down to the cent/paise.

**Q3: How is SQL Injection prevented?**  
*Answer:* Every SQL query across the application uses `PreparedStatement`. Parameter placeholders (`?`) ensure that user input is treated strictly as literal data rather than executable SQL code, neutralizing injection vectors.

**Q4: Where is the session state stored and how is unauthorized data access prevented?**  
*Answer:* The session state is maintained on the server inside `SessionManager`. When a request arrives, the server resolves the user identity from the cryptographically random token in the `Authorization` header. Endpoints reject requests if the session token is missing or expired, preventing users from tampering with IDs in client requests.
