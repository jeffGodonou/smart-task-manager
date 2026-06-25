package com.jeff.taskmanager.api;

import com.sun.net.httpserver.Filter;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * HTTP filter that validates JWT bearer tokens for protected API endpoints.
 */
public class AuthFilter extends Filter {
    @Override
    public void doFilter(HttpExchange exchange, Chain chain) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            chain.doFilter(exchange);
            return;
        }

        List<String> authHeaders = exchange.getRequestHeaders().get("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            sendUnauthorized(exchange, "Missing Authorization header");
            return;
        }

        String header = authHeaders.get(0);
        if (!header.startsWith("Bearer ")) {
            sendUnauthorized(exchange, "Bearer token required");
            return;
        }

        String token = header.substring("Bearer ".length()).trim();
        try {
            String username = JwtUtil.validateToken(token);
            exchange.setAttribute("username", username);
            chain.doFilter(exchange);
        } catch (IllegalArgumentException e) {
            sendUnauthorized(exchange, e.getMessage());
        }
    }

    @Override
    public String description() {
        return "Validates JWT bearer tokens for protected endpoints.";
    }

    private void sendUnauthorized(HttpExchange exchange, String message) throws IOException {
        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(401, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
