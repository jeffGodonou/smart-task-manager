package com.jeff.taskmanager.api;

import com.jeff.taskmanager.controler.TaskController;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.service.TaskService;
import com.sun.net.httpserver.HttpServer;

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
        UserRepository userRepository = new UserRepository();
        TaskService taskService = new TaskService(new com.jeff.taskmanager.repository.TaskRepository(), userRepository);

        // Register authentication routes
        AuthController authController = new AuthController(userRepository);
        authController.registerRoutes(server);

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
}
