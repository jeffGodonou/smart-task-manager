package com.jeff.taskmanager.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Utility methods for hashing and verifying passwords.
 */
public class PasswordUtil {

    /**
     * Hash a password using SHA-256.
     *
     * @param password the raw password to hash
     * @return the hexadecimal SHA-256 hash
     */
    public static String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Failed to hash password", e);
        }
    }

    /**
     * Verify a raw password against a stored hash.
     *
     * @param raw the raw password value
     * @param hash the stored hashed password
     * @return true when the password matches the hash
     */
    public static boolean verifyPassword(String raw, String hash) {
        return hashPassword(raw).equals(hash);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
