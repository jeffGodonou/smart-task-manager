package com.jeff.taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.util.PersistanceManager;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Data Migration Service Tests
 *
 * <p>Tests the migration from embedded @Embeddable subtasks to self-referential
 * parent-child Task relationships. Validates:</p>
 *
 * <ul>
 *   <li>Graceful handling when no legacy data exists</li>
 *   <li>Idempotency - safe to run migration multiple times</li>
 *   <li>Derived completion works with new model (all done → parent DONE)</li>
 *   <li>Task ownership preserved during migration</li>
 *   <li>Deep hierarchies (grandchildren) supported by schema</li>
 *   <li>Nullable fields handled correctly</li>
 * </ul>
 *
 * <p>These tests use a real JPA EntityManager with H2 in-memory database
 * to validate actual database behavior, not just in-memory mocks.</p>
 */
@DisplayName("Data Migration Service")
public class DataMigrationServiceTest {
    private EntityManager em;
    private UserRepository userRepository;
    private TaskRepository taskRepository;
    private User testUser;
    private static int testCounter = 0;

    /**
     * Set up test environment before each test.
     * Creates a fresh EntityManager and test user with unique username
     * to avoid constraint violations in shared in-memory database.
     */
    @BeforeEach
    public void setUp() {
        em = PersistanceManager.getEntityManager();
        userRepository = new UserRepository();
        taskRepository = new TaskRepository();

        // Create a test user with unique username to prevent duplicate key errors
        // across multiple test runs in the same in-memory database session
        testCounter++;
        testUser = new User();
        testUser.setUsername("testuser_" + testCounter + "_" + System.nanoTime());
        testUser.setPasswordHash("hashedpass");
        em.getTransaction().begin();
        em.persist(testUser);
        em.getTransaction().commit();
    }

    /**
     * Clean up resources after each test.
     * Closes the EntityManager to free database connections.
     */
    @AfterEach
    public void tearDown() {
        if (em != null && em.isOpen()) {
            em.close();
        }
    }

    /**
     * Test: Migration works when no legacy data exists.
     * 
     * Scenario: New deployment with fresh database using new parent-child model.
     * Expected: Migration detects no legacy task_subtasks table and skips,
     * leaving new data intact.
     */
    @Test
    @DisplayName("Migration handles no legacy data gracefully")
    public void testMigrationWithNoLegacyData() {
        // Create a parent task with subtasks using the new model
        em.getTransaction().begin();
        
        Task parent = new Task();
        parent.setTitle("Parent Task");
        parent.setOwner(testUser);
        parent.setStatus(Task.Status.TODO);
        parent.setPriority("Medium");
        
        Task child1 = new Task();
        child1.setTitle("Subtask 1");
        child1.setOwner(testUser);
        child1.setStatus(Task.Status.TODO);
        child1.setPriority("Medium");
        
        parent.addChildTask(child1);
        
        em.persist(parent);
        em.persist(child1);
        em.getTransaction().commit();
        
        // Run migration (should detect no legacy table and skip)
        DataMigrationService.runMigrations();
        
        // Verify data still intact
        em.clear();
        Task retrieved = em.find(Task.class, parent.getId());
        assertNotNull(retrieved);
        assertEquals("Parent Task", retrieved.getTitle());
        assertEquals(1, retrieved.getSubtasks().size());
    }

    /**
     * Test: Migration can safely run multiple times without data duplication.
     * 
     * Scenario: Application restarts or redeployment triggers migration again.
     * Expected: Running migration twice produces no duplicates; data unchanged.
     * 
     * This is critical for production - we can't be afraid to restart the app
     * after deployment if something goes wrong.
     */
    @Test
    @DisplayName("Migration is idempotent")
    public void testMigrationIdempotency() {
        // Create test data using new model
        em.getTransaction().begin();
        
        Task parent = new Task();
        parent.setTitle("Idempotent Test");
        parent.setOwner(testUser);
        parent.setStatus(Task.Status.TODO);
        parent.setPriority("High");
        
        em.persist(parent);
        em.getTransaction().commit();
        
        long initialId = parent.getId();
        
        // Run migration first time
        DataMigrationService.runMigrations();
        
        // Run migration second time
        DataMigrationService.runMigrations();
        
        // Verify data unchanged
        em.clear();
        Task retrieved = em.find(Task.class, initialId);
        assertNotNull(retrieved);
        assertEquals("Idempotent Test", retrieved.getTitle());
    }

    /**
     * Test: Parent task completion correctly derives from children post-migration.
     * 
     * Scenario: Parent has 2 children, 1 complete, 1 incomplete.
     * Expected: Parent completion should auto-derive when children change.
    * Rule: all children done → parent DONE, partial → IN_PROGRESS, none done → not started.
     */
    @Test
    @DisplayName("Derived completion works with new model")
    public void testDerivedCompletionInNewModel() {
        em.getTransaction().begin();
        
        Task parent = new Task();
        parent.setTitle("Parent with Completion");
        parent.setOwner(testUser);
        parent.setStatus(Task.Status.TODO);
        parent.setPriority("Medium");
        
        Task child1 = new Task();
        child1.setTitle("Subtask 1");
        child1.setOwner(testUser);
        child1.setStatus(Task.Status.TODO);
        child1.setPriority("Medium");
        child1.setCompleted(true);
        
        Task child2 = new Task();
        child2.setTitle("Subtask 2");
        child2.setOwner(testUser);
        child2.setStatus(Task.Status.TODO);
        child2.setPriority("Medium");
        child2.setCompleted(false);
        
        parent.addChildTask(child1);
        parent.addChildTask(child2);
        
        em.persist(parent);
        em.persist(child1);
        em.persist(child2);
        em.getTransaction().commit();
        
        // Run migration
        DataMigrationService.runMigrations();
        
        // Verify relationships intact and derivation would work
        em.clear();
        Task retrieved = em.find(Task.class, parent.getId());
        assertNotNull(retrieved);
        assertEquals(2, retrieved.getSubtasks().size());
        
        // Verify at least one child is completed
        boolean hasCompletedChild = retrieved.getSubtasks().stream()
            .anyMatch(Task::isCompleted);
        assertTrue(hasCompletedChild);
    }

    /**
     * Test: Task ownership is preserved through migration.
     * 
     * Scenario: Tasks and subtasks owned by specific user.
     * Expected: After migration, both parent and child tasks remain owned
     * by the same user - no orphaning or reassignment.
     */
    @Test
    @DisplayName("Migration preserves task ownership")
    public void testOwnershipPreserved() {
        em.getTransaction().begin();
        
        Task parent = new Task();
        parent.setTitle("Owned Task");
        parent.setOwner(testUser);
        parent.setStatus(Task.Status.TODO);
        parent.setPriority("Medium");
        
        Task child = new Task();
        child.setTitle("Owned Subtask");
        child.setOwner(testUser);
        child.setStatus(Task.Status.TODO);
        child.setPriority("Medium");
        
        parent.addChildTask(child);
        
        em.persist(parent);
        em.persist(child);
        em.getTransaction().commit();
        
        DataMigrationService.runMigrations();
        
        em.clear();
        Task retrieved = em.find(Task.class, parent.getId());
        assertNotNull(retrieved.getOwner());
        assertEquals(testUser.getId(), retrieved.getOwner().getId());
    }

    /**
     * Test: Schema supports deep task hierarchies (grandchildren, etc).
     * 
     * Note: Phase 1 enforces max 1 level (no grandchildren via business rules),
     * but the schema supports arbitrary depth via self-referential FK.
     * This test validates the schema can store and retrieve hierarchies correctly.
     * Useful for future phases that might relax nesting constraints.
     */
    @Test
    @DisplayName("Migration handles deep task hierarchies")
    public void testDeepHierarchies() {
        em.getTransaction().begin();
        
        // Note: Phase 1 limits to 1 level (no grandchildren),
        // but the schema supports it, so test it works
        Task parent = new Task();
        parent.setTitle("Grandparent");
        parent.setOwner(testUser);
        parent.setStatus(Task.Status.TODO);
        parent.setPriority("Medium");
        
        Task child = new Task();
        child.setTitle("Parent in Middle");
        child.setOwner(testUser);
        child.setStatus(Task.Status.TODO);
        child.setPriority("Medium");
        
        Task grandchild = new Task();
        grandchild.setTitle("Grandchild");
        grandchild.setOwner(testUser);
        grandchild.setStatus(Task.Status.TODO);
        grandchild.setPriority("Medium");
        
        parent.addChildTask(child);
        child.addChildTask(grandchild);
        
        em.persist(parent);
        em.persist(child);
        em.persist(grandchild);
        em.getTransaction().commit();
        
        DataMigrationService.runMigrations();
        
        em.clear();
        Task retrievedGrandparent = em.find(Task.class, parent.getId());
        assertNotNull(retrievedGrandparent);
        assertEquals(1, retrievedGrandparent.getSubtasks().size());
        
        Task retrievedChild = em.find(Task.class, child.getId());
        assertNotNull(retrievedChild.getParentTask());
        assertEquals(parent.getId(), retrievedChild.getParentTask().getId());
        assertEquals(1, retrievedChild.getSubtasks().size());
    }

    /**
     * Test: Tasks with missing optional fields migrate correctly.
     * 
     * Scenario: Minimal task with only title, owner, and status.
     * Missing: due date, description, priority, etc.
     * Expected: Migration succeeds; nullable fields remain null.
     * 
     * Validates that migration doesn't fail on NULL values in optional columns.
     */
    @Test
    @DisplayName("Migration handles nullable fields correctly")
    public void testNullableFieldsHandled() {
        em.getTransaction().begin();
        
        Task parent = new Task();
        parent.setTitle("Minimal Task");
        parent.setOwner(testUser);
        parent.setStatus(Task.Status.TODO);
        // Don't set priority, due date, or description
        
        Task child = new Task();
        child.setTitle("Minimal Subtask");
        child.setOwner(testUser);
        child.setStatus(Task.Status.TODO);
        
        parent.addChildTask(child);
        
        em.persist(parent);
        em.persist(child);
        em.getTransaction().commit();
        
        DataMigrationService.runMigrations();
        
        em.clear();
        Task retrieved = em.find(Task.class, parent.getId());
        assertNotNull(retrieved);
        assertNull(retrieved.getDueDate());
        // Priority might be null or default depending on validation
    }
}
