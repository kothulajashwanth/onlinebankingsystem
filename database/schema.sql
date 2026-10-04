-- ==============================================================================
-- DATABASE SCHEMA: SECURE ONLINE BANKING AND FUND TRANSFER SYSTEM
-- Target Database: MySQL 8.0+
-- Database Name: `secure_banking`
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `secure_banking` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `secure_banking`;

-- ------------------------------------------------------------------------------
-- Table 1: USERS
-- Real registered customer profiles and secure hashed credentials
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NOT NULL,
    `date_of_birth` DATE NOT NULL,
    `address` TEXT NOT NULL,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `salt` VARCHAR(64) NOT NULL,
    `role` ENUM('CUSTOMER', 'ADMIN') DEFAULT 'CUSTOMER',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_username` (`username`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 2: ACCOUNTS
-- Real bank account records with DECIMAL monetary balances
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `account_number` VARCHAR(20) NOT NULL UNIQUE,
    `account_type` ENUM('Savings', 'Current') NOT NULL DEFAULT 'Savings',
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('Active', 'Suspended', 'Closed') DEFAULT 'Active',
    `ifsc_code` VARCHAR(15) NOT NULL DEFAULT 'AEGB0004582',
    `branch_name` VARCHAR(100) NOT NULL DEFAULT 'Tech Park Main Branch, Bengaluru',
    `daily_limit` DECIMAL(15, 2) DEFAULT 50000.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_accounts_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_positive_balance` CHECK (`balance` >= 0.00),
    INDEX `idx_accounts_accnum` (`account_number`),
    INDEX `idx_accounts_user` (`user_id`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 3: TRANSACTIONS
-- Immutable audit ledger for deposits, withdrawals, and fund transfers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `transaction_id` VARCHAR(35) NOT NULL UNIQUE,
    `sender_account` VARCHAR(20) NOT NULL,
    `receiver_account` VARCHAR(20) NOT NULL,
    `sender_name` VARCHAR(100) NOT NULL,
    `receiver_name` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `transaction_type` ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_SENT', 'TRANSFER_RECEIVED') NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `status` ENUM('SUCCESS', 'FAILED') DEFAULT 'SUCCESS',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `chk_positive_tx_amount` CHECK (`amount` > 0.00),
    INDEX `idx_tx_id` (`transaction_id`),
    INDEX `idx_tx_sender` (`sender_account`),
    INDEX `idx_tx_receiver` (`receiver_account`),
    INDEX `idx_tx_created` (`created_at`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 4: LOGIN_ATTEMPTS
-- Real security audit trail for authentication attempts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `success` BOOLEAN NOT NULL,
    INDEX `idx_login_user` (`username`),
    INDEX `idx_login_time` (`attempt_time`)
) ENGINE=InnoDB;
