package com.banking.service;

import com.banking.config.DatabaseConnection;
import com.banking.dao.AccountDAO;
import com.banking.dao.TransactionDAO;
import com.banking.dao.UserDAO;
import com.banking.model.Account;
import com.banking.model.Transaction;
import com.banking.model.User;
import com.banking.validation.InputValidator;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.UUID;

public class TransferService {

    private final AccountDAO accountDAO = new AccountDAO();
    private final TransactionDAO transactionDAO = new TransactionDAO();
    private final UserDAO userDAO = new UserDAO();

    public static class TransferResult {
        public final boolean success;
        public final String message;
        public final String transactionId;
        public final BigDecimal senderRemainingBalance;
        public final String receiverName;

        public TransferResult(boolean success, String message, String transactionId, 
                              BigDecimal senderRemainingBalance, String receiverName) {
            this.success = success;
            this.message = message;
            this.transactionId = transactionId;
            this.senderRemainingBalance = senderRemainingBalance;
            this.receiverName = receiverName;
        }
    }

    /**
     * Looks up a beneficiary by account number from MySQL.
     */
    public Account lookupReceiver(String receiverAccountNumber) throws SQLException {
        if (!InputValidator.isNonEmpty(receiverAccountNumber)) return null;
        return accountDAO.findByAccountNumber(receiverAccountNumber.trim());
    }

    /**
     * Executes an ATOMIC fund transfer with strict rollback on failure.
     */
    public TransferResult transferFunds(int senderUserId, String receiverAccountNumber, 
                                        BigDecimal amount, String description) {
        // Validation checks
        if (!InputValidator.isValidAmount(amount)) {
            return new TransferResult(false, "Transfer amount must be greater than zero.", null, null, null);
        }
        if (!InputValidator.isNonEmpty(receiverAccountNumber)) {
            return new TransferResult(false, "Receiver account number is required.", null, null, null);
        }

        Connection conn = null;
        try {
            // 1. Find Sender Account
            Account senderAccount = accountDAO.findByUserId(senderUserId);
            if (senderAccount == null) {
                return new TransferResult(false, "Sender account not found.", null, null, null);
            }

            // 2. Find and Verify Receiver Account
            String cleanReceiverAcc = receiverAccountNumber.trim();
            Account receiverAccount = accountDAO.findByAccountNumber(cleanReceiverAcc);
            if (receiverAccount == null) {
                return new TransferResult(false, "Receiver account does not exist.", null, null, null);
            }

            // 3. Verify sender is not the receiver
            if (senderAccount.getAccountNumber().equals(receiverAccount.getAccountNumber())) {
                return new TransferResult(false, "Cannot transfer funds to your own account. Use deposit instead.", null, null, null);
            }

            // Verify receiver is active
            if (!"Active".equalsIgnoreCase(receiverAccount.getStatus())) {
                return new TransferResult(false, "Receiver account is not active.", null, null, null);
            }

            // Fetch user names for audit trail
            User senderUser = userDAO.findById(senderUserId);
            User receiverUser = userDAO.findById(receiverAccount.getUserId());
            String senderName = senderUser != null ? senderUser.getFullName() : "Customer";
            String receiverName = receiverUser != null ? receiverUser.getFullName() : "Beneficiary";

            // 4. Begin Database Transaction
            conn = DatabaseConnection.getConnection();
            conn.setAutoCommit(false);

            // 5. Lock and verify sender balance
            BigDecimal senderBalance = accountDAO.getBalanceForUpdate(conn, senderAccount.getAccountNumber());
            if (senderBalance == null) {
                conn.rollback();
                return new TransferResult(false, "Sender balance unavailable.", null, null, null);
            }

            if (senderBalance.compareTo(amount) < 0) {
                conn.rollback();
                return new TransferResult(false, "Insufficient balance.", null, senderBalance, null);
            }

            // 6. Lock receiver row
            BigDecimal receiverBalance = accountDAO.getBalanceForUpdate(conn, receiverAccount.getAccountNumber());
            if (receiverBalance == null) {
                conn.rollback();
                return new TransferResult(false, "Receiver account locked or unavailable.", null, null, null);
            }

            // 7. Deduct from Sender
            BigDecimal newSenderBalance = senderBalance.subtract(amount);
            accountDAO.updateBalance(conn, senderAccount.getAccountNumber(), newSenderBalance);

            // 8. Credit to Receiver
            BigDecimal newReceiverBalance = receiverBalance.add(amount);
            accountDAO.updateBalance(conn, receiverAccount.getAccountNumber(), newReceiverBalance);

            // 9. Record Transaction Record
            String txnId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            String memo = InputValidator.isNonEmpty(description) ? description.trim() : "Fund Transfer";

            Transaction txn = new Transaction(
                0,
                txnId,
                senderAccount.getAccountNumber(),
                receiverAccount.getAccountNumber(),
                senderName,
                receiverName,
                amount,
                "TRANSFER_SENT",
                memo,
                "SUCCESS",
                new Timestamp(System.currentTimeMillis())
            );
            transactionDAO.recordTransaction(conn, txn);

            // 10. Commit Transaction
            conn.commit();

            return new TransferResult(true, "Transfer completed successfully.", txnId, newSenderBalance, receiverName);

        } catch (Exception ex) {
            // ROLLBACK EVERYTHING ON ANY ERROR
            if (conn != null) {
                try { 
                    conn.rollback(); 
                    System.err.println("[TransferService] Transaction rolled back due to error: " + ex.getMessage());
                } catch (SQLException ignored) {}
            }
            return new TransferResult(false, "Unable to complete the transfer due to a system error. Please try again.", null, null, null);
        } finally {
            if (conn != null) {
                try { conn.setAutoCommit(true); conn.close(); } catch (SQLException ignored) {}
            }
        }
    }
}
