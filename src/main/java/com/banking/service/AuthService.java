package com.banking.service;

import com.banking.config.DatabaseConnection;
import com.banking.dao.AccountDAO;
import com.banking.dao.UserDAO;
import com.banking.model.Account;
import com.banking.model.User;
import com.banking.security.PasswordHasher;
import com.banking.security.SessionManager;
import com.banking.validation.InputValidator;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Random;

public class AuthService {

    private final UserDAO userDAO = new UserDAO();
    private final AccountDAO accountDAO = new AccountDAO();

    public static class AuthResult {
        public final boolean success;
        public final String message;
        public final String token;
        public final User user;
        public final Account account;

        public AuthResult(boolean success, String message, String token, User user, Account account) {
            this.success = success;
            this.message = message;
            this.token = token;
            this.user = user;
            this.account = account;
        }
    }

    /**
     * Registers a real customer, generates a real unique account number, and saves both to MySQL.
     */
    public AuthResult register(String fullName, String email, String phone, String dob, 
                               String address, String username, String password, String confirmPassword, 
                               String accountType) {
        // 1. Validation
        if (!InputValidator.isNonEmpty(fullName) || !InputValidator.isNonEmpty(address) || !InputValidator.isNonEmpty(dob)) {
            return new AuthResult(false, "Please complete all required application fields.", null, null, null);
        }
        if (!InputValidator.isValidEmail(email)) {
            return new AuthResult(false, "Please enter a valid email address.", null, null, null);
        }
        if (!InputValidator.isValidPhone(phone)) {
            return new AuthResult(false, "Please enter a valid phone number.", null, null, null);
        }
        if (!InputValidator.isValidUsername(username)) {
            return new AuthResult(false, "Username must be 3-30 alphanumeric characters or underscores.", null, null, null);
        }
        if (!InputValidator.isValidPassword(password)) {
            return new AuthResult(false, "Password must be at least 6 characters long.", null, null, null);
        }
        if (!password.equals(confirmPassword)) {
            return new AuthResult(false, "Passwords do not match.", null, null, null);
        }

        Connection conn = null;
        try {
            // Check unique username and email
            if (userDAO.findByUsername(username) != null) {
                return new AuthResult(false, "Username is already registered. Please choose another.", null, null, null);
            }
            if (userDAO.findByEmail(email) != null) {
                return new AuthResult(false, "An account with this email address already exists.", null, null, null);
            }

            // Generate cryptographic salt and hash password
            String salt = PasswordHasher.generateSalt();
            String hash = PasswordHasher.hashPassword(password, salt);

            User newUser = new User();
            newUser.setFullName(fullName.trim());
            newUser.setEmail(email.trim().toLowerCase());
            newUser.setPhone(phone.trim());
            newUser.setDateOfBirth(dob);
            newUser.setAddress(address.trim());
            newUser.setUsername(username.trim());
            newUser.setPasswordHash(hash);
            newUser.setSalt(salt);
            newUser.setRole("CUSTOMER");

            conn = DatabaseConnection.getConnection();
            conn.setAutoCommit(false);

            // Insert User
            int userId = userDAO.createUser(conn, newUser);
            newUser.setId(userId);

            // Generate unique 12-digit bank account number: 4582 + 8 random digits
            String accountNumber = generateUniqueAccountNumber(conn);

            Account newAccount = new Account();
            newAccount.setUserId(userId);
            newAccount.setAccountNumber(accountNumber);
            newAccount.setAccountType("Current".equalsIgnoreCase(accountType) ? "Current" : "Savings");
            newAccount.setBalance(BigDecimal.ZERO); // Initial starting balance
            newAccount.setStatus("Active");
            newAccount.setIfscCode("AEGB0004582");
            newAccount.setBranchName("Tech Park Main Branch, Bengaluru");
            newAccount.setDailyLimit(new BigDecimal("50000.00"));

            accountDAO.createAccount(conn, newAccount);

            conn.commit();

            // Create authenticated session
            String token = SessionManager.createSession(userId, username);
            return new AuthResult(true, "Account created successfully.", token, newUser, newAccount);

        } catch (Exception ex) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ignored) {}
            }
            System.err.println("[AuthService.register] Error: " + ex.getMessage());
            return new AuthResult(false, "Registration could not be completed. Please try again.", null, null, null);
        } finally {
            if (conn != null) {
                try { conn.setAutoCommit(true); conn.close(); } catch (SQLException ignored) {}
            }
        }
    }

    /**
     * Authenticates a user against real hashed credentials in MySQL.
     */
    public AuthResult login(String username, String password, String ipAddress) {
        if (!InputValidator.isNonEmpty(username) || !InputValidator.isNonEmpty(password)) {
            return new AuthResult(false, "Please enter both username and password.", null, null, null);
        }

        try {
            User user = userDAO.findByUsername(username.trim());
            if (user == null) {
                userDAO.recordLoginAttempt(username, ipAddress, false);
                return new AuthResult(false, "Invalid username or password.", null, null, null);
            }

            boolean valid = PasswordHasher.verifyPassword(password, user.getPasswordHash(), user.getSalt());
            userDAO.recordLoginAttempt(username, ipAddress, valid);

            if (!valid) {
                return new AuthResult(false, "Invalid username or password.", null, null, null);
            }

            Account account = accountDAO.findByUserId(user.getId());
            String token = SessionManager.createSession(user.getId(), user.getUsername());
            return new AuthResult(true, "Authentication successful.", token, user, account);

        } catch (Exception ex) {
            System.err.println("[AuthService.login] Error: " + ex.getMessage());
            return new AuthResult(false, "Unable to sign in due to a service error. Please try again.", null, null, null);
        }
    }

    private String generateUniqueAccountNumber(Connection conn) throws SQLException {
        Random rnd = new Random();
        for (int attempts = 0; attempts < 100; attempts++) {
            long randomPart = 10000000L + (long)(rnd.nextDouble() * 89999999L);
            String candidate = "4582" + randomPart;
            if (accountDAO.findByAccountNumber(candidate) == null) {
                return candidate;
            }
        }
        return "4582" + System.currentTimeMillis();
    }
}
