package com.banking.validation;

import java.math.BigDecimal;
import java.util.regex.Pattern;

/**
 * SERVER-SIDE INPUT VALIDATOR
 * 
 * Complies with requirement:
 * - "The frontend must NEVER be trusted to determine validity."
 * - All business and format checks validated server-side.
 */
public class InputValidator {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[A-Za-z0-9_]{3,30}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[+0-9\\s-]{8,20}$");

    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email.trim()).matches();
    }

    public static boolean isValidUsername(String username) {
        return username != null && USERNAME_PATTERN.matcher(username.trim()).matches();
    }

    public static boolean isValidPhone(String phone) {
        return phone != null && PHONE_PATTERN.matcher(phone.trim()).matches();
    }

    public static boolean isValidPassword(String password) {
        return password != null && password.length() >= 6;
    }

    public static boolean isValidAmount(BigDecimal amount) {
        return amount != null && amount.compareTo(BigDecimal.ZERO) > 0 && amount.scale() <= 2;
    }

    public static boolean isNonEmpty(String text) {
        return text != null && !text.trim().isEmpty();
    }
}
