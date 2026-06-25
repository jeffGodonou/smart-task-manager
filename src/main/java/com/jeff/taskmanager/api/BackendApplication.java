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
 * routes, and starts the application on port 8080.</p>
 */
public class BackendApplication {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        UserRepository userRepository = new UserRepository();
        TaskService taskService = new TaskService(new com.jeff.taskmanager.repository.TaskRepository(), userRepository);

        AuthController authController = new AuthController(userRepository);
        authController.registerRoutes(server);

        TaskController controller = new TaskController(taskService);
        controller.registerRoutes(server);

        server.start();
        System.out.println("Backend API started at http://localhost:8080/api/tasks");
    }
}
