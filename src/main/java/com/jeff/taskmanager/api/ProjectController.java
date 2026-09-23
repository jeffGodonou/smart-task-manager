package com.jeff.taskmanager.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.jeff.taskmanager.model.Project;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.ProjectRepository;
import com.jeff.taskmanager.repository.UserRepository;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class ProjectController {
    private static final String PREFIX = "/api/projects";
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ProjectController(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    public void registerRoutes(HttpServer server) {
        HttpContext listContext = server.createContext(PREFIX, this::handleRequest);
        listContext.getFilters().add(new AuthFilter());

        HttpContext detailContext = server.createContext(PREFIX + "/", this::handleRequest);
        detailContext.getFilters().add(new AuthFilter());
    }

    private void handleRequest(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        if ((PREFIX.equals(path) || (PREFIX + "/").equals(path)) && "GET".equalsIgnoreCase(method)) {
            handleList(exchange);
            return;
        }

        if ((PREFIX.equals(path) || (PREFIX + "/").equals(path)) && "POST".equalsIgnoreCase(method)) {
            try {
                handleCreate(exchange);
            } catch (Exception ex) {
                ex.printStackTrace();
                sendJson(exchange, 500, "{\"error\":\"Failed to create project\"}");
            }
            return;
        }

        if (path.startsWith(PREFIX + "/")) {
            Long id = parseId(path.substring((PREFIX + "/").length()));
            if (id == null) {
                sendResponse(exchange, 404, "Project not found");
                return;
            }

            if ("GET".equalsIgnoreCase(method)) {
                handleGet(exchange, id);
                return;
            }

            if ("PUT".equalsIgnoreCase(method)) {
                try {
                    handleUpdate(exchange, id);
                } catch (Exception ex) {
                    ex.printStackTrace();
                    sendJson(exchange, 500, "{\"error\":\"Failed to update project\"}");
                }
                return;
            }
        }

        sendResponse(exchange, 405, "Method not allowed");
    }

    private void handleList(HttpExchange exchange) throws IOException {
        String username = getUsername(exchange);
        if (username == null || username.isBlank()) {
            sendResponse(exchange, 401, "Unauthorized");
            return;
        }

        List<Project> projects = projectRepository.findByOwnerUsername(username);
        sendJson(exchange, 200, objectMapper.writeValueAsString(projects));
    }

    private void handleGet(HttpExchange exchange, Long id) throws IOException {
        String username = getUsername(exchange);
        if (username == null || username.isBlank()) {
            sendResponse(exchange, 401, "Unauthorized");
            return;
        }

        Project project = projectRepository.findByIdAndOwnerUsername(id, username).orElse(null);
        if (project == null) {
            sendResponse(exchange, 404, "Project not found");
            return;
        }

        sendJson(exchange, 200, objectMapper.writeValueAsString(project));
    }

    private void handleCreate(HttpExchange exchange) throws IOException {
        String username = getUsername(exchange);
        if (username == null || username.isBlank()) {
            sendResponse(exchange, 401, "Unauthorized");
            return;
        }

        Project payload;
        try {
            payload = readRequestBody(exchange.getRequestBody(), Project.class);
        } catch (Exception e) {
            String rawMessage = e.getMessage() == null ? "Unknown error" : e.getMessage();
            String safeMessage = rawMessage.replace("\\", "\\\\").replace("\"", "\\\"");
            sendJson(exchange, 400, "{\"error\":\"Invalid project payload: " + safeMessage + "\"}");
            return;
        }

        if (payload == null) {
            sendResponse(exchange, 400, "Project payload is required");
            return;
        }

        String name = payload.getName() == null ? "" : payload.getName().trim();
        String repositoryUrl = payload.getRepositoryUrl() == null ? "" : payload.getRepositoryUrl().trim();
        String githubAccount = payload.getGithubAccount() == null ? "" : payload.getGithubAccount().trim();
        String localPath = payload.getLocalPath() == null ? "" : payload.getLocalPath().trim();
        Project.ProjectType projectType = payload.getProjectType() == null ? Project.ProjectType.NON_CODING : payload.getProjectType();

        if (name.isBlank()) {
            sendResponse(exchange, 400, "Project name is required");
            return;
        }

        if (projectType == Project.ProjectType.CODING && repositoryUrl.isBlank() && localPath.isBlank()) {
            sendResponse(exchange, 400, "Coding projects require a repository URL or local path");
            return;
        }

        if (projectType == Project.ProjectType.NON_CODING) {
            if (payload.getDescription() == null || payload.getDescription().isBlank()) {
                payload.setDescription("General project overview");
            }
            if (payload.getProjectCategory() == null || payload.getProjectCategory().isBlank()) {
                payload.setProjectCategory("General");
            }
        }

        payload.setProjectType(projectType);
        payload.setGithubAccount(githubAccount);

        User owner = userRepository.findByUsername(username).orElse(null);
        if (owner == null) {
            sendResponse(exchange, 401, "Unknown user. Please log in again.");
            return;
        }

        payload.setOwner(owner);
        Project saved = projectRepository.save(payload);
        sendJson(exchange, 201, objectMapper.writeValueAsString(saved));
    }

    private void handleUpdate(HttpExchange exchange, Long id) throws IOException {
        String username = getUsername(exchange);
        if (username == null || username.isBlank()) {
            sendResponse(exchange, 401, "Unauthorized");
            return;
        }

        Project existing = projectRepository.findByIdAndOwnerUsername(id, username).orElse(null);
        if (existing == null) {
            sendResponse(exchange, 404, "Project not found");
            return;
        }

        Project payload = readRequestBody(exchange.getRequestBody(), Project.class);
        if (payload == null) {
            sendResponse(exchange, 400, "Project payload is required");
            return;
        }

        if (payload.getName() != null && !payload.getName().trim().isEmpty()) {
            existing.setName(payload.getName().trim());
        }
        if (payload.getDescription() != null) {
            existing.setDescription(payload.getDescription());
        }
        if (payload.getProjectType() != null) {
            existing.setProjectType(payload.getProjectType());
        }
        if (payload.getProjectCategory() != null) {
            existing.setProjectCategory(payload.getProjectCategory());
        }
        if (payload.getEndDate() != null) {
            existing.setEndDate(payload.getEndDate());
        }
        if (payload.getRepositoryUrl() != null) {
            existing.setRepositoryUrl(payload.getRepositoryUrl());
        }
        if (payload.getGithubAccount() != null) {
            existing.setGithubAccount(payload.getGithubAccount());
        }
        if (payload.getLocalPath() != null) {
            existing.setLocalPath(payload.getLocalPath());
        }
        if (payload.getBranch() != null) {
            existing.setBranch(payload.getBranch());
        }

        Project saved = projectRepository.save(existing);
        sendJson(exchange, 200, objectMapper.writeValueAsString(saved));
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
