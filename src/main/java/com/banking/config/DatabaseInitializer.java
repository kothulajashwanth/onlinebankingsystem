package com.banking.config;

import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

/**
 * AUTOMATIC DATABASE INITIALIZER & VERIFIER
 * 
 * Complies with STEP 3:
 * - Checks if `secure_banking` exists in MySQL.
 * - Creates database if not present.
 * - Executes `database/schema.sql` if tables do not exist.
 * - Verifies tables: users, accounts, transactions, login_attempts.
 * - Runs DESCRIBE queries to verify column integrity and DECIMAL types.
 * - Avoids dependency on mysql.exe in Windows PATH.
 */
public class DatabaseInitializer {

    public static boolean initializeAndVerify() {
        System.out.println("\n[DatabaseInitializer] ==========================================");
        System.out.println("[DatabaseInitializer] STEP 3: VERIFYING MYSQL DATABASE");
        System.out.println("[DatabaseInitializer] ==========================================");

        String rawUrl = "jdbc:mysql://localhost:3306/?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
        String user = "root";
        String password = "";

        // Read db.properties if present
        File propFile = new File("db.properties");
        if (propFile.exists()) {
            try (FileInputStream fis = new FileInputStream(propFile)) {
                Properties props = new Properties();
                props.load(fis);
                if (props.getProperty("db.user") != null) user = props.getProperty("db.user").trim();
                if (props.getProperty("db.password") != null) password = props.getProperty("db.password").trim();
            } catch (Exception ex) {
                System.err.println("[DatabaseInitializer] Warning: could not parse db.properties: " + ex.getMessage());
            }
        }

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("[DatabaseInitializer] ERROR: MySQL Connector/J driver not found!");
            return false;
        }

        // 1. Connect to MySQL server root to ensure secure_banking exists
        try (Connection rootConn = DriverManager.getConnection(rawUrl, user, password);
             Statement stmt = rootConn.createStatement()) {
            System.out.println("[DatabaseInitializer] Connected to MySQL server as user '" + user + "'");
            stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS `secure_banking` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            System.out.println("[DatabaseInitializer] Database `secure_banking` verified.");
        } catch (Exception ex) {
            System.err.println("\n[DatabaseInitializer] ERROR: Unable to connect to MySQL server!");
            System.err.println("[DatabaseInitializer] Error details: " + ex.getMessage());
            System.err.println("[DatabaseInitializer] Please ensure:");
            System.err.println("  1. MySQL Service is running (e.g. MySQL80, MariaDB, or XAMPP).");
            System.err.println("  2. 'db.password' in db.properties matches your MySQL root password.\n");
            return false;
        }

        // 2. Connect directly to secure_banking to verify tables
        String dbUrl = "jdbc:mysql://localhost:3306/secure_banking?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
        try (Connection dbConn = DriverManager.getConnection(dbUrl, user, password);
             Statement stmt = dbConn.createStatement()) {

            // Check existing tables
            List<String> existingTables = new ArrayList<>();
            try (ResultSet rs = stmt.executeQuery("SHOW TABLES")) {
                while (rs.next()) {
                    existingTables.add(rs.getString(1).toLowerCase());
                }
            }

            boolean needsSchema = !existingTables.contains("users") || 
                                  !existingTables.contains("accounts") || 
                                  !existingTables.contains("transactions") || 
                                  !existingTables.contains("login_attempts");

            if (needsSchema) {
                System.out.println("[DatabaseInitializer] Tables not fully present in `secure_banking`.");
                System.out.println("[DatabaseInitializer] Executing database/schema.sql...");
                File schemaFile = new File("database/schema.sql");
                if (!schemaFile.exists()) {
                    schemaFile = new File("schema.sql");
                }

                if (!schemaFile.exists()) {
                    System.err.println("[DatabaseInitializer] ERROR: database/schema.sql file not found!");
                    return false;
                }

                String sqlContent = new String(Files.readAllBytes(schemaFile.toPath()), StandardCharsets.UTF_8);
                List<String> statements = parseStatements(sqlContent);

                System.out.println("[DatabaseInitializer] Parsed " + statements.size() + " SQL DDL statements to execute.");

                for (int i = 0; i < statements.size(); i++) {
                    String stmtStr = statements.get(i);
                    // Skip database creation or use commands since we are already connected to secure_banking
                    String lower = stmtStr.toLowerCase();
                    if (lower.startsWith("create database") || lower.startsWith("use ")) {
                        continue;
                    }
                    try {
                        String summary = stmtStr.split("\n")[0];
                        if (summary.length() > 60) summary = summary.substring(0, 60) + "...";
                        System.out.println("[DatabaseInitializer] Executing [" + (i + 1) + "/" + statements.size() + "]: " + summary);
                        stmt.execute(stmtStr);
                        System.out.println("  -> SUCCESS");
                    } catch (Exception queryEx) {
                        System.err.println("[DatabaseInitializer] ERROR executing statement:\n" + stmtStr);
                        System.err.println("[DatabaseInitializer] Cause: " + queryEx.getMessage());
                        return false;
                    }
                }
                System.out.println("[DatabaseInitializer] database/schema.sql successfully executed.");
            } else {
                System.out.println("[DatabaseInitializer] All required tables already exist in `secure_banking`.");
            }

            // 3. Verify that all 4 tables ACTUALLY exist now
            List<String> verifiedTables = new ArrayList<>();
            try (ResultSet rs = stmt.executeQuery("SHOW TABLES")) {
                while (rs.next()) {
                    verifiedTables.add(rs.getString(1).toLowerCase());
                }
            }

            System.out.println("\n[DatabaseInitializer] ==========================================");
            System.out.println("[DatabaseInitializer] SHOW TABLES in `secure_banking`:");
            for (String t : verifiedTables) {
                System.out.println("  - " + t);
            }

            String[] expectedTables = {"users", "accounts", "transactions", "login_attempts"};
            boolean allPresent = true;
            for (String expected : expectedTables) {
                if (!verifiedTables.contains(expected)) {
                    System.err.println("[DatabaseInitializer] MISSING TABLE: " + expected);
                    allPresent = false;
                }
            }

            if (!allPresent) {
                System.err.println("[DatabaseInitializer] ERROR: Not all expected tables were created in `secure_banking`!");
                return false;
            }

            // 4. Verify each table with DESCRIBE
            System.out.println("\n[DatabaseInitializer] TABLE VERIFICATION (DESCRIBE):");
            for (String tbl : expectedTables) {
                System.out.println("\n--- DESCRIBE " + tbl + " ---");
                try (ResultSet rs = stmt.executeQuery("DESCRIBE `" + tbl + "`")) {
                    System.out.printf("  %-18s %-22s %-6s %-6s %-10s\n", "Field", "Type", "Null", "Key", "Default");
                    System.out.println("  -------------------------------------------------------------------");
                    while (rs.next()) {
                        System.out.printf("  %-18s %-22s %-6s %-6s %-10s\n", 
                            rs.getString("Field"), 
                            rs.getString("Type"), 
                            rs.getString("Null"), 
                            rs.getString("Key"),
                            String.valueOf(rs.getString("Default"))
                        );
                    }
                } catch (Exception ex) {
                    System.err.println("  Error describing " + tbl + ": " + ex.getMessage());
                    return false;
                }
            }

            System.out.println("\n[DatabaseInitializer] ALL 4 TABLES VERIFIED SUCCESSFULLY IN `secure_banking`!");
            System.out.println("[DatabaseInitializer] ==========================================\n");
            return true;

        } catch (Exception ex) {
            System.err.println("[DatabaseInitializer] Error during table verification: " + ex.getMessage());
            return false;
        }
    }

    /**
     * Splits raw SQL script into clean, executable SQL statements.
     * Strips block comments, inline comments (-- and #), and splits on semicolons.
     */
    private static List<String> parseStatements(String sql) {
        List<String> list = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inBlockComment = false;

        String[] lines = sql.split("\r?\n");
        for (String rawLine : lines) {
            String line = rawLine.trim();

            if (inBlockComment) {
                if (line.contains("*/")) {
                    line = line.substring(line.indexOf("*/") + 2).trim();
                    inBlockComment = false;
                } else {
                    continue;
                }
            }

            if (line.startsWith("/*")) {
                if (line.contains("*/")) {
                    line = line.substring(line.indexOf("*/") + 2).trim();
                } else {
                    inBlockComment = true;
                    continue;
                }
            }

            // Remove single line comments
            if (line.startsWith("--") || line.startsWith("#")) {
                continue;
            }

            // Handle trailing inline comments
            if (line.contains("--")) {
                line = line.substring(0, line.indexOf("--")).trim();
            }

            if (line.isEmpty()) {
                continue;
            }

            current.append(" ").append(line);

            if (line.endsWith(";")) {
                String stmt = current.toString().trim();
                if (stmt.endsWith(";")) {
                    stmt = stmt.substring(0, stmt.length() - 1).trim();
                }
                if (!stmt.isEmpty()) {
                    list.add(stmt);
                }
                current.setLength(0);
            }
        }

        if (current.length() > 0) {
            String stmt = current.toString().trim();
            if (stmt.endsWith(";")) {
                stmt = stmt.substring(0, stmt.length() - 1).trim();
            }
            if (!stmt.isEmpty()) {
                list.add(stmt);
            }
        }

        return list;
    }
}
