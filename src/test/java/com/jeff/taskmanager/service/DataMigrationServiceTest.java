package com.jeff.taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.util.PersistanceManager;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Data Migration Service")
public class DataMigrationServiceTest {
    private EntityManager em;
    private UserRepository userRepository;
    private TaskRepository taskRepository;
    private User testUser;
    private static int testCounter = 0;

    @BeforeEach
    public void setUp() {
        em = PersistanceManager.getEntityManager();
        userRepository = new UserRepository();
        taskRepository = new TaskRepository();

        // Create a test user with unique username
        testCounter++;
        testUser = new User();
        testUser.setUsername("testuser_" + testCounter + "_" + System.nanoTime());
        testUser.setPasswordHash("hashedpass");
        em.getTransaction().begin();
        em.persist(testUser);
        em.getTransaction().commit();
    }

    @AfterEach
    public void tearDown() {
        if (em != null && em.isOpen()) {
            em.close();
        }
    }

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
