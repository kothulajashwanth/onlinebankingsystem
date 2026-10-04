package com.banking.dao;

import com.banking.config.DatabaseConnection;
import com.banking.model.User;

import java.sql.*;

/**
 * USER DATA ACCESS OBJECT
 * 
 * Performs all user-related persistence operations using PreparedStatements.
 */
public class UserDAO {

    public int createUser(Connection conn, User user) throws SQLException {
        String sql = "INSERT INTO users (full_name, email, phone, date_of_birth, address, username, password_hash, salt, role) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, user.getFullName());
            stmt.setString(2, user.getEmail());
            stmt.setString(3, user.getPhone());
            stmt.setDate(4, Date.valueOf(user.getDateOfBirth()));
            stmt.setString(5, user.getAddress());
            stmt.setString(6, user.getUsername());
            stmt.setString(7, user.getPasswordHash());
            stmt.setString(8, user.getSalt());
            stmt.setString(9, user.getRole() != null ? user.getRole() : "CUSTOMER");

            int affected = stmt.executeUpdate();
            if (affected == 0) {
                throw new SQLException("Creating user failed, no rows affected.");
            }

            try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    user.setId(generatedKeys.getInt(1));
                    return user.getId();
                } else {
                    throw new SQLException("Creating user failed, no ID obtained.");
                }
            }
        }
    }

    public User findByUsername(String username) throws SQLException {
        String sql = "SELECT * FROM users WHERE username = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, username);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapRowToUser(rs);
                }
            }
        }
        return null;
    }

    public User findByEmail(String email) throws SQLException {
        String sql = "SELECT * FROM users WHERE email = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, email);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapRowToUser(rs);
                }
            }
        }
        return null;
    }

    public User findById(int id) throws SQLException {
        String sql = "SELECT * FROM users WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapRowToUser(rs);
                }
            }
        }
        return null;
    }

    public boolean updateProfile(int userId, String fullName, String email, String phone, String address) throws SQLException {
        String sql = "UPDATE users SET full_name = ?, email = ?, phone = ?, address = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, fullName);
            stmt.setString(2, email);
            stmt.setString(3, phone);
            stmt.setString(4, address);
            stmt.setInt(5, userId);
            return stmt.executeUpdate() > 0;
        }
    }

    public boolean updatePassword(int userId, String passwordHash, String salt) throws SQLException {
        String sql = "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, passwordHash);
            stmt.setString(2, salt);
            stmt.setInt(3, userId);
            return stmt.executeUpdate() > 0;
        }
    }

    public void recordLoginAttempt(String username, String ip, boolean success) {
        String sql = "INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, username);
            stmt.setString(2, ip != null ? ip : "127.0.0.1");
            stmt.setBoolean(3, success);
            stmt.executeUpdate();
        } catch (Exception ex) {
            System.err.println("[UserDAO] Failed to record login attempt: " + ex.getMessage());
        }
    }

    private User mapRowToUser(ResultSet rs) throws SQLException {
        return new User(
            rs.getInt("id"),
            rs.getString("full_name"),
            rs.getString("email"),
            rs.getString("phone"),
            rs.getDate("date_of_birth") != null ? rs.getDate("date_of_birth").toString() : "",
            rs.getString("address"),
            rs.getString("username"),
            rs.getString("password_hash"),
            rs.getString("salt"),
            rs.getString("role"),
            rs.getTimestamp("created_at")
        );
    }
}
