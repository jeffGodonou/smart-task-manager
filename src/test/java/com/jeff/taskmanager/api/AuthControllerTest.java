package com.jeff.taskmanager.api;

import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.util.PasswordUtil;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

// import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class AuthControllerTest {

    @Test
    void optionsRequestToRegisterReturnsCORSHeaders() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        AuthController controller = new AuthController(new StubUserRepository());
        controller.registerRoutes(server);
        server.start();

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + server.getAddress().getPort() + "/api/auth/register"))
                    .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                    .header("Origin", "http://localhost:5173")
                    .header("Access-Control-Request-Method", "POST")
                    .header("Access-Control-Request-Headers", "content-type")
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            assertEquals(204, response.statusCode());
            assertEquals("*", response.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
            assertTrue(response.headers().firstValue("Access-Control-Allow-Methods").orElseThrow().contains("POST"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void registerReturnsServerErrorWhenPersistenceFails() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        AuthController controller = new AuthController(new FailingUserRepository());
        controller.registerRoutes(server);
        server.start();

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + server.getAddress().getPort() + "/api/auth/register"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("{\"username\":\"newuser\",\"password\":\"secret123\"}"))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            assertEquals(500, response.statusCode());
            assertTrue(response.body().contains("Registration failed"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void updateProfileCanChangeUsernameAndPassword() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        InMemoryUserRepository userRepository = new InMemoryUserRepository();
        userRepository.save(new User("testuser", PasswordUtil.hashPassword("old-password")));

        AuthController controller = new AuthController(userRepository);
        controller.registerRoutes(server);
        server.start();

        try {
            HttpClient client = HttpClient.newHttpClient();
            String token = JwtUtil.generateToken("testuser");

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + server.getAddress().getPort() + "/api/auth/profile"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .PUT(HttpRequest.BodyPublishers.ofString("""
                            {"username":"testuser2","currentPassword":"old-password","newPassword":"new-password"}
                            """))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            assertEquals(200, response.statusCode());
            assertTrue(response.body().contains("\"username\":\"testuser2\""));

            HttpRequest loginWithNewCredentials = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + server.getAddress().getPort() + "/api/auth/login"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("""
                            {"username":"testuser2","password":"new-password"}
                            """))
                    .build();

            HttpResponse<String> loginResponse = client.send(loginWithNewCredentials, HttpResponse.BodyHandlers.ofString());
            assertEquals(200, loginResponse.statusCode());
            assertTrue(loginResponse.body().contains("token"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void updateProfileRejectsWrongCurrentPassword() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        InMemoryUserRepository userRepository = new InMemoryUserRepository();
        userRepository.save(new User("testuser", PasswordUtil.hashPassword("old-password")));

        AuthController controller = new AuthController(userRepository);
        controller.registerRoutes(server);
        server.start();

        try {
            HttpClient client = HttpClient.newHttpClient();
            String token = JwtUtil.generateToken("testuser");

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + server.getAddress().getPort() + "/api/auth/profile"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .PUT(HttpRequest.BodyPublishers.ofString("""
                            {"username":"testuser","currentPassword":"wrong-password","newPassword":"new-password"}
                            """))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            assertEquals(401, response.statusCode());
            assertTrue(response.body().contains("Current password is incorrect"));
        } finally {
            server.stop(0);
        }
    }

    private static class StubUserRepository extends UserRepository {
        @Override
        public Optional<User> findByUsername(String username) {
            return Optional.empty();
        }

        @Override
        public User save(User user) {
            return user;
        }
    }

    private static class FailingUserRepository extends UserRepository {
        @Override
        public Optional<User> findByUsername(String username) {
            return Optional.empty();
        }

        @Override
        public User save(User user) {
            throw new RuntimeException("simulated persistence failure");
        }
    }

    private static class InMemoryUserRepository extends UserRepository {
        private final Map<String, User> users = new LinkedHashMap<>();
        private long nextId = 1L;

        @Override
        public Optional<User> findByUsername(String username) {
            if (username == null) {
                return Optional.empty();
            }
            return Optional.ofNullable(users.get(username.toLowerCase()));
        }

        @Override
        public User save(User user) {
            if (user.getId() == null) {
                user.setId(nextId++);
            }

            users.entrySet().removeIf(entry -> entry.getValue().getId().equals(user.getId()));
            users.put(user.getUsername().toLowerCase(), user);
            return user;
        }
    }
}
