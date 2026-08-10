package taskmanager.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
// import com.jeff.taskmanager.api.AuthFilter;
import com.jeff.taskmanager.api.JwtUtil;
import com.jeff.taskmanager.controler.TaskController;
import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.service.TaskService;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/**
 * End-to-End API Integration Tests
 *
 * <p>Full HTTP integration tests for the task management API.
 * Spins up an actual HttpServer and tests the complete request-response cycle:
 * </p>
 *
 * <ul>
 *   <li>HTTP client sends requests to running server (localhost)</li>
 *   <li>Server deserializes JSON to Task objects via Jackson</li>
 *   <li>TaskController routes requests and calls TaskService</li>
 *   <li>TaskService enforces business rules and calls repositories</li>
 *   <li>Server serializes responses back to JSON</li>
 *   <li>Client receives and validates responses</li>
 * </ul>
 *
 * <p>Validates:</p>
 * <ul>
 *   <li>Jackson JSON serialization (parent-child relationships preserved)</li>
 *   <li>HTTP status codes (201 Created, 200 OK, 409 Conflict, etc.)</li>
 *   <li>Task CRUD operations end-to-end</li>
 *   <li>New parent-child model works through full stack</li>
 * </ul>
 */
class TaskControllerE2ETest {

    private static final String USERNAME = "test-user";

    private HttpServer server;
    private HttpClient client;
    private String baseUrl;
    private ObjectMapper objectMapper;

    /**
     * In-memory task repository for E2E testing.
     * 
     * Extends real TaskRepository with a HashMap-backed store.
     * Auto-generates IDs and filters tasks by ownership and parent relationship.
     * 
     * Critical: findAllByUser() filters WHERE parent_task_id IS NULL
     * to match production behavior (only root tasks returned).
     */
    private static class InMemoryTaskRepository extends TaskRepository {
        private final Map<Long, Task> store = new LinkedHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override
        public Task save(Task task) {
            if (task.getId() == null) {
                task.setId(seq.getAndIncrement());
            }
            store.put(task.getId(), task);
            return task;
        }

        @Override
        public void delete(Task task) {
            if (task.getId() != null) {
                store.remove(task.getId());
            } else {
                store.values().removeIf(t -> t == task);
            }
        }

        @Override
        public Optional<Task> findByIdAndUser(Long id, String username) {
            return Optional.ofNullable(store.get(id))
                    .filter(task -> task.getOwner() != null && username.equalsIgnoreCase(task.getOwner().getUsername()));
        }

        @Override
        public List<Task> findAllByUser(String username) {
            List<Task> result = new ArrayList<>();
            for (Task task : store.values()) {
                // Only return root tasks (those with no parent)
                if (task.getOwner() != null && username.equalsIgnoreCase(task.getOwner().getUsername())
                        && task.getParentTask() == null) {
                    result.add(task);
                }
            }
            return result;
        }
    }

    private static class InMemoryUserRepository extends UserRepository {
        private final Map<String, User> store = new LinkedHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override
        public Optional<User> findByUsername(String username) {
            if (username == null) {
                return Optional.empty();
            }
            return store.values().stream()
                    .filter(user -> username.equalsIgnoreCase(user.getUsername()))
                    .findFirst();
        }

        @Override
        public User save(User user) {
            if (user.getId() == null) {
                user.setId(seq.getAndIncrement());
            }
            store.put(user.getUsername().toLowerCase(), user);
            return user;
        }
    }

    /**
     * Start HTTP server with in-memory repositories.
     * Initializes ObjectMapper with Jackson modules for LocalDate serialization.
     * Each test gets a fresh server instance on a random available port.
     */
    @BeforeEach
    void setUp() throws Exception {
        InMemoryTaskRepository taskRepository = new InMemoryTaskRepository();
        InMemoryUserRepository userRepository = new InMemoryUserRepository();
        userRepository.save(new User(USERNAME, "password-hash"));

        TaskService taskService = new TaskService(taskRepository, userRepository);
        TaskController taskController = new TaskController(taskService);

        server = HttpServer.create(new InetSocketAddress(0), 0);
        taskController.registerRoutes(server);
        server.start();

        int port = server.getAddress().getPort();
        baseUrl = "http://localhost:" + port;
        client = HttpClient.newHttpClient();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Stop the HTTP server after each test.
     * Ensures clean state for next test (no port conflicts, resource leaks).
     */
    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    /**
     * Full CRUD cycle end-to-end test.
     * 
     * Validates:
     * 1. POST /tasks creates a task, returns 201 with persisted ID
     * 2. GET /tasks lists all tasks, returns 200 with array
     * 3. PUT /tasks/{id} updates task, returns 200 with new state
     * 4. DELETE /tasks/{id} removes task, returns 204
     * 
     * This test exercises Jackson serialization of the new parent-child Task model
     * through the full HTTP stack, confirming the migration didn't break API contracts.
     */
    @Test
    void createListUpdateDeleteTask_endToEnd() throws Exception {
        Task task = new Task("End-to-End Task", "Create a task from the API", LocalDate.now().plusDays(1), false);
        HttpRequest createRequest = authorizedRequest("/api/tasks")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(task)))
                .build();

        HttpResponse<String> createResponse = client.send(createRequest, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, createResponse.statusCode());

        Task created = objectMapper.readValue(createResponse.body(), Task.class);
        assertNotNull(created.getId());
        assertEquals("End-to-End Task", created.getTitle());

        HttpResponse<String> listResponse = client.send(authorizedRequest("/api/tasks").GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, listResponse.statusCode());
        List<Task> tasks = objectMapper.readValue(listResponse.body(), new TypeReference<List<Task>>() {});
        assertEquals(1, tasks.size());
        assertEquals(created.getId(), tasks.get(0).getId());

        created.setDescription("Updated from E2E test");
        HttpRequest updateRequest = authorizedRequest("/api/tasks/" + created.getId())
                .PUT(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(created)))
                .build();
        HttpResponse<String> updateResponse = client.send(updateRequest, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, updateResponse.statusCode());

        Task updated = objectMapper.readValue(updateResponse.body(), Task.class);
        assertEquals("Updated from E2E test", updated.getDescription());

        HttpRequest deleteRequest = authorizedRequest("/api/tasks/" + created.getId())
                .DELETE()
                .build();
        HttpResponse<String> deleteResponse = client.send(deleteRequest, HttpResponse.BodyHandlers.ofString());
        assertEquals(204, deleteResponse.statusCode());

        HttpResponse<String> listAfterDelete = client.send(authorizedRequest("/api/tasks").GET().build(), HttpResponse.BodyHandlers.ofString());
        List<Task> remaining = objectMapper.readValue(listAfterDelete.body(), new TypeReference<List<Task>>() {});
        assertTrue(remaining.isEmpty());
    }

        @Test
        void updateTaskWithCompletedSubtasks_returnsDoneFromController() throws Exception {
        Task task = new Task("Parent task", "Created with subtasks", LocalDate.now().plusDays(1), false);
        task.setSubtasks(List.of(
            new Task("Child 1", "", null, true),
            new Task("Child 2", "", null, false)
        ));

        HttpRequest createRequest = authorizedRequest("/api/tasks")
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(task)))
            .build();

        HttpResponse<String> createResponse = client.send(createRequest, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, createResponse.statusCode());

        Task created = objectMapper.readValue(createResponse.body(), Task.class);
        assertEquals(Task.Status.IN_PROGRESS, created.getStatus());
        assertFalse(created.isCompleted());

        Task updatePayload = new Task(created.getTitle(), "All subtasks completed", created.getDueDate(), false);
        updatePayload.setSubtasks(List.of(
            new Task("Child 1", "", null, true),
            new Task("Child 2", "", null, true)
        ));

        HttpRequest updateRequest = authorizedRequest("/api/tasks/" + created.getId())
            .PUT(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(updatePayload)))
            .build();

        HttpResponse<String> updateResponse = client.send(updateRequest, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, updateResponse.statusCode());

        Task updated = objectMapper.readValue(updateResponse.body(), Task.class);
        assertEquals(Task.Status.DONE, updated.getStatus());
        assertTrue(updated.isCompleted());
        assertEquals(2, updated.getSubtasks().size());
        assertTrue(updated.getSubtasks().get(0).isCompleted());
        assertTrue(updated.getSubtasks().get(1).isCompleted());
        }

    @Test
    void requestWithoutAuthorization_returnsUnauthorized() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/tasks"))
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertEquals(401, response.statusCode());
        assertTrue(response.body().contains("Missing Authorization header"));
    }

    private HttpRequest.Builder authorizedRequest(String path) {
        String token = JwtUtil.generateToken(USERNAME);
        return HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json");
    }
}
