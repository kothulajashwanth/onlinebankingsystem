package com.banking.security;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * SECURE PASSWORD HASHER
 * 
 * Complies with requirement:
 * - Passwords must never be stored as plaintext.
 * - Generates unique cryptographic salt for each user.
 * - Hashes using SHA-256 with salt.
 * - Constant-time comparison to prevent side-channel timing attacks.
 */
public class PasswordHasher {

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Generates a 16-byte random cryptographic salt encoded in Base64.
     */
    public static String generateSalt() {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    /**
     * Hashes plaintext password combined with salt.
     */
    public static String hashPassword(String password, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(Base64.getDecoder().decode(salt));
            byte[] hashedPassword = md.digest(password.getBytes());
            return Base64.getEncoder().encodeToString(hashedPassword);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Cryptographic algorithm SHA-256 not available", e);
        }
    }

    /**
     * Verifies an entered password against stored hash and salt.
     */
    public static boolean verifyPassword(String enteredPassword, String storedHash, String storedSalt) {
        String computedHash = hashPassword(enteredPassword, storedSalt);
        return MessageDigest.isEqual(
            Base64.getDecoder().decode(computedHash),
            Base64.getDecoder().decode(storedHash)
        );
    }
}
