package com.jeff.taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 1 Subtask Architecture Domain Rule Tests
 *
 * <p>Comprehensive test suite validating Phase 1 business rules for task subtasks:</p>
 *
 * <ul>
 *   <li><strong>Max 4 subtasks:</strong> A task can have 0-4 subtasks; 5+ rejected with 409</li>
 *   <li><strong>No nesting:</strong> Subtasks cannot have subtasks (max depth = 1)</li>
 *   <li><strong>Non-empty titles:</strong> All subtasks must have trimmed, non-empty titles</li>
 *   <li><strong>Derived completion:</strong> Parent completion auto-computes from children
 *       <ul>
 *         <li>All children done → parent DONE</li>
 *         <li>Some done → parent IN_PROGRESS</li>
 *         <li>None done → parent TO DO </li>
 *       </ul>
 *   </li>
 *   <li><strong>Ownership propagation:</strong> All subtasks inherit parent's owner</li>
 *   <li><strong>Field defaults:</strong> Subtasks inherit priority and due date from parent</li>
 *   <li><strong>Update validation:</strong> Rules enforced on both create and update</li>
 * </ul>
 *
 * <p>These tests ensure production-ready data integrity and error handling
 * for the subtask feature rollout.</p>
 */
@DisplayName("TaskService Phase 1 Domain Rules")
class TaskServicePhase1Test {
    private TaskService taskService;
    private TaskRepository mockTaskRepository;
    private UserRepository mockUserRepository;
    private User testUser;

    /**
     * Set up test fixtures before each test.
     * Initializes mock repositories and TaskService with test user context.
     */
    @BeforeEach
    void setup() {
        mockTaskRepository = new MockTaskRepository();
        mockUserRepository = new MockUserRepository();
        taskService = new TaskService(mockTaskRepository, mockUserRepository);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setPasswordHash("hashed");
    }

    /**
     * Boundary test: Task with 0 subtasks (valid).
     * Expected: Succeeds; empty subtask list is allowed.
     */
    @Test
    @DisplayName("Should allow task with 0 subtasks")
    void testAddTaskWithNoSubtasks() {
        Task task = new Task("Buy groceries", "Milk, eggs", LocalDate.now().plusDays(1), false);
        task.setSubtasks(new ArrayList<>());

        Task saved = taskService.addTask(task, "testuser");

        assertNotNull(saved);
        assertEquals(0, saved.getSubtasks().size());
    }

    /**
     * Boundary test: Tasks with 1-4 subtasks (all valid).
     * Expected: All counts accepted; no rejection or truncation.
     */
    @Test
    @DisplayName("Should allow task with 1-4 subtasks")
    void testAddTaskWithValidSubtaskCounts() {
        for (int count = 1; count <= 4; count++) {
            Task task = new Task("Parent task", "", LocalDate.now(), false);
            List<Task> children = new ArrayList<>();

            for (int i = 1; i <= count; i++) {
                Task child = new Task("Subtask " + i, "", null, false);
                children.add(child);
            }
            task.setSubtasks(children);

            Task saved = taskService.addTask(task, "testuser");

            assertEquals(count, saved.getSubtasks().size());
        }
    }

    /**
     * Business rule enforcement: Reject tasks with 5+ subtasks.
     * Expected: TaskRuleViolationException thrown with clear message.
     * This ensures the API will return 409 Conflict to client.
     */
    @Test
    @DisplayName("Should reject task with > 4 subtasks")
    void testAddTaskWithTooManySubtasks() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        List<Task> children = new ArrayList<>();

        for (int i = 1; i <= 5; i++) {
            Task child = new Task("Subtask " + i, "", null, false);
            children.add(child);
        }
        task.setSubtasks(children);

        TaskRuleViolationException ex = assertThrows(
            TaskRuleViolationException.class,
            () -> taskService.addTask(task, "testuser")
        );

        assertEquals("A task cannot have more than 4 subtasks.", ex.getMessage());
    }

    /**
     * Data validation: Reject subtasks with empty title.
     * Expected: TaskRuleViolationException with descriptive message.
     * Prevents creation of untitled, unmeaningful subtasks.
     */
    @Test
    @DisplayName("Should reject subtask with empty title")
    void testAddTaskWithEmptySubtaskTitle() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child = new Task("", "", null, false);
        task.setSubtasks(List.of(child));

        TaskRuleViolationException ex = assertThrows(
            TaskRuleViolationException.class,
            () -> taskService.addTask(task, "testuser")
        );

        assertEquals("Subtasks must have a non-empty title.", ex.getMessage());
    }

    /**
     * Data validation: Reject subtasks with whitespace-only title.
     * Expected: TaskRuleViolationException (same as empty).
     * Ensures meaningful titles; "    " is not a valid task description.
     */
    @Test
    @DisplayName("Should reject subtask with whitespace-only title")
    void testAddTaskWithWhitespaceSubtaskTitle() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child = new Task("   ", "", null, false);
        task.setSubtasks(List.of(child));

        TaskRuleViolationException ex = assertThrows(
            TaskRuleViolationException.class,
            () -> taskService.addTask(task, "testuser")
        );

        assertEquals("Subtasks must have a non-empty title.", ex.getMessage());
    }

    /**
     * Data normalization: Subtask titles should be trimmed.
     * Input: "  Subtask with spaces  "
     * Expected: Saved as "Subtask with spaces"
     * Prevents user confusion from leading/trailing whitespace.
     */
    @Test
    @DisplayName("Should trim subtask titles")
    void testSubtaskTitlesTrimmed() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child = new Task("  Subtask with spaces  ", "", null, false);
        task.setSubtasks(List.of(child));

        Task saved = taskService.addTask(task, "testuser");

        assertEquals("Subtask with spaces", saved.getSubtasks().get(0).getTitle());
    }

    /**
     * Nesting prevention: Phase 1 prohibits nested subtasks (max depth = 1).
     * Scenario: Attempt to create grandchild (subtask of a subtask).
     * Expected: TaskRuleViolationException rejects the structure.
     * Rationale: Simplifies UI, reduces cognitive load, prevents infinite nesting.
     */
    @Test
    @DisplayName("Should reject nested subtasks (subtask with subtasks)")
    void testRejectNestedSubtasks() {
        Task grandChild = new Task("Grand child", "", null, false);

        Task child = new Task("Child", "", null, false);
        child.setSubtasks(List.of(grandChild));

        Task parent = new Task("Parent task", "", LocalDate.now(), false);
        parent.setSubtasks(List.of(child));

        TaskRuleViolationException ex = assertThrows(
            TaskRuleViolationException.class,
            () -> taskService.addTask(parent, "testuser")
        );

        assertEquals("Nested subtasks are not allowed.", ex.getMessage());
    }

    /**
     * Derived completion rule 1: All children done → parent DONE.
     * Rule: isCompleted=true AND status=DONE only when all children completed.
     * Prevents manual parent completion when children still pending.
     */
    @Test
    @DisplayName("Should derive parent completion: all completed -> parent completed")
    void testDerivedCompletionAllDone() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child1 = new Task("Subtask 1", "", null, true);
        Task child2 = new Task("Subtask 2", "", null, true);
        task.setSubtasks(List.of(child1, child2));

        Task saved = taskService.addTask(task, "testuser");

        assertTrue(saved.isCompleted());
        assertEquals(Task.Status.DONE, saved.getStatus());
    }

    /**
     * Derived completion rule 2: Some children done → parent IN_PROGRESS.
     * Rule: Work has started but not finished; reflects actual project state.
     * isCompleted=false, status=IN_PROGRESS signals ongoing work.
     */
    @Test
    @DisplayName("Should derive parent completion: some completed -> parent in progress")
    void testDerivedCompletionPartial() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child1 = new Task("Subtask 1", "", null, true);
        Task child2 = new Task("Subtask 2", "", null, false);
        task.setSubtasks(List.of(child1, child2));

        Task saved = taskService.addTask(task, "testuser");

        assertFalse(saved.isCompleted());
        assertEquals(Task.Status.IN_PROGRESS, saved.getStatus());
    }

    /**
     * Derived completion rule 3: No children done → parent TO DO.
     * Rule: Work not yet started; all children pending.
     * isCompleted=false, status=TO DO signals unstarted work.
     */
    @Test
    @DisplayName("Should derive parent completion: none completed -> parent todo")
    void testDerivedCompletionNone() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child1 = new Task("Subtask 1", "", null, false);
        Task child2 = new Task("Subtask 2", "", null, false);
        task.setSubtasks(List.of(child1, child2));

        Task saved = taskService.addTask(task, "testuser");

        assertFalse(saved.isCompleted());
        assertEquals(Task.Status.TODO, saved.getStatus());
    }

    /**
     * Field propagation: All subtasks inherit parent's owner.
     * Expected: After save, each child.owner == parent.owner.
     * Ensures access control: only parent owner can modify subtasks.
     */
    @Test
    @DisplayName("Should propagate ownership to subtasks")
    void testSubtaskOwnershipPropagation() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child1 = new Task("Subtask 1", "", null, false);
        Task child2 = new Task("Subtask 2", "", null, false);
        task.setSubtasks(List.of(child1, child2));

        Task saved = taskService.addTask(task, "testuser");

        assertEquals(testUser.getId(), saved.getOwner().getId());
        for (Task child : saved.getSubtasks()) {
            assertEquals(testUser.getId(), child.getOwner().getId());
        }
    }

    @Test
    @DisplayName("Should set default priority on subtasks")
    void testSubtaskDefaultPriority() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child = new Task("Subtask 1", "", null, false);
        child.setPriority(null);
        task.setSubtasks(List.of(child));

        Task saved = taskService.addTask(task, "testuser");

        assertEquals("Medium", saved.getSubtasks().get(0).getPriority());
    }

    @Test
    @DisplayName("Should default subtask due date to parent due date")
    void testSubtaskDefaultDueDate() {
        LocalDate parentDue = LocalDate.now().plusDays(7);
        Task task = new Task("Parent task", "", parentDue, false);
        Task child = new Task("Subtask 1", "", null, false);
        task.setSubtasks(List.of(child));

        Task saved = taskService.addTask(task, "testuser");

        assertEquals(parentDue, saved.getSubtasks().get(0).getDueDate());
    }

    @Test
    @DisplayName("Should update task and enforce rules on update")
    void testUpdateTaskWithRuleEnforcement() {
        Task task = new Task("Parent task", "", LocalDate.now(), false);
        Task child = new Task("Subtask 1", "", null, false);
        task.setSubtasks(List.of(child));

        Task saved = taskService.addTask(task, "testuser");

        // Create update with 5 subtasks (should fail)
        Task update = new Task(saved.getTitle(), saved.getDescription(), saved.getDueDate(), false);
        List<Task> children = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            children.add(new Task("Subtask " + i, "", null, false));
        }
        update.setSubtasks(children);

        TaskRuleViolationException ex = assertThrows(
            TaskRuleViolationException.class,
            () -> taskService.updateTask(saved.getId(), update, "testuser")
        );

        assertTrue(ex.getMessage().contains("cannot have more than 4 subtasks"));
    }

    @Test
    @DisplayName("Should reject null task payload")
    void testRejectNullTask() {
        // addTask requires a valid Task object; passing null should throw IllegalArgumentException
        // from userRepository lookup, not from validation (validation assumes task != null)
        Task nullTask = null;
        try {
            taskService.addTask(nullTask, "testuser");
            fail("Expected exception when task is null");
        } catch (NullPointerException ex) {
            // Expected behavior: null task causes NPE before validation
            assertTrue(true);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Mock Repositories
    // ─────────────────────────────────────────────────────────────────

    static class MockTaskRepository extends TaskRepository {
        private final List<Task> store = new ArrayList<>();
        private long nextId = 1L;

        @Override
        public Task save(Task task) {
            if (task.getId() == null) {
                task.setId(nextId++);
            }
            store.removeIf(t -> t.getId().equals(task.getId()));
            store.add(task);
            return task;
        }

        @Override
        public Optional<Task> findByIdAndUser(Long id, String username) {
            return store.stream()
                .filter(t -> t.getId().equals(id) && t.getOwner().getUsername().equals(username))
                .findFirst();
        }

        @Override
        public List<Task> findAllByUser(String username) {
            return store.stream()
                .filter(t -> t.getOwner().getUsername().equals(username) && t.getParentTask() == null)
                .toList();
        }
    }

    static class MockUserRepository extends UserRepository {
        private final List<User> store = new ArrayList<>();

        public MockUserRepository() {
            User defaultUser = new User();
            defaultUser.setId(1L);
            defaultUser.setUsername("testuser");
            defaultUser.setPasswordHash("hashed");
            store.add(defaultUser);
        }

        @Override
        public Optional<User> findByUsername(String username) {
            return store.stream().filter(u -> u.getUsername().equals(username)).findFirst();
        }
    }
}
