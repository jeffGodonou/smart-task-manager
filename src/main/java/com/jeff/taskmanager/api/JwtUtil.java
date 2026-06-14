package com.jeff.taskmanager.api;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import java.util.Date;

public class JwtUtil {
    private static final String SECRET = System.getenv().getOrDefault("JWT_SECRET", "change-me-very-secret");
    private static final Algorithm ALGORITHM = Algorithm.HMAC256(SECRET);
    private static final JWTVerifier VERIFIER = JWT.require(ALGORITHM)
            .withIssuer("smart-task-manager")
            .build();
    private static final long EXPIRATION_MS = 1000L * 60 * 60 * 4;

    public static String generateToken(String username) {
        Date now = new Date();
        return JWT.create()
                .withIssuer("smart-task-manager")
                .withSubject(username)
                .withIssuedAt(now)
                .withExpiresAt(new Date(now.getTime() + EXPIRATION_MS))
                .sign(ALGORITHM);
    }

    public static String validateToken(String token) {
        try {
            DecodedJWT jwt = VERIFIER.verify(token);
            return jwt.getSubject();
        } catch (JWTVerificationException ex) {
            throw new IllegalArgumentException("Invalid or expired token", ex);
        }
    }
}
