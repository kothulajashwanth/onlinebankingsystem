package com.banking.config;

import java.io.File;
import java.io.FileInputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

/**
 * DATABASE CONNECTION MANAGER
 * 
 * Manages JDBC connections to MySQL database `secure_banking`.
 * Reads optional configuration from `db.properties` or defaults to standard MySQL local setup.
 */
public class DatabaseConnection {

    private static String dbUrl = "jdbc:mysql://localhost:3306/secure_banking?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    private static String dbUser = "root";
    private static String dbPassword = "";

    static {
        try {
            // Load MySQL Connector/J driver
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("[DatabaseConnection] MySQL JDBC Driver not found on classpath!");
        }

        // Check for local db.properties
        File propFile = new File("db.properties");
        if (propFile.exists()) {
            try (FileInputStream fis = new FileInputStream(propFile)) {
                Properties props = new Properties();
                props.load(fis);
                if (props.getProperty("db.url") != null) dbUrl = props.getProperty("db.url");
                if (props.getProperty("db.user") != null) dbUser = props.getProperty("db.user");
                if (props.getProperty("db.password") != null) dbPassword = props.getProperty("db.password");
                System.out.println("[DatabaseConnection] Loaded database settings from db.properties");
            } catch (Exception ex) {
                System.err.println("[DatabaseConnection] Error reading db.properties: " + ex.getMessage());
            }
        }
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl, dbUser, dbPassword);
    }

    public static void setCredentials(String url, String user, String password) {
        dbUrl = url;
        dbUser = user;
        dbPassword = password;
    }
}
