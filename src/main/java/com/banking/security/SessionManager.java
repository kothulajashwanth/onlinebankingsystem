package com.banking.security;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SERVER-SIDE SESSION MANAGER
 * 
 * Complies with requirement:
 * - "The application must always know which user is currently logged in."
 * - "Do NOT trust a user ID supplied directly from the frontend."
 * - "The authenticated user identity must be maintained by the Java application/session system."
 */
public class SessionManager {

    private static class SessionData {
        final int userId;
        final String username;
        long lastAccessedTime;

        SessionData(int userId, String username) {
            this.userId = userId;
            this.username = username;
            this.lastAccessedTime = System.currentTimeMillis();
        }
    }

    private static final Map<String, SessionData> activeSessions = new ConcurrentHashMap<>();
    private static final long SESSION_TIMEOUT_MS = 30 * 60 * 1000L; // 30 minutes

    /**
     * Creates a new cryptographically random session token for the authenticated user.
     */
    public static String createSession(int userId, String username) {
        String token = UUID.randomUUID().toString().replace("-", "");
        activeSessions.put(token, new SessionData(userId, username));
        return token;
    }

    /**
     * Retrieves the authenticated user ID for the given session token.
     * Returns null if token is missing, invalid, or expired.
     */
    public static Integer getUserIdForToken(String token) {
        if (token == null || token.trim().isEmpty()) return null;
        SessionData data = activeSessions.get(token);
        if (data == null) return null;

        // Check expiration
        if (System.currentTimeMillis() - data.lastAccessedTime > SESSION_TIMEOUT_MS) {
            activeSessions.remove(token);
            return null;
        }

        // Slide expiration window
        data.lastAccessedTime = System.currentTimeMillis();
        return data.userId;
    }

    /**
     * Destroys an active session on logout.
     */
    public static void invalidateSession(String token) {
        if (token != null) {
            activeSessions.remove(token);
        }
    }
}
