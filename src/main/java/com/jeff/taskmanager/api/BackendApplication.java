package com.jeff.taskmanager.api;

import com.jeff.taskmanager.controler.TaskController;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.service.TaskService;
import com.jeff.taskmanager.service.DataMigrationService;
import com.jeff.taskmanager.util.PersistanceManager;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.net.InetSocketAddress;

/**
 * Backend application launcher for the REST API server.
 *
 * <p>This class initializes the HTTP server, registers authentication and task
 * routes, and starts the application on the configured port.</p>
 */
public class BackendApplication {
    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) throws Exception {
        // Resolve port and initialize the HTTP server
        int port = resolvePort(System.getenv("PORT"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // Initialize repositories and services
        PersistanceManager.getEmf();
        
        // Run data migrations before starting the application
        DataMigrationService.runMigrations();
        
        UserRepository userRepository = new UserRepository();
        TaskService taskService = new TaskService(
                new com.jeff.taskmanager.repository.TaskRepository(),
                userRepository,
                new com.jeff.taskmanager.repository.ProjectRepository()
        );

        // Register authentication routes
        AuthController authController = new AuthController(userRepository);
        authController.registerRoutes(server);

        ProjectController projectController = new ProjectController(new com.jeff.taskmanager.repository.ProjectRepository(), userRepository);
        projectController.registerRoutes(server);

        // Expose a lightweight unauthenticated health endpoint for hosting checks
        server.createContext("/health", BackendApplication::handleHealth);

        // Expose a root endpoint with API documentation
        server.createContext("/", BackendApplication::handleRoot);

        // Register task API routes
        TaskController controller = new TaskController(taskService);
        controller.registerRoutes(server);

        server.start();
        System.out.println("Backend API started at http://0.0.0.0:" + port + "/api/tasks");
    }

    static int resolvePort(String portValue) {
        if (portValue == null || portValue.isBlank()) {
            return DEFAULT_PORT;
        }

        try {
            return Integer.parseInt(portValue);
        } catch (NumberFormatException ex) {
            return DEFAULT_PORT;
        }
    }

    private static void handleHealth(HttpExchange exchange) throws IOException {
        if ("HEAD".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
            return;
        }

        byte[] bytes = "ok".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private static void handleRoot(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if ("HEAD".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
            return;
        }

        String apiDocs = """
            {
              "service": "Smart Task Manager Backend API",
              "version": "1.0",
              "endpoints": {
                "health": "GET /health - Health check (no auth required)",
                "auth": {
                  "register": "POST /api/auth/register - Register new user",
                  "login": "POST /api/auth/login - Login and get JWT token"
                },
                "tasks": {
                  "list": "GET /api/tasks - List all tasks (auth required)",
                  "create": "POST /api/tasks - Create new task (auth required)",
                  "get": "GET /api/tasks/{id} - Get task by ID (auth required)",
                  "update": "PUT /api/tasks/{id} - Update task (auth required)",
                  "delete": "DELETE /api/tasks/{id} - Delete task (auth required)"
                }
              }
            }""";
        
        byte[] bytes = apiDocs.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
