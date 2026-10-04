package com.banking.dao;

import com.banking.config.DatabaseConnection;
import com.banking.model.Transaction;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * TRANSACTION DATA ACCESS OBJECT
 * 
 * Manages immutable transaction audit ledger entries using PreparedStatements.
 */
public class TransactionDAO {

    public void recordTransaction(Connection conn, Transaction txn) throws SQLException {
        String sql = "INSERT INTO transactions (transaction_id, sender_account, receiver_account, " +
                     "sender_name, receiver_name, amount, transaction_type, description, status, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, txn.getTransactionId());
            stmt.setString(2, txn.getSenderAccount());
            stmt.setString(3, txn.getReceiverAccount());
            stmt.setString(4, txn.getSenderName());
            stmt.setString(5, txn.getReceiverName());
            stmt.setBigDecimal(6, txn.getAmount());
            stmt.setString(7, txn.getTransactionType());
            stmt.setString(8, txn.getDescription());
            stmt.setString(9, txn.getStatus() != null ? txn.getStatus() : "SUCCESS");
            stmt.setTimestamp(10, txn.getCreatedAt() != null ? txn.getCreatedAt() : new Timestamp(System.currentTimeMillis()));

            stmt.executeUpdate();
            try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    txn.setId(generatedKeys.getInt(1));
                }
            }
        }
    }

    public List<Transaction> getTransactionsForAccount(String accountNumber) throws SQLException {
        String sql = "SELECT * FROM transactions WHERE sender_account = ? OR receiver_account = ? ORDER BY created_at DESC";
        List<Transaction> list = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, accountNumber);
            stmt.setString(2, accountNumber);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new Transaction(
                        rs.getInt("id"),
                        rs.getString("transaction_id"),
                        rs.getString("sender_account"),
                        rs.getString("receiver_account"),
                        rs.getString("sender_name"),
                        rs.getString("receiver_name"),
                        rs.getBigDecimal("amount"),
                        rs.getString("transaction_type"),
                        rs.getString("description"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at")
                    ));
                }
            }
        }
        return list;
    }
}
