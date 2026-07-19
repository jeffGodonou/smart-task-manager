package com.jeff.taskmanager.controler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.jeff.taskmanager.api.AuthFilter;
import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.service.TaskService;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * HTTP controller that exposes REST endpoints for task CRUD operations.
 *
 * <p>This controller validates authentication via {@link AuthFilter}
 * and routes requests to {@link TaskService}.</p>
 */
public class TaskController {
    private static final String PREFIX = "/api/tasks";
    private final TaskService taskService;
    private final ObjectMapper objectMapper;

    /**
     * Construct the controller with a {@link TaskService} dependency.
     *
     * @param taskService service used to perform task CRUD operations
     */
    public TaskController(TaskService taskService) {
        this.taskService = taskService;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Register task API routes and attach authentication filtering.
     *
     * @param server the HTTP server used for route registration
     */
    public void registerRoutes(HttpServer server) {
        HttpContext context = server.createContext(PREFIX, this::handleRequest);
        context.getFilters().add(new AuthFilter());
        HttpContext contextSlash = server.createContext(PREFIX + "/", this::handleRequest);
        contextSlash.getFilters().add(new AuthFilter());
    }

    private void handleRequest(HttpExchange exchange) throws IOException {
        try {
            String path = normalizePath(exchange.getRequestURI());
            String method = exchange.getRequestMethod();

            // Handle CORS preflight requests quickly and uniformly
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
                exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
                exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");
                exchange.sendResponseHeaders(204, -1);
            
                return;
            }

            // Route: /api/tasks -> list or create
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

            // Route: /api/tasks/{id} -> get, update, delete
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
        String username = getUsername(exchange);
        List<Task> tasks = taskService.listTasks(username);
        String json = objectMapper.writeValueAsString(tasks);
        sendJson(exchange, 200, json);
    }

    private void handleCreate(HttpExchange exchange) throws IOException {
        String username = getUsername(exchange);
        try {
            Task task = readRequestBody(exchange.getRequestBody(), Task.class);
            Task saved = taskService.addTask(task, username);
            String json = objectMapper.writeValueAsString(saved);
            sendJson(exchange, 201, json);
        } catch (IllegalArgumentException ex) {
            // Happens when token subject does not map to a persisted user (e.g., DB reset).
            sendResponse(exchange, 401, "Unknown user. Please log in again.");
        }
    }

    private void handleGet(HttpExchange exchange, Long id) throws IOException {
        String username = getUsername(exchange);
        Task task = taskService.getTaskById(id, username);
        if (task == null) {
            sendResponse(exchange, 404, "Task not found");
            return;
        }
        sendJson(exchange, 200, objectMapper.writeValueAsString(task));
    }

    private void handleUpdate(HttpExchange exchange, Long id) throws IOException {
        String username = getUsername(exchange);
        Task payload = readRequestBody(exchange.getRequestBody(), Task.class);
        Task updated = taskService.updateTask(id, payload, username);
        if (updated == null) {
            sendResponse(exchange, 404, "Task not found");
            return;
        }
        sendJson(exchange, 200, objectMapper.writeValueAsString(updated));
    }

    private void handleDelete(HttpExchange exchange, Long id) throws IOException {
        String username = getUsername(exchange);
        taskService.deleteTaskById(id, username);
        sendResponse(exchange, 204, "");
    }

    private <T> T readRequestBody(InputStream stream, Class<T> targetClass) throws IOException {
        return objectMapper.readValue(stream, targetClass);
    }

    private void sendJson(HttpExchange exchange, int statusCode, String json) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
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

    private String getUsername(HttpExchange exchange) {
        Object username = exchange.getAttribute("username");
        return username == null ? null : username.toString();
    }
}
