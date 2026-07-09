package com.jeff.taskmanager.api;

import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.model.User;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
}
