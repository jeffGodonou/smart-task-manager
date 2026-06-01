package com.jeff.taskmanager.controler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.service.TaskService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class TaskController {
    private static final String PREFIX = "/api/tasks";
    private final TaskService taskService;
    private final ObjectMapper objectMapper;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    public void registerRoutes(HttpServer server) {
        server.createContext(PREFIX, this::handleRequest);
        server.createContext(PREFIX + "/", this::handleRequest);
    }

    private void handleRequest(HttpExchange exchange) throws IOException {
        try {
            String path = normalizePath(exchange.getRequestURI());
            String method = exchange.getRequestMethod();

            if (path.equals(PREFIX) || path.equals(PREFIX + "/")) {
                switch (method) {
                    case "GET":
                        handleList(exchange);
                        break;
                    case "POST":
                        handleCreate(exchange);
                        break;
                    default:
                        sendResponse(exchange, 405, "Method not allowed");
                }
                return;
            }

            if (path.startsWith(PREFIX + "/")) {
                Long id = parseId(path.substring((PREFIX + "/").length()));
                if (id == null) {
                    sendResponse(exchange, 404, "Task not found");
                    return;
                }
                switch (method) {
                    case "GET":
                        handleGet(exchange, id);
                        break;
                    case "PUT":
                        handleUpdate(exchange, id);
                        break;
                    case "DELETE":
                        handleDelete(exchange, id);
                        break;
                    default:
                        sendResponse(exchange, 405, "Method not allowed");
                }
                return;
            }

            sendResponse(exchange, 404, "Not found");
        } catch (Exception ex) {
            ex.printStackTrace();
            sendResponse(exchange, 500, "Internal server error");
        }
    }

    private void handleList(HttpExchange exchange) throws IOException {
        List<Task> tasks = taskService.listTasks();
        String json = objectMapper.writeValueAsString(tasks);
        sendJson(exchange, 200, json);
    }

    private void handleCreate(HttpExchange exchange) throws IOException {
        Task task = readRequestBody(exchange.getRequestBody(), Task.class);
        Task saved = taskService.addTask(task);
        String json = objectMapper.writeValueAsString(saved);
        sendJson(exchange, 201, json);
    }

    private void handleGet(HttpExchange exchange, Long id) throws IOException {
        Task task = taskService.getTaskById(id);
        if (task == null) {
            sendResponse(exchange, 404, "Task not found");
            return;
        }
        sendJson(exchange, 200, objectMapper.writeValueAsString(task));
    }

    private void handleUpdate(HttpExchange exchange, Long id) throws IOException {
        Task payload = readRequestBody(exchange.getRequestBody(), Task.class);
        Task updated = taskService.updateTask(id, payload);
        if (updated == null) {
            sendResponse(exchange, 404, "Task not found");
            return;
        }
        sendJson(exchange, 200, objectMapper.writeValueAsString(updated));
    }

    private void handleDelete(HttpExchange exchange, Long id) throws IOException {
        taskService.deleteTaskById(id);
        sendResponse(exchange, 204, "");
    }

    private <T> T readRequestBody(InputStream stream, Class<T> targetClass) throws IOException {
        return objectMapper.readValue(stream, targetClass);
    }

    private void sendJson(HttpExchange exchange, int statusCode, String json) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private String normalizePath(URI uri) {
        return uri.getPath();
    }

    private Long parseId(String raw) {
        try {
            return Long.valueOf(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
