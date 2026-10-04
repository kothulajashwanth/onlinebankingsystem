package com.banking.dao;

import com.banking.config.DatabaseConnection;
import com.banking.model.Account;

import java.math.BigDecimal;
import java.sql.*;

/**
 * ACCOUNT DATA ACCESS OBJECT
 * 
 * Manages bank accounts, balances, and row-level locks using PreparedStatements.
 */
public class AccountDAO {

    public void createAccount(Connection conn, Account account) throws SQLException {
        String sql = "INSERT INTO accounts (user_id, account_number, account_type, balance, status, ifsc_code, branch_name, daily_limit) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, account.getUserId());
            stmt.setString(2, account.getAccountNumber());
            stmt.setString(3, account.getAccountType());
            stmt.setBigDecimal(4, account.getBalance());
            stmt.setString(5, account.getStatus() != null ? account.getStatus() : "Active");
            stmt.setString(6, account.getIfscCode() != null ? account.getIfscCode() : "AEGB0004582");
            stmt.setString(7, account.getBranchName() != null ? account.getBranchName() : "Tech Park Main Branch, Bengaluru");
            stmt.setBigDecimal(8, account.getDailyLimit() != null ? account.getDailyLimit() : new BigDecimal("50000.00"));

            stmt.executeUpdate();
            try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    account.setId(generatedKeys.getInt(1));
                }
            }
        }
    }

    public Account findByUserId(int userId) throws SQLException {
        String sql = "SELECT * FROM accounts WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapRowToAccount(rs);
                }
            }
        }
        return null;
    }

    public Account findByAccountNumber(String accountNumber) throws SQLException {
        String sql = "SELECT * FROM accounts WHERE account_number = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, accountNumber);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapRowToAccount(rs);
                }
            }
        }
        return null;
    }

    /**
     * Retrieves current balance and locks row for atomic transaction processing.
     */
    public BigDecimal getBalanceForUpdate(Connection conn, String accountNumber) throws SQLException {
        String sql = "SELECT balance FROM accounts WHERE account_number = ? FOR UPDATE";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, accountNumber);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getBigDecimal("balance");
                }
            }
        }
        return null;
    }

    public boolean updateBalance(Connection conn, String accountNumber, BigDecimal newBalance) throws SQLException {
        String sql = "UPDATE accounts SET balance = ? WHERE account_number = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setBigDecimal(1, newBalance);
            stmt.setString(2, accountNumber);
            return stmt.executeUpdate() > 0;
        }
    }

    private Account mapRowToAccount(ResultSet rs) throws SQLException {
        return new Account(
            rs.getInt("id"),
            rs.getInt("user_id"),
            rs.getString("account_number"),
            rs.getString("account_type"),
            rs.getBigDecimal("balance"),
            rs.getString("status"),
            rs.getString("ifsc_code"),
            rs.getString("branch_name"),
            rs.getBigDecimal("daily_limit"),
            rs.getTimestamp("created_at")
        );
    }
}
