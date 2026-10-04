# Future Java Architecture & Integration Blueprint
**Project:** Secure Online Banking and Fund Transfer System  
**Next Stages:** Stage 2 (Java Application Logic) & Stage 4 (JDBC Integration)

---

## 1. Architectural Overview

When we transition to **Stage 2 (Java Application Logic)** and **Stage 4 (JDBC Integration)**, this project will adopt standard enterprise Java Design Patterns:

```
src/
└── com/
    └── aegis/
        └── bank/
            ├── model/           # POJO / Entity Classes (matches DB Schema)
            │   ├── User.java
            │   ├── Account.java
            │   └── Transaction.java
            │
            ├── dao/             # Data Access Objects (JDBC Operations)
            │   ├── DBConnection.java
            │   ├── UserDAO.java
            │   ├── AccountDAO.java
            │   └── TransactionDAO.java
            │
            ├── service/         # Business Logic & Financial Transaction ACID Rules
            │   ├── AuthService.java
            │   ├── AccountService.java
            │   └── FundTransferService.java
            │
            └── controller/      # Servlets / REST Handlers
                ├── LoginServlet.java
                ├── RegisterServlet.java
                ├── DepositServlet.java
                ├── WithdrawServlet.java
                └── TransferServlet.java
```

---

## 2. Fund Transfer Transaction Safety (ACID Compliance)

During your college viva examination, examiners frequently ask:
> **"How do you ensure money is not lost if the server crashes in the middle of a fund transfer?"**

The future `FundTransferService.java` will use strict JDBC Transaction Management with atomic rollback:

```java
Connection conn = null;
try {
    conn = DBConnection.getConnection();
    // 1. Disable Auto-Commit for Atomic Financial Transaction
    conn.setAutoCommit(false);

    // 2. Lock and Check Sender Balance
    BigDecimal senderBalance = accountDAO.getBalanceForUpdate(conn, senderAcc);
    if (senderBalance.compareTo(transferAmount) < 0) {
        throw new InsufficientBalanceException("Sender balance is insufficient.");
    }

    // 3. Deduct from Sender
    accountDAO.deductBalance(conn, senderAcc, transferAmount);

    // 4. Credit to Beneficiary
    accountDAO.creditBalance(conn, receiverAcc, transferAmount);

    // 5. Insert Audit Ledger Transaction
    transactionDAO.recordTransaction(conn, txnRecord);

    // 6. Commit the entire transaction atomically
    conn.commit();
} catch (Exception ex) {
    // In case of any error or system failure, roll back all debit/credit operations
    if (conn != null) {
        conn.rollback();
    }
    throw ex;
} finally {
    if (conn != null) {
        conn.setAutoCommit(true);
        conn.close();
    }
}
```

---

## 3. How the Frontend Connects to Java

The frontend has been built with an abstracted **Service Layer** in `frontend/js/mock/store.js`.
When the Java Servlets are compiled and deployed on Tomcat or embedded server:
1. `AegisStore.login(username, password)` will simply call `fetch('/api/auth/login', { ... })`.
2. `AegisStore.recordMockTransaction(...)` will call `fetch('/api/transfer', { ... })`.
3. **Zero UI redesign or frontend code changes will be required.**
