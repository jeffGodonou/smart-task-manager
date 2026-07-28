package com.jeff.taskmanager.service;

import com.jeff.taskmanager.util.PersistanceManager;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.logging.Logger;

/**
 * Data migration service for schema updates.
 * 
 * Handles migration from embedded subtasks (@ElementCollection) to 
 * self-referential parent-child Task relationships.
 */
public class DataMigrationService {
    private static final Logger LOGGER = Logger.getLogger(DataMigrationService.class.getName());

    /**
     * Run migrations at application startup.
     * This method is idempotent and can be called multiple times safely.
     */
    public static void runMigrations() {
        LOGGER.info("Starting data migrations...");
        
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            migrateEmbeddedSubtasksToParentChild(em);
            LOGGER.info("Data migrations completed successfully");
        } catch (Exception e) {
            LOGGER.warning("Data migration encountered an issue: " + e.getMessage());
            // Don't fail the application startup - log the error and continue
            // In production, you might want to be more strict
            e.printStackTrace();
        } finally {
            if (em != null) {
                em.close();
            }
        }
    }

    /**
     * Migrate data from embedded subtasks to parent-child relationships.
     * 
     * This migration:
     * 1. Checks if the old task_subtasks join table exists
     * 2. If it does, migrates data to the new parent-child model
     * 3. Is idempotent - safe to run multiple times
     */
    private static void migrateEmbeddedSubtasksToParentChild(EntityManager em) {
        // Check if the old task_subtasks table exists
        boolean oldTableExists = tableExists(em, "task_subtasks");
        
        if (!oldTableExists) {
            LOGGER.info("No legacy task_subtasks table found - schema already migrated or no legacy data");
            return;
        }
        
        LOGGER.info("Found legacy task_subtasks table - migrating data...");
        
        // SQL to migrate data from old join table to new parent-child model
        String migrationSQL = "INSERT INTO tasks " +
            "(title, description, priority, due_date, is_completed, status, owner_id, parent_task_id) " +
            "SELECT " +
            "  st.title, st.description, st.priority, st.due_date, st.is_completed, st.status, " +
            "  t.user_id, t.id " +
            "FROM task_subtasks st " +
            "JOIN tasks t ON st.task_id = t.id " +
            "WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE parent_task_id = t.id)";
        
        try {
            em.getTransaction().begin();
            Query query = em.createNativeQuery(migrationSQL);
            int rowsInserted = query.executeUpdate();
            em.getTransaction().commit();
            LOGGER.info("Migrated " + rowsInserted + " subtasks to parent-child model");
            
            // Optional: Drop the old table after successful migration
            // Only do this if you're confident in the migration
            // em.getTransaction().begin();
            // em.createNativeQuery("DROP TABLE task_subtasks").executeUpdate();
            // em.getTransaction().commit();
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            LOGGER.warning("Could not migrate legacy subtasks: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Check if a table exists in the database.
     */
    private static boolean tableExists(EntityManager em, String tableName) {
        try {
            em.getTransaction().begin();
            Query query = em.createNativeQuery(
                "SELECT 1 FROM information_schema.tables WHERE table_name = '" + tableName.toUpperCase() + "'"
            );
            Object result = query.getSingleResult();
            em.getTransaction().commit();
            return result != null;
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            return false;
        }
    }
}
