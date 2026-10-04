package com.banking.service;

import com.banking.config.DatabaseConnection;
import com.banking.dao.AccountDAO;
import com.banking.dao.TransactionDAO;
import com.banking.model.Account;
import com.banking.model.Transaction;
import com.banking.validation.InputValidator;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.UUID;

public class AccountService {

    private final AccountDAO accountDAO = new AccountDAO();
    private final TransactionDAO transactionDAO = new TransactionDAO();

    public static class OperationResult {
        public final boolean success;
        public final String message;
        public final String transactionId;
        public final BigDecimal updatedBalance;

        public OperationResult(boolean success, String message, String transactionId, BigDecimal updatedBalance) {
            this.success = success;
            this.message = message;
            this.transactionId = transactionId;
            this.updatedBalance = updatedBalance;
        }
    }

    public Account getAccountForUser(int userId) throws SQLException {
        return accountDAO.findByUserId(userId);
    }

    /**
     * Performs a REAL database deposit operation using JDBC transactions and BigDecimal.
     */
    public OperationResult deposit(int userId, BigDecimal amount, String description, String userName) {
        if (!InputValidator.isValidAmount(amount)) {
            return new OperationResult(false, "Deposit amount must be greater than zero.", null, null);
        }

        Connection conn = null;
        try {
            Account account = accountDAO.findByUserId(userId);
            if (account == null) {
                return new OperationResult(false, "Account not found.", null, null);
            }

            conn = DatabaseConnection.getConnection();
            conn.setAutoCommit(false);

            // Row-level lock on balance
            BigDecimal currentBalance = accountDAO.getBalanceForUpdate(conn, account.getAccountNumber());
            if (currentBalance == null) {
                conn.rollback();
                return new OperationResult(false, "Account balance could not be retrieved.", null, null);
            }

            BigDecimal newBalance = currentBalance.add(amount);
            accountDAO.updateBalance(conn, account.getAccountNumber(), newBalance);

            // Record transaction audit record
            String txnId = "TXN-DEP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            Transaction txn = new Transaction(
                0,
                txnId,
                "CASH_CDM",
                account.getAccountNumber(),
                "Self Deposit",
                userName != null ? userName : "Account Holder",
                amount,
                "DEPOSIT",
                InputValidator.isNonEmpty(description) ? description.trim() : "Cash Deposit",
                "SUCCESS",
                new Timestamp(System.currentTimeMillis())
            );
            transactionDAO.recordTransaction(conn, txn);

            conn.commit();
            return new OperationResult(true, "Deposit completed successfully.", txnId, newBalance);

        } catch (Exception ex) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ignored) {}
            }
            System.err.println("[AccountService.deposit] Error: " + ex.getMessage());
            return new OperationResult(false, "Deposit failed due to a system error. Please try again.", null, null);
        } finally {
            if (conn != null) {
                try { conn.setAutoCommit(true); conn.close(); } catch (SQLException ignored) {}
            }
        }
    }

    /**
     * Performs a REAL database withdrawal operation using JDBC transactions and BigDecimal.
     */
    public OperationResult withdraw(int userId, BigDecimal amount, String description, String userName) {
        if (!InputValidator.isValidAmount(amount)) {
            return new OperationResult(false, "Withdrawal amount must be greater than zero.", null, null);
        }

        Connection conn = null;
        try {
            Account account = accountDAO.findByUserId(userId);
            if (account == null) {
                return new OperationResult(false, "Account not found.", null, null);
            }

            conn = DatabaseConnection.getConnection();
            conn.setAutoCommit(false);

            // Row-level lock on balance
            BigDecimal currentBalance = accountDAO.getBalanceForUpdate(conn, account.getAccountNumber());
            if (currentBalance == null) {
                conn.rollback();
                return new OperationResult(false, "Account balance could not be retrieved.", null, null);
            }

            // Balance validation
            if (currentBalance.compareTo(amount) < 0) {
                conn.rollback();
                return new OperationResult(false, "Insufficient balance.", null, currentBalance);
            }

            BigDecimal newBalance = currentBalance.subtract(amount);
            accountDAO.updateBalance(conn, account.getAccountNumber(), newBalance);

            // Record transaction audit record
            String txnId = "TXN-WTH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            Transaction txn = new Transaction(
                0,
                txnId,
                account.getAccountNumber(),
                "ATM_DISPENSER",
                userName != null ? userName : "Account Holder",
                "Cash Dispenser",
                amount,
                "WITHDRAWAL",
                InputValidator.isNonEmpty(description) ? description.trim() : "Cash Withdrawal",
                "SUCCESS",
                new Timestamp(System.currentTimeMillis())
            );
            transactionDAO.recordTransaction(conn, txn);

            conn.commit();
            return new OperationResult(true, "Withdrawal completed successfully.", txnId, newBalance);

        } catch (Exception ex) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ignored) {}
            }
            System.err.println("[AccountService.withdraw] Error: " + ex.getMessage());
            return new OperationResult(false, "Withdrawal failed due to a system error. Please try again.", null, null);
        } finally {
            if (conn != null) {
                try { conn.setAutoCommit(true); conn.close(); } catch (SQLException ignored) {}
            }
        }
    }
}
