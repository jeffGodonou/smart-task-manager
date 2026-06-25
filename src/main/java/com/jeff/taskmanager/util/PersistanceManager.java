package com.jeff.taskmanager.util;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;

/**
 * Utility class that lazily initializes and exposes the JPA {@link EntityManagerFactory}.
 *
 * <p>This class is responsible for creating {@link jakarta.persistence.EntityManager}
 * instances and closing the factory when the application shuts down.</p>
 */
public class PersistanceManager {
    private static volatile EntityManagerFactory emf;

    /**
     * Get or create the singleton {@link EntityManagerFactory}.
     *
     * @return the shared entity manager factory
     */
    public static synchronized EntityManagerFactory getEmf() {
        if (emf == null) {
            emf = Persistence.createEntityManagerFactory("task-manager-unit");
        }
        return emf;
    }

    /**
     * Create a new {@link jakarta.persistence.EntityManager} from the factory.
     *
     * @return a new entity manager instance
     */
    public static EntityManager getEntityManager() {
        return getEmf().createEntityManager();
    }

    /**
     * Close the shared {@link jakarta.persistence.EntityManagerFactory} if open.
     */
    public static void close() {
        if (emf != null && emf.isOpen()) emf.close();
    }
    
}
