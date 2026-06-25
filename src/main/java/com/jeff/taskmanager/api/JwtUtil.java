package com.jeff.taskmanager.api;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import java.util.Date;

/**
 * Utility methods for creating and validating JWT bearer tokens.
 */
public class JwtUtil {
    private static final String SECRET = System.getenv().getOrDefault("JWT_SECRET", "change-me-very-secret");
    private static final Algorithm ALGORITHM = Algorithm.HMAC256(SECRET);
    private static final JWTVerifier VERIFIER = JWT.require(ALGORITHM)
            .withIssuer("smart-task-manager")
            .build();
    private static final long EXPIRATION_MS = 1000L * 60 * 60 * 4;

    /**
     * Generate a signed JWT token for the specified username.
     *
     * @param username the subject username to embed in the token
     * @return a signed JWT token string
     */
    public static String generateToken(String username) {
        Date now = new Date();
        return JWT.create()
                .withIssuer("smart-task-manager")
                .withSubject(username)
                .withIssuedAt(now)
                .withExpiresAt(new Date(now.getTime() + EXPIRATION_MS))
                .sign(ALGORITHM);
    }

    /**
     * Validate a JWT token and return the authenticated username.
     *
     * @param token the token string to validate
     * @return the username contained in the token subject
     */
    public static String validateToken(String token) {
        try {
            DecodedJWT jwt = VERIFIER.verify(token);
            return jwt.getSubject();
        } catch (JWTVerificationException ex) {
            throw new IllegalArgumentException("Invalid or expired token", ex);
        }
    }
}
