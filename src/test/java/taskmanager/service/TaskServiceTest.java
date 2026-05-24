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

    @Test
    public void testListTask() {
        TaskService taskService = new TaskService();
        Task test1 = new Task("test", "This is a first test task", LocalDate.now(), false);
        Task test2 = new Task("test", "This is a second test task", LocalDate.now(), false);
        taskService.addTask(test1);
        taskService.addTask(test2);
        assertEquals(2, taskService.listTasks().size());
    }

    @Test
    public void testUpdateTaskDescription() {
        TaskService taskService = new TaskService();
        Task test = new Task("test", "This is a test task", LocalDate.now(), false);
        String description = test.getDescription();
        taskService.addTask(test);
        taskService.updateTaskDescription("test", "This is an update");
        assertNotEquals(test.getDescription(), description);
    }

    @Test
    public void testUpdateTaskDueDate() {
        TaskService taskService = new TaskService();
        Task test = new Task("test", "This is a test task", LocalDate.now(), false);
        LocalDate dueDate = test.getDueDate();
        taskService.addTask(test);
        taskService.updateTaskDueDate("test", LocalDate.of(2026, 05, 30));
        assertNotEquals(test.getDueDate(), dueDate);
    }

     @Test
    public void testUpdateTaskPriority() {
        TaskService taskService = new TaskService();
        Task test = new Task("test", "This is a test task", LocalDate.now(), false);
        String priority = test.getPriority();
        taskService.addTask(test);
        taskService.updateTaskPriority("test", "Low");;
        assertNotEquals(test.getPriority(), priority);
    }
}
