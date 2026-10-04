package com.banking;

import com.banking.config.DatabaseInitializer;
import com.banking.dao.AccountDAO;
import com.banking.dao.TransactionDAO;
import com.banking.dao.UserDAO;
import com.banking.model.Account;
import com.banking.model.Transaction;
import com.banking.model.User;
import com.banking.security.PasswordHasher;
import com.banking.security.SessionManager;
import com.banking.service.AccountService;
import com.banking.service.AuthService;
import com.banking.service.TransferService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;

/**
 * MAIN SERVER ENTRYPOINT
 * 
 * Standalone Java Banking Application Server.
 * Serves both the modern web frontend and provides secure REST API endpoints.
 * Built using pure Java Standard Library (jdk.httpserver) + JDBC + MySQL.
 */
public class Main {

    private static final int PORT = 8080;
    private static final AuthService authService = new AuthService();
    private static final AccountService accountService = new AccountService();
    private static final TransferService transferService = new TransferService();
    private static final UserDAO userDAO = new UserDAO();
    private static final AccountDAO accountDAO = new AccountDAO();
    private static final TransactionDAO transactionDAO = new TransactionDAO();

    public static void main(String[] args) throws IOException {
        System.out.println("=================================================================");
        System.out.println("  SECURE ONLINE BANKING AND FUND TRANSFER SYSTEM");
        System.out.println("  Java Backend + JDBC + MySQL Architecture");
        System.out.println("=================================================================");

        // STEP 3: Verify & Initialize MySQL Database & Tables via JDBC
        DatabaseInitializer.initializeAndVerify();

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // API Endpoints
        server.createContext("/api/auth/register", new RegisterHandler());
        server.createContext("/api/auth/login", new LoginHandler());
        server.createContext("/api/auth/logout", new LogoutHandler());
        server.createContext("/api/user/profile", new ProfileHandler());
        server.createContext("/api/user/password", new PasswordHandler());
        server.createContext("/api/account/details", new AccountDetailsHandler());
        server.createContext("/api/account/deposit", new DepositHandler());
        server.createContext("/api/account/withdraw", new WithdrawHandler());
        server.createContext("/api/account/lookup", new LookupHandler());
        server.createContext("/api/transfer", new TransferHandler());
        server.createContext("/api/transactions", new TransactionsHandler());

        // Static Frontend Files Handler
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(16));
        server.start();

        System.out.println("[Main] Server is running at http://localhost:" + PORT + "/");
        System.out.println("[Main] Frontend is served at http://localhost:" + PORT + "/index.html");
        System.out.println("[Main] REST API is active at http://localhost:" + PORT + "/api/*");
        System.out.println("=================================================================");
    }

    // -------------------------------------------------------------------------
    // AUTHENTICATION MIDDLEWARE HELPER
    // -------------------------------------------------------------------------
    private static Integer authenticate(HttpExchange exchange) {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        } else {
            token = exchange.getRequestHeaders().getFirst("X-Auth-Token");
        }
        return SessionManager.getUserIdForToken(token);
    }

    // -------------------------------------------------------------------------
    // 1. REGISTER HANDLER
    // -------------------------------------------------------------------------
    static class RegisterHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJson(exchange, 405, "{\"success\":false,\"message\":\"Method not allowed\"}");
                return;
            }

            Map<String, String> body = parseJsonBody(exchange);
            AuthService.AuthResult res = authService.register(
                body.get("fullName"),
                body.get("email"),
                body.get("phone"),
                body.get("dob"),
                body.get("address"),
                body.get("username"),
                body.get("password"),
                body.get("confirmPassword"),
                body.get("accountType")
            );

            if (res.success) {
                String json = String.format(
                    "{\"success\":true,\"message\":\"%s\",\"token\":\"%s\",\"accountNumber\":\"%s\",\"accountType\":\"%s\",\"balance\":\"%s\",\"ifsc\":\"%s\"}",
                    escapeJson(res.message),
                    res.token,
                    res.account.getAccountNumber(),
                    res.account.getAccountType(),
                    res.account.getBalance().toPlainString(),
                    res.account.getIfscCode()
                );
                sendJson(exchange, 200, json);
            } else {
                sendJson(exchange, 400, String.format("{\"success\":false,\"message\":\"%s\"}", escapeJson(res.message)));
            }
        }
    }

    // -------------------------------------------------------------------------
    // 2. LOGIN HANDLER
    // -------------------------------------------------------------------------
    static class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJson(exchange, 405, "{\"success\":false,\"message\":\"Method not allowed\"}");
                return;
            }

            Map<String, String> body = parseJsonBody(exchange);
            String ip = exchange.getRemoteAddress().getAddress().getHostAddress();
            AuthService.AuthResult res = authService.login(body.get("username"), body.get("password"), ip);

            if (res.success) {
                String json = String.format(
                    "{\"success\":true,\"message\":\"%s\",\"token\":\"%s\",\"user\":{\"id\":%d,\"fullName\":\"%s\",\"email\":\"%s\",\"phone\":\"%s\",\"username\":\"%s\"},\"account\":{\"accountNumber\":\"%s\",\"displayAccount\":\"%s\",\"accountType\":\"%s\",\"balance\":%s,\"status\":\"%s\",\"ifsc\":\"%s\",\"branch\":\"%s\"}}",
                    escapeJson(res.message),
                    res.token,
                    res.user.getId(),
                    escapeJson(res.user.getFullName()),
                    escapeJson(res.user.getEmail()),
                    escapeJson(res.user.getPhone()),
                    escapeJson(res.user.getUsername()),
                    res.account.getAccountNumber(),
                    res.account.getDisplayAccountNumber(),
                    res.account.getAccountType(),
                    res.account.getBalance().toPlainString(),
                    res.account.getStatus(),
                    res.account.getIfscCode(),
                    escapeJson(res.account.getBranchName())
                );
                sendJson(exchange, 200, json);
            } else {
                sendJson(exchange, 401, String.format("{\"success\":false,\"message\":\"%s\"}", escapeJson(res.message)));
            }
        }
    }

    // -------------------------------------------------------------------------
    // 3. LOGOUT HANDLER
    // -------------------------------------------------------------------------
    static class LogoutHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                SessionManager.invalidateSession(authHeader.substring(7).trim());
            }
            sendJson(exchange, 200, "{\"success\":true,\"message\":\"Logged out successfully.\"}");
        }
    }

    // -------------------------------------------------------------------------
    // 4. ACCOUNT DETAILS HANDLER (GET /api/account/details)
    // -------------------------------------------------------------------------
    static class AccountDetailsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            Integer userId = authenticate(exchange);
            if (userId == null) {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Session expired or invalid. Please sign in again.\"}");
                return;
            }

            try {
                User user = userDAO.findById(userId);
                Account account = accountDAO.findByUserId(userId);
                if (user == null || account == null) {
                    sendJson(exchange, 404, "{\"success\":false,\"message\":\"Account records not found.\"}");
                    return;
                }

                String json = String.format(
                    "{\"success\":true,\"user\":{\"id\":%d,\"fullName\":\"%s\",\"email\":\"%s\",\"phone\":\"%s\",\"dob\":\"%s\",\"address\":\"%s\",\"username\":\"%s\"},\"account\":{\"accountNumber\":\"%s\",\"displayAccount\":\"%s\",\"accountType\":\"%s\",\"balance\":%s,\"status\":\"%s\",\"ifsc\":\"%s\",\"branch\":\"%s\",\"dailyLimit\":%s}}",
                    user.getId(),
                    escapeJson(user.getFullName()),
                    escapeJson(user.getEmail()),
                    escapeJson(user.getPhone()),
                    escapeJson(user.getDateOfBirth()),
                    escapeJson(user.getAddress()),
                    escapeJson(user.getUsername()),
                    account.getAccountNumber(),
                    account.getDisplayAccountNumber(),
                    account.getAccountType(),
                    account.getBalance().toPlainString(),
                    account.getStatus(),
                    account.getIfscCode(),
                    escapeJson(account.getBranchName()),
                    account.getDailyLimit().toPlainString()
                );
                sendJson(exchange, 200, json);
            } catch (Exception ex) {
                sendJson(exchange, 500, "{\"success\":false,\"message\":\"Failed to load account details.\"}");
            }
        }
    }

    // -------------------------------------------------------------------------
    // 5. DEPOSIT HANDLER (POST /api/account/deposit)
    // -------------------------------------------------------------------------
    static class DepositHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            Integer userId = authenticate(exchange);
            if (userId == null) {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Unauthorized.\"}");
                return;
            }

            Map<String, String> body = parseJsonBody(exchange);
            BigDecimal amount;
            try {
                amount = new BigDecimal(body.get("amount"));
            } catch (Exception e) {
                sendJson(exchange, 400, "{\"success\":false,\"message\":\"Invalid deposit amount.\"}");
                return;
            }

            try {
                User user = userDAO.findById(userId);
                AccountService.OperationResult res = accountService.deposit(
                    userId, 
                    amount, 
                    body.get("description"), 
                    user != null ? user.getFullName() : "Customer"
                );
                if (res.success) {
                    String json = String.format(
                        "{\"success\":true,\"message\":\"%s\",\"transactionId\":\"%s\",\"updatedBalance\":%s}",
                        escapeJson(res.message),
                        res.transactionId,
                        res.updatedBalance.toPlainString()
                    );
                    sendJson(exchange, 200, json);
                } else {
                    sendJson(exchange, 400, String.format("{\"success\":false,\"message\":\"%s\"}", escapeJson(res.message)));
                }
            } catch (Exception ex) {
                sendJson(exchange, 500, "{\"success\":false,\"message\":\"Deposit failed due to system error.\"}");
            }
        }
    }

    // -------------------------------------------------------------------------
    // 6. WITHDRAW HANDLER (POST /api/account/withdraw)
    // -------------------------------------------------------------------------
    static class WithdrawHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            Integer userId = authenticate(exchange);
            if (userId == null) {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Unauthorized.\"}");
                return;
            }

            Map<String, String> body = parseJsonBody(exchange);
            BigDecimal amount;
            try {
                amount = new BigDecimal(body.get("amount"));
            } catch (Exception e) {
                sendJson(exchange, 400, "{\"success\":false,\"message\":\"Invalid withdrawal amount.\"}");
                return;
            }

            try {
                User user = userDAO.findById(userId);
                AccountService.OperationResult res = accountService.withdraw(
                    userId, 
                    amount, 
                    body.get("description"), 
                    user != null ? user.getFullName() : "Customer"
                );
                if (res.success) {
                    String json = String.format(
                        "{\"success\":true,\"message\":\"%s\",\"transactionId\":\"%s\",\"updatedBalance\":%s}",
                        escapeJson(res.message),
                        res.transactionId,
                        res.updatedBalance.toPlainString()
                    );
                    sendJson(exchange, 200, json);
                } else {
                    sendJson(exchange, 400, String.format("{\"success\":false,\"message\":\"%s\"}", escapeJson(res.message)));
                }
            } catch (Exception ex) {
                sendJson(exchange, 500, "{\"success\":false,\"message\":\"Withdrawal failed due to system error.\"}");
            }
        }
    }

    // -------------------------------------------------------------------------
    // 7. BENEFICIARY LOOKUP HANDLER (POST /api/account/lookup)
    // -------------------------------------------------------------------------
    static class LookupHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            Integer userId = authenticate(exchange);
            if (userId == null) {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Unauthorized.\"}");
                return;
            }

            Map<String, String> body = parseJsonBody(exchange);
            String targetAcc = body.get("accountNumber");

            try {
                Account target = transferService.lookupReceiver(targetAcc);
                if (target == null) {
                    sendJson(exchange, 404, "{\"success\":false,\"message\":\"Receiver account does not exist.\"}");
                    return;
                }

                User owner = userDAO.findById(target.getUserId());
                String name = owner != null ? owner.getFullName() : "Verified Account Holder";
                String json = String.format(
                    "{\"success\":true,\"accountNumber\":\"%s\",\"receiverName\":\"%s\",\"bankName\":\"Aegis Bank\",\"branch\":\"%s\",\"status\":\"%s\"}",
                    target.getAccountNumber(),
                    escapeJson(name),
                    escapeJson(target.getBranchName()),
                    target.getStatus()
                );
                sendJson(exchange, 200, json);
            } catch (Exception ex) {
                sendJson(exchange, 500, "{\"success\":false,\"message\":\"Account verification failed.\"}");
            }
        }
    }

    // -------------------------------------------------------------------------
    // 8. FUND TRANSFER HANDLER (POST /api/transfer)
    // -------------------------------------------------------------------------
    static class TransferHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            Integer userId = authenticate(exchange);
            if (userId == null) {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Unauthorized.\"}");
                return;
            }

            Map<String, String> body = parseJsonBody(exchange);
            BigDecimal amount;
            try {
                amount = new BigDecimal(body.get("amount"));
            } catch (Exception e) {
                sendJson(exchange, 400, "{\"success\":false,\"message\":\"Invalid transfer amount.\"}");
                return;
            }

            TransferService.TransferResult res = transferService.transferFunds(
                userId,
                body.get("receiverAccount"),
                amount,
                body.get("description")
            );

            if (res.success) {
                String json = String.format(
                    "{\"success\":true,\"message\":\"%s\",\"transactionId\":\"%s\",\"receiverName\":\"%s\",\"updatedBalance\":%s}",
                    escapeJson(res.message),
                    res.transactionId,
                    escapeJson(res.receiverName),
                    res.senderRemainingBalance.toPlainString()
                );
                sendJson(exchange, 200, json);
            } else {
                sendJson(exchange, 400, String.format("{\"success\":false,\"message\":\"%s\"}", escapeJson(res.message)));
            }
        }
    }

    // -------------------------------------------------------------------------
    // 9. TRANSACTIONS LEDGER HANDLER (GET /api/transactions)
    // -------------------------------------------------------------------------
    static class TransactionsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            Integer userId = authenticate(exchange);
            if (userId == null) {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Unauthorized.\"}");
                return;
            }

            try {
                Account account = accountDAO.findByUserId(userId);
                if (account == null) {
                    sendJson(exchange, 404, "{\"success\":false,\"message\":\"Account not found.\"}");
                    return;
                }

                List<Transaction> list = transactionDAO.getTransactionsForAccount(account.getAccountNumber());
                StringBuilder sb = new StringBuilder();
                sb.append("{\"success\":true,\"accountNumber\":\"").append(account.getAccountNumber()).append("\",\"transactions\":[");
                for (int i = 0; i < list.size(); i++) {
                    Transaction t = list.get(i);
                    sb.append(String.format(
                        "{\"id\":%d,\"transactionId\":\"%s\",\"senderAccount\":\"%s\",\"receiverAccount\":\"%s\",\"senderName\":\"%s\",\"receiverName\":\"%s\",\"amount\":%s,\"transactionType\":\"%s\",\"description\":\"%s\",\"status\":\"%s\",\"createdAt\":\"%s\"}",
                        t.getId(),
                        t.getTransactionId(),
                        t.getSenderAccount(),
                        t.getReceiverAccount(),
                        escapeJson(t.getSenderName()),
                        escapeJson(t.getReceiverName()),
                        t.getAmount().toPlainString(),
                        t.getTransactionType(),
                        escapeJson(t.getDescription()),
                        t.getStatus(),
                        t.getCreatedAt() != null ? t.getCreatedAt().toString() : ""
                    ));
                    if (i < list.size() - 1) sb.append(",");
                }
                sb.append("]}");
                sendJson(exchange, 200, sb.toString());
            } catch (Exception ex) {
                sendJson(exchange, 500, "{\"success\":false,\"message\":\"Failed to load transactions.\"}");
            }
        }
    }

    // -------------------------------------------------------------------------
    // 10. PROFILE UPDATE HANDLER (GET / PUT /api/user/profile)
    // -------------------------------------------------------------------------
    static class ProfileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            Integer userId = authenticate(exchange);
            if (userId == null) {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Unauthorized.\"}");
                return;
            }

            if ("PUT".equalsIgnoreCase(exchange.getRequestMethod()) || "POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> body = parseJsonBody(exchange);
                String fullName = body.get("fullName");
                String email = body.get("email");
                String phone = body.get("phone");
                String address = body.get("address");

                if (fullName == null || email == null || phone == null || address == null) {
                    sendJson(exchange, 400, "{\"success\":false,\"message\":\"Missing profile fields.\"}");
                    return;
                }

                try {
                    boolean ok = userDAO.updateProfile(userId, fullName.trim(), email.trim(), phone.trim(), address.trim());
                    if (ok) {
                        sendJson(exchange, 200, "{\"success\":true,\"message\":\"Profile updated successfully.\"}");
                    } else {
                        sendJson(exchange, 400, "{\"success\":false,\"message\":\"Failed to update profile.\"}");
                    }
                } catch (Exception ex) {
                    sendJson(exchange, 500, "{\"success\":false,\"message\":\"Profile update error: " + escapeJson(ex.getMessage()) + "\"}");
                }
            } else {
                try {
                    User user = userDAO.findById(userId);
                    if (user == null) {
                        sendJson(exchange, 404, "{\"success\":false,\"message\":\"User not found.\"}");
                        return;
                    }
                    String json = String.format(
                        "{\"success\":true,\"user\":{\"id\":%d,\"fullName\":\"%s\",\"email\":\"%s\",\"phone\":\"%s\",\"dob\":\"%s\",\"address\":\"%s\",\"username\":\"%s\"}}",
                        user.getId(),
                        escapeJson(user.getFullName()),
                        escapeJson(user.getEmail()),
                        escapeJson(user.getPhone()),
                        escapeJson(user.getDateOfBirth()),
                        escapeJson(user.getAddress()),
                        escapeJson(user.getUsername())
                    );
                    sendJson(exchange, 200, json);
                } catch (Exception ex) {
                    sendJson(exchange, 500, "{\"success\":false,\"message\":\"Failed to load profile.\"}");
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // 11. PASSWORD UPDATE HANDLER (PUT /api/user/password)
    // -------------------------------------------------------------------------
    static class PasswordHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            Integer userId = authenticate(exchange);
            if (userId == null) {
                sendJson(exchange, 401, "{\"success\":false,\"message\":\"Unauthorized.\"}");
                return;
            }

            Map<String, String> body = parseJsonBody(exchange);
            String currentPassword = body.get("currentPassword");
            String newPassword = body.get("newPassword");

            if (currentPassword == null || newPassword == null || newPassword.length() < 6) {
                sendJson(exchange, 400, "{\"success\":false,\"message\":\"New password must be at least 6 characters.\"}");
                return;
            }

            try {
                User user = userDAO.findById(userId);
                if (user == null) {
                    sendJson(exchange, 404, "{\"success\":false,\"message\":\"User not found.\"}");
                    return;
                }

                if (!PasswordHasher.verifyPassword(currentPassword, user.getPasswordHash(), user.getSalt())) {
                    sendJson(exchange, 400, "{\"success\":false,\"message\":\"Current password does not match.\"}");
                    return;
                }

                String newSalt = PasswordHasher.generateSalt();
                String newHash = PasswordHasher.hashPassword(newPassword, newSalt);
                userDAO.updatePassword(userId, newHash, newSalt);

                sendJson(exchange, 200, "{\"success\":true,\"message\":\"Password updated successfully.\"}");
            } catch (Exception ex) {
                sendJson(exchange, 500, "{\"success\":false,\"message\":\"Password update failed.\"}");
            }
        }
    }

    // -------------------------------------------------------------------------
    // 12. STATIC FILE HANDLER (Serves frontend/ files)
    // -------------------------------------------------------------------------
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) {
                path = "/index.html";
            }

            File baseDir = new File("frontend");
            File file = new File(baseDir, path.replace("/", File.separator));

            if (!file.exists() || file.isDirectory()) {
                file = new File(baseDir, "index.html");
            }

            if (!file.exists()) {
                String notFound = "404 Not Found";
                exchange.sendResponseHeaders(404, notFound.length());
                OutputStream os = exchange.getResponseBody();
                os.write(notFound.getBytes());
                os.close();
                return;
            }

            String mimeType = getMimeType(file.getName());
            exchange.getResponseHeaders().set("Content-Type", mimeType);
            exchange.sendResponseHeaders(200, file.length());

            try (OutputStream os = exchange.getResponseBody();
                 FileInputStream fis = new FileInputStream(file)) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = fis.read(buffer)) > 0) {
                    os.write(buffer, 0, count);
                }
            }
        }

        private String getMimeType(String filename) {
            if (filename.endsWith(".html")) return "text/html; charset=UTF-8";
            if (filename.endsWith(".css")) return "text/css; charset=UTF-8";
            if (filename.endsWith(".js")) return "application/javascript; charset=UTF-8";
            if (filename.endsWith(".svg")) return "image/svg+xml";
            if (filename.endsWith(".png")) return "image/png";
            if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
            if (filename.endsWith(".json")) return "application/json; charset=UTF-8";
            return "application/octet-stream";
        }
    }

    // -------------------------------------------------------------------------
    // UTILITIES
    // -------------------------------------------------------------------------
    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Auth-Token");
    }

    private static void sendJson(HttpExchange exchange, int statusCode, String jsonResponse) throws IOException {
        byte[] bytes = jsonResponse.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    private static Map<String, String> parseJsonBody(HttpExchange exchange) throws IOException {
        InputStream is = exchange.getRequestBody();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buf = new byte[2048];
        int n;
        while ((n = is.read(buf)) != -1) {
            baos.write(buf, 0, n);
        }
        String body = baos.toString(StandardCharsets.UTF_8).trim();
        Map<String, String> map = new HashMap<>();
        if (body.startsWith("{") && body.endsWith("}")) {
            body = body.substring(1, body.length() - 1);
            // Basic JSON parser for key-value pairs
            int len = body.length();
            boolean inQuotes = false;
            StringBuilder current = new StringBuilder();
            List<String> tokens = new ArrayList<>();

            for (int i = 0; i < len; i++) {
                char c = body.charAt(i);
                if (c == '"' && (i == 0 || body.charAt(i - 1) != '\\')) {
                    inQuotes = !inQuotes;
                }
                if (c == ',' && !inQuotes) {
                    tokens.add(current.toString().trim());
                    current.setLength(0);
                } else {
                    current.append(c);
                }
            }
            if (current.length() > 0) tokens.add(current.toString().trim());

            for (String token : tokens) {
                int colon = token.indexOf(':');
                if (colon > 0) {
                    String key = token.substring(0, colon).trim().replaceAll("^\"|\"$", "");
                    String val = token.substring(colon + 1).trim().replaceAll("^\"|\"$", "");
                    map.put(key, val);
                }
            }
        }
        return map;
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
