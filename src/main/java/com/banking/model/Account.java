package com.banking.model;

import java.math.BigDecimal;
import java.sql.Timestamp;

public class Account {
    private int id;
    private int userId;
    private String accountNumber;
    private String accountType;
    private BigDecimal balance;
    private String status;
    private String ifscCode;
    private String branchName;
    private BigDecimal dailyLimit;
    private Timestamp createdAt;

    public Account() {}

    public Account(int id, int userId, String accountNumber, String accountType, BigDecimal balance, 
                   String status, String ifscCode, String branchName, BigDecimal dailyLimit, Timestamp createdAt) {
        this.id = id;
        this.userId = userId;
        this.accountNumber = accountNumber;
        this.accountType = accountType;
        this.balance = balance != null ? balance : BigDecimal.ZERO;
        this.status = status;
        this.ifscCode = ifscCode;
        this.branchName = branchName;
        this.dailyLimit = dailyLimit != null ? dailyLimit : new BigDecimal("50000.00");
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public BigDecimal getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(BigDecimal dailyLimit) { this.dailyLimit = dailyLimit; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public String getDisplayAccountNumber() {
        if (accountNumber != null && accountNumber.length() >= 4) {
            return "•••• " + accountNumber.substring(accountNumber.length() - 4);
        }
        return accountNumber;
    }
}
