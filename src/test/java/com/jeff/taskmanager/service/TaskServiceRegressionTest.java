package com.jeff.taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TaskServiceRegressionTest {

    private TaskService taskService;
    private InMemoryTaskRepository taskRepository;
    private InMemoryUserRepository userRepository;

    @BeforeEach
    void setUp() {
        taskRepository = new InMemoryTaskRepository();
        userRepository = new InMemoryUserRepository();
        taskService = new TaskService(taskRepository, userRepository);
        userRepository.save(new User("alice", "hash"));
    }

    @Test
    void updateTask_recomputesParentStatusFromSubtasks() {
        Task parent = new Task("Parent task", "Parent description", LocalDate.now(), false);
        Task childOne = new Task("Child 1", "", null, true);
        Task childTwo = new Task("Child 2", "", null, false);
        parent.setSubtasks(List.of(childOne, childTwo));

        Task saved = taskService.addTask(parent, "alice");
        assertEquals(Task.Status.IN_PROGRESS, saved.getStatus());

        Task updatePayload = new Task(saved.getTitle(), saved.getDescription(), saved.getDueDate(), false);
        Task updatedChildOne = new Task("Child 1", "", null, true);
        Task updatedChildTwo = new Task("Child 2", "", null, true);
        updatePayload.setSubtasks(List.of(updatedChildOne, updatedChildTwo));

        Task updated = taskService.updateTask(saved.getId(), updatePayload, "alice");

        assertTrue(updated.isCompleted());
        assertEquals(Task.Status.DONE, updated.getStatus());
    }

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
}
