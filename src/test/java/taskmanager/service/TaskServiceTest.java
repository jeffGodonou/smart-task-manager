package taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

public class TaskServiceTest {

    private static class InMemoryTaskRepository extends TaskRepository {
        private final Map<Long, Task> store = new LinkedHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override
        public Task save(Task task) {
            if (task.getId() == null) task.setId(seq.getAndIncrement());
            store.put(task.getId(), task);
            return task;
        }

        @Override
        public void delete(Task task) {
            if (task.getId() != null) store.remove(task.getId());
            else store.values().removeIf(t -> t == task);
        }

        @Override
        public List<Task> findAll() {
            return new ArrayList<>(store.values());
        }

        @Override
        public Optional<Task> findByID(Long id) {
            return Optional.ofNullable(store.get(id));
        }

        @Override
        public Optional<Task> findByTitle(String title) {
            return store.values().stream()
                    .filter(t -> t.getTitle() != null && t.getTitle().equalsIgnoreCase(title))
                    .findFirst();
        }
    }

    private TaskService taskService;
    private InMemoryTaskRepository repository;
    private Task sample;

    @BeforeEach
    void setUp() {
        repository = new InMemoryTaskRepository();
        taskService = new TaskService(repository);
        sample = new Task("Test Task", "This is a test task", LocalDate.now(), false);
    }

    @Test
    void addTask_persists() {
        taskService.addTask(sample);
        assertEquals(1, taskService.listTasks().size());
    }

    @Test
    void deleteTask_removes() {
        taskService.addTask(sample);
        taskService.deleteTask(sample);
        assertEquals(0, taskService.listTasks().size());
    }

    @Test
    void listTasks_returnsAll() {
        Task a = new Task("A", "a", LocalDate.now(), false);
        Task b = new Task("B", "b", LocalDate.now(), false);
        taskService.addTask(a);
        taskService.addTask(b);
        assertEquals(2, taskService.listTasks().size());
    }

    @Test
    void updateTaskDescription_byId_persists() {
        taskService.addTask(sample);
        Long id = sample.getId();
        boolean updated = taskService.updateTaskDescription(id, "Updated");
        assertTrue(updated);
        assertEquals("Updated", repository.findByID(id).get().getDescription());
    }

    @Test
    void completeTask_setsCompleted() {
        taskService.addTask(sample);
        Long id = sample.getId();
        boolean result = taskService.completeTask(id);
        assertTrue(result);
        assertTrue(repository.findByID(id).get().isCompleted());
    }
}
