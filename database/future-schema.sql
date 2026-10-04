-- ==============================================================================
-- DATABASE SCHEMA: SECURE ONLINE BANKING AND FUND TRANSFER SYSTEM
-- Target Database: MySQL 8.0+
-- Stage: STAGE 3 (PREPARATION SPECIFICATION)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `banking_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `banking_db`;

-- ------------------------------------------------------------------------------
-- Table 1: USERS
-- Stores core customer identity, credentials, and contact profiles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NOT NULL,
    `date_of_birth` DATE NOT NULL,
    `address` TEXT NOT NULL,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL, -- To store BCrypt / SHA-256 hashed password in Stage 2/3
    `role` ENUM('CUSTOMER', 'ADMIN') DEFAULT 'CUSTOMER',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_username` (`username`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 2: ACCOUNTS
-- Stores bank account numbers, balances, account types, and status
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
-- Stores immutable audit ledger of deposits, withdrawals, and fund transfers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `transaction_id` VARCHAR(30) NOT NULL UNIQUE,
    `sender_account` VARCHAR(20) NOT NULL,
    `receiver_account` VARCHAR(20) NOT NULL,
    `sender_name` VARCHAR(100) NOT NULL,
    `receiver_name` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `transaction_type` ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_SENT', 'TRANSFER_RECEIVED') NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `status` ENUM('SUCCESS', 'PENDING', 'FAILED') DEFAULT 'SUCCESS',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `chk_positive_tx_amount` CHECK (`amount` > 0.00),
    INDEX `idx_tx_id` (`transaction_id`),
    INDEX `idx_tx_sender` (`sender_account`),
    INDEX `idx_tx_receiver` (`receiver_account`),
    INDEX `idx_tx_created` (`created_at`)
) ENGINE=InnoDB;

-- ==============================================================================
-- INITIAL SEED DATA FOR DEMONSTRATION & TESTING
-- Matches the Stage 1 mock dataset
-- ==============================================================================

-- 1. Insert Initial Users
INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `date_of_birth`, `address`, `username`, `password`, `role`)
VALUES
(1, 'Jashwanth Kumar', 'jashwanth.kumar@example.com', '+91 98765 43210', '2003-08-15', 'Flat 402, Royal Palms Residency, Outer Ring Road, Bengaluru, Karnataka - 560103', 'jashwanth', 'password123', 'CUSTOMER'),
(2, 'Priya Sharma', 'priya.sharma@example.com', '+91 98111 22334', '2002-11-20', '12/B Tech City Towers, Madhapur, Hyderabad - 500081', 'priya_s', 'password123', 'CUSTOMER'),
(3, 'Rahul Verma', 'rahul.verma@example.com', '+91 97222 33445', '2001-05-18', 'Sector 62, Green Park Avenue, Noida, Uttar Pradesh - 201301', 'rahul_v', 'password123', 'CUSTOMER')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 2. Insert Accounts
INSERT INTO `accounts` (`id`, `user_id`, `account_number`, `account_type`, `balance`, `status`, `ifsc_code`, `branch_name`, `daily_limit`)
VALUES
(101, 1, '458210993412', 'Savings', 48250.00, 'Active', 'AEGB0004582', 'Tech Park Main Branch, Bengaluru', 50000.00),
(102, 2, '987654321001', 'Savings', 85200.00, 'Active', 'AEGB0001001', 'Cyber City Branch, Hyderabad', 100000.00),
(103, 3, '882341902234', 'Current', 142000.00, 'Active', 'AEGB0002234', 'Sector 62 Branch, Noida', 200000.00)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 3. Insert Initial Transactions Ledger
INSERT INTO `transactions` (`id`, `transaction_id`, `sender_account`, `receiver_account`, `sender_name`, `receiver_name`, `amount`, `transaction_type`, `description`, `status`, `created_at`)
VALUES
(501, 'TXN-78219042', '458210993412', '987654321001', 'Jashwanth Kumar', 'Priya Sharma', 5000.00, 'TRANSFER_SENT', 'College project lab expenses', 'SUCCESS', '2026-09-26 14:25:00'),
(502, 'TXN-65192081', 'CASH_CDM_04', '458210993412', 'Self (CDM Deposit)', 'Jashwanth Kumar', 15000.00, 'DEPOSIT', 'Monthly allowance cash deposit', 'SUCCESS', '2026-09-24 11:10:00'),
(503, 'TXN-41908231', '882341902234', '458210993412', 'Rahul Verma', 'Jashwanth Kumar', 3200.00, 'TRANSFER_RECEIVED', 'Split payment for textbook & lab kits', 'SUCCESS', '2026-09-20 18:45:00'),
(504, 'TXN-32910488', '458210993412', 'ATM_BLR_09', 'Jashwanth Kumar', 'ATM Cash Dispenser #09', 2500.00, 'WITHDRAWAL', 'ATM Cash withdrawal for weekend travel', 'SUCCESS', '2026-09-18 09:30:00'),
(505, 'TXN-21098451', 'DIRECT_SALARY_SYS', '458210993412', 'Infosys Campus Intern Stipend', 'Jashwanth Kumar', 20000.00, 'TRANSFER_RECEIVED', 'Internship monthly stipend credit', 'SUCCESS', '2026-09-01 10:00:00')
ON DUPLICATE KEY UPDATE `id` = `id`;
