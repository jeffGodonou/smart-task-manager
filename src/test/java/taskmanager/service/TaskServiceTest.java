package taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Core TaskService Tests (Pre-Phase 1 Baseline)
 *
 * <p>Legacy test suite covering basic task CRUD operations and access control.
 * These tests validate functionality before Phase 1 subtask architecture was added.</p>
 *
 * <p>Test approach:
 * - Uses in-memory mock repositories (InMemoryTaskRepository, InMemoryUserRepository)
 * - No database dependencies; tests run in isolation
 * - Validates: create, read, update, delete, filtering, ownership
 * </p>
 *
 * <p>Note: Phase 1 tests (TaskServicePhase1Test) supersede these for subtask scenarios,
 * but these baseline tests remain to ensure backward compatibility with task CRUD.</p>
 */
class TaskServiceTest {

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
        public Optional<Task> findByID(Long id) {
            return Optional.ofNullable(store.get(id));
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
                if (task.getOwner() != null && username.equalsIgnoreCase(task.getOwner().getUsername())) {
                    result.add(task);
                }
            }
            return result;
        }

        @Override
        public Optional<Task> findByTitle(String title) {
            return store.values().stream()
                    .filter(task -> task.getTitle() != null && task.getTitle().equalsIgnoreCase(title))
                    .findFirst();
        }

        @Override
        public List<Task> findAll() {
            return new ArrayList<>(store.values());
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

    private TaskService taskService;
    private TaskRepository taskRepository;
    private Task sample;
    private InMemoryUserRepository userRepository;

    @BeforeEach
    void setUp() {
        taskRepository = new InMemoryTaskRepository();
        userRepository = new InMemoryUserRepository();
        userRepository.save(new User("user", "password-hash"));
        taskService = new TaskService(taskRepository, userRepository);
        sample = new Task("Test Task", "This is a test task", LocalDate.now(), false);
    }

    @Test
    void addTask_persistsAndAssignsOwner() {
        Task saved = taskService.addTask(sample, "user");
        assertNotNull(saved.getId());
        assertEquals("user", saved.getOwner().getUsername());
        assertEquals(1, taskService.listTasks("user").size());
    }

    @Test
    void addTask_unknownUser_throws() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> taskService.addTask(sample, "missing"));
        assertEquals("Unknown user", error.getMessage());
    }

    @Test
    void deleteTaskById_removesTaskForOwner() {
        taskService.addTask(sample, "user");
        Long id = sample.getId();

        taskService.deleteTaskById(id, "user");

        assertTrue(taskService.listTasks("user").isEmpty());
    }

    @Test
    void deleteTaskById_forDifferentUser_doesNotRemove() {
        taskService.addTask(sample, "user");
        Long id = sample.getId();

        taskService.deleteTaskById(id, "other");

        assertEquals(1, taskService.listTasks("user").size());
    }

    @Test
    void listTasks_returnsOnlyUserTasks() {
        taskService.addTask(sample, "user");
        Task second = new Task("Other Task", "different owner", LocalDate.now(), false);
        User otherUser = new User("other", "password-hash");
        userRepository.save(otherUser);
        taskService = new TaskService(taskRepository, userRepository);
        taskService.addTask(second, "other");

        assertEquals(1, taskService.listTasks("user").size());
        assertEquals(1, taskService.listTasks("other").size());
    }

    @Test
    void updateTaskDescription_byId_persistsForOwner() {
        taskService.addTask(sample, "user");
        Long id = sample.getId();

        boolean updated = taskService.updateTaskDescription(id, "Updated description", "user");

        assertTrue(updated);
        assertEquals("Updated description", taskService.listTasks("user").get(0).getDescription());
    }

    @Test
    void listTasks_ordersManualPriorityBeforeDueDate() {
        Task laterTask = new Task("Later task", "", LocalDate.of(2026, 8, 20), false);
        Task earlierTask = new Task("Earlier task", "", LocalDate.of(2026, 8, 10), false);
        Task manualPriorityTask = new Task("Manual priority", "", LocalDate.of(2026, 8, 30), false);
        manualPriorityTask.setPriorityTask(true);

        taskService.addTask(laterTask, "user");
        taskService.addTask(earlierTask, "user");
        taskService.addTask(manualPriorityTask, "user");

        List<Task> ordered = taskService.listTasks("user");

        assertEquals(List.of("Manual priority", "Earlier task", "Later task"),
                ordered.stream().map(Task::getTitle).toList());
    }

    @Test
    void completeTask_setsCompletedForOwner() {
        taskService.addTask(sample, "user");
        Long id = sample.getId();

        boolean result = taskService.completeTask(id, "user");

        assertTrue(result);
        assertTrue(taskService.listTasks("user").get(0).isCompleted());
    }
}
