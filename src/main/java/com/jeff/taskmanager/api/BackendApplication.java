package com.jeff.taskmanager.api;

import com.jeff.taskmanager.controler.TaskController;
import com.jeff.taskmanager.service.TaskService;
import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;

public class BackendApplication {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        TaskService taskService = new TaskService();
        TaskController controller = new TaskController(taskService);
        controller.registerRoutes(server);
        server.start();
        System.out.println("Backend API started at http://localhost:8080/api/tasks");
    }
}
