package taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.service.TaskService;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDate;

public class TaskServiceTest {
    @Test
    public void testAddTask() {
        TaskService taskService = new TaskService();
        Task task = new Task("Test Task", "This is a test task", LocalDate.now(), false);
        taskService.addTask(task);
        assertEquals(1, taskService.listTasks().size());
    }

    @Test
    public void testRemoveTask() {
        TaskService taskService = new TaskService();
        Task task = new Task("test", "This is a test task", LocalDate.now(), false);
        taskService.addTask(task);
        taskService.deleteTask(task);
        assertEquals(0, taskService.listTasks().size());
    }
}
