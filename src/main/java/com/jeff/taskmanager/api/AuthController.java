package com.jeff.taskmanager.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.util.PasswordUtil;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * HTTP controller responsible for authentication endpoints.
 *
 * <p>Supports user registration and login using JWT tokens.</p>
 */
public class AuthController {
    private static final String PREFIX = "/api/auth";
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Create an AuthController backed by the provided {@link UserRepository}.
     *
     * @param userRepository repository used to lookup and persist users
     */

    /**
     * Register the authentication endpoints on the provided HTTP server.
     *
     * @param server the HTTP server to register routes with
     */
    public void registerRoutes(HttpServer server) {
        server.createContext(PREFIX + "/login", this::handleLogin);
        server.createContext(PREFIX + "/register", this::handleRegister);
        server.createContext(PREFIX + "/forgot-password", this::handleForgotPassword);
        HttpContext profileContext = server.createContext(PREFIX + "/profile", this::handleProfileUpdate);
        profileContext.getFilters().add(new AuthFilter());
    }

    /**
     * Respond to browser preflight requests so the frontend can call auth endpoints across origins.
     *
     * @param exchange the HTTP exchange for the incoming CORS preflight request
     */
    private void handleOptions(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");
        exchange.sendResponseHeaders(204, -1);
    }

    /**
     * Handle login requests. Expects a POST with JSON body containing
     * `username` and `password`. Responds with a JWT token on success.
     */

    private void handleLogin(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            // Allow browser preflight requests to reach the login endpoint.
            handleOptions(exchange);
            return;
        }

        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method not allowed");
            return;
        }

        try {
            LoginRequest request = readRequestBody(exchange.getRequestBody(), LoginRequest.class);
            if (request.username == null || request.password == null) {
                sendResponse(exchange, 400, "username and password are required");
                return;
            }

            User user = userRepository.findByUsername(request.username).orElse(null);
            if (user == null || !PasswordUtil.verifyPassword(request.password, user.getPasswordHash())) {
                sendResponse(exchange, 401, "Invalid username or password");
                return;
            }

            String token = JwtUtil.generateToken(user.getUsername());
            sendJson(exchange, 200, objectMapper.writeValueAsString(new AuthResponse(token)));
        } catch (Throwable ex) {
            ex.printStackTrace();
            sendJson(exchange, 500, objectMapper.writeValueAsString(new ErrorResponse("Login failed")));
        }
    }

    /**
     * Handle user registration requests. Expects a POST with JSON body
     * containing `username` and `password`. Returns a JWT token on success.
     */

    private void handleRegister(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            // Allow browser preflight requests to reach the registration endpoint.
            handleOptions(exchange);
            return;
        }

        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method not allowed");
            return;
        }

        try {
            RegisterRequest request = readRequestBody(exchange.getRequestBody(), RegisterRequest.class);
            if (request.username == null || request.password == null) {
                sendResponse(exchange, 400, "username and password are required");
                return;
            }

            if (userRepository.findByUsername(request.username).isPresent()) {
                sendResponse(exchange, 409, "Username already exists");
                return;
            }

            User user = new User(request.username, PasswordUtil.hashPassword(request.password));
            userRepository.save(user);
            String token = JwtUtil.generateToken(user.getUsername());
            sendJson(exchange, 201, objectMapper.writeValueAsString(new AuthResponse(token)));
        } catch (Throwable ex) {
            // Translate persistence-level conflicts into a user-friendly duplicate-username response.
            Throwable cause = ex;
            while (cause != null) {
                String message = cause.getMessage();
                if (message != null && message.toLowerCase(Locale.ROOT).contains("unique")) {
                    sendResponse(exchange, 409, "Username already exists");
                    return;
                }
                if (message != null && message.toLowerCase(Locale.ROOT).contains("duplicate")) {
                    sendResponse(exchange, 409, "Username already exists");
                    return;
                }
                if (message != null && message.toLowerCase(Locale.ROOT).contains("constraint")) {
                    sendResponse(exchange, 409, "Username already exists");
                    return;
                }
                cause = cause.getCause();
            }

            ex.printStackTrace();
            sendJson(exchange, 500, objectMapper.writeValueAsString(new ErrorResponse("Registration failed")));
        }
    }

    private void handleForgotPassword(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            handleOptions(exchange);
            return;
        }

        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method not allowed");
            return;
        }

        try {
            ForgotPasswordRequest request = readRequestBody(exchange.getRequestBody(), ForgotPasswordRequest.class);
            if (request.username == null || request.username.isBlank()) {
                sendResponse(exchange, 400, "username is required");
                return;
            }
            if (request.newPassword == null || request.newPassword.isBlank()) {
                sendResponse(exchange, 400, "newPassword is required");
                return;
            }

            User user = userRepository.findByUsername(request.username).orElse(null);
            if (user == null) {
                sendResponse(exchange, 404, "No account found for that username.");
                return;
            }

            user.setPasswordHash(PasswordUtil.hashPassword(request.newPassword.trim()));
            userRepository.save(user);
            sendJson(exchange, 200, objectMapper.writeValueAsString(new ResetPasswordResponse("Password reset successful. You can now log in with your new password.")));
        } catch (Throwable ex) {
            ex.printStackTrace();
            sendJson(exchange, 500, objectMapper.writeValueAsString(new ErrorResponse("Password reset failed")));
        }
    }

    private void handleProfileUpdate(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            handleOptions(exchange);
            return;
        }

        if (!"PUT".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method not allowed");
            return;
        }

        String authenticatedUsername = exchange.getAttribute("username") == null
                ? null
                : exchange.getAttribute("username").toString();

        if (authenticatedUsername == null || authenticatedUsername.isBlank()) {
            sendResponse(exchange, 401, "Unauthorized");
            return;
        }

        try {
            ProfileUpdateRequest request = readRequestBody(exchange.getRequestBody(), ProfileUpdateRequest.class);
            User user = userRepository.findByUsername(authenticatedUsername).orElse(null);
            if (user == null) {
                sendResponse(exchange, 401, "Unknown user. Please log in again.");
                return;
            }

            String nextUsername = request.username == null ? null : request.username.trim();
            String currentPassword = request.currentPassword;
            String newPassword = request.newPassword == null ? null : request.newPassword.trim();
            String githubLogin = request.githubLogin == null ? null : request.githubLogin.trim();

            boolean hasUsernameUpdate = nextUsername != null && !nextUsername.isBlank();
            boolean hasPasswordUpdate = newPassword != null && !newPassword.isBlank();
            boolean hasGithubUpdate = githubLogin != null;

            if (!hasUsernameUpdate && !hasPasswordUpdate && !hasGithubUpdate) {
                sendResponse(exchange, 400, "Provide a username, GitHub login, and/or newPassword to update profile.");
                return;
            }

            if (hasPasswordUpdate) {
                if (currentPassword == null || currentPassword.isBlank()) {
                    sendResponse(exchange, 400, "currentPassword is required to change password.");
                    return;
                }
                if (!PasswordUtil.verifyPassword(currentPassword, user.getPasswordHash())) {
                    sendResponse(exchange, 401, "Current password is incorrect.");
                    return;
                }
                user.setPasswordHash(PasswordUtil.hashPassword(newPassword));
            }

            if (hasUsernameUpdate && !nextUsername.equalsIgnoreCase(user.getUsername())) {
                User existing = userRepository.findByUsername(nextUsername).orElse(null);
                if (existing != null && !existing.getId().equals(user.getId())) {
                    sendResponse(exchange, 409, "Username already exists");
                    return;
                }
                user.setUsername(nextUsername);
            }

            if (hasGithubUpdate) {
                user.setGithubLogin(githubLogin);
            }

            User saved = userRepository.save(user);
            String refreshedToken = JwtUtil.generateToken(saved.getUsername());
            sendJson(exchange, 200, objectMapper.writeValueAsString(new ProfileUpdateResponse(saved.getUsername(), refreshedToken, saved.getGithubLogin())));
        } catch (Throwable ex) {
            ex.printStackTrace();
            sendJson(exchange, 500, objectMapper.writeValueAsString(new ErrorResponse("Profile update failed")));
        }
    }

    private <T> T readRequestBody(InputStream stream, Class<T> targetClass) throws IOException {
        return objectMapper.readValue(stream, targetClass);
    }

    private void sendJson(HttpExchange exchange, int statusCode, String json) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");

        if ("HEAD".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(statusCode, -1);
            exchange.close();
            return;
        }

        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");

        if ("HEAD".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(statusCode, -1);
            exchange.close();
            return;
        }

        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static class LoginRequest {
        public String username;
        public String password;
    }

    private static class RegisterRequest {
        public String username;
        public String password;
    }

    private static class ProfileUpdateRequest {
        public String username;
        public String currentPassword;
        public String newPassword;
        public String githubLogin;
    }

    private static class ForgotPasswordRequest {
        public String username;
        public String newPassword;
    }

    private static class AuthResponse {
        @JsonProperty("token")
        public final String token;

        public AuthResponse(String token) {
            this.token = token;
        }
    }

    /**
     * Simple error payload returned for failed registration attempts.
     */
    private static class ErrorResponse {
        @JsonProperty("error")
        public final String error;

        public ErrorResponse(String error) {
            this.error = error;
        }
    }

    private static class ProfileUpdateResponse {
        @JsonProperty("username")
        public final String username;

        @JsonProperty("token")
        public final String token;

        public ProfileUpdateResponse(String username, String token) {
            this.username = username;
            this.token = token;
        }
    }

    private static class ResetPasswordResponse {
        @JsonProperty("message")
        public final String message;

        public ResetPasswordResponse(String message) {
            this.message = message;
        }
    }
}
