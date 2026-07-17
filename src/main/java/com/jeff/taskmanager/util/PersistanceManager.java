package com.jeff.taskmanager.util;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility class that lazily initializes and exposes the JPA {@link EntityManagerFactory}.
 *
 * <p>This class is responsible for creating {@link jakarta.persistence.EntityManager}
 * instances and closing the factory when the application shuts down.</p>
 */
public class PersistanceManager {
    private static volatile EntityManagerFactory emf;
    private static final String DEFAULT_H2_URL = "jdbc:h2:mem:taskdb;DB_CLOSE_DELAY=-1";

    /**
     * Get or create the singleton {@link EntityManagerFactory}.
     *
     * @return the shared entity manager factory
     */
    public static synchronized EntityManagerFactory getEmf() {
        if (emf == null) {
            Map<String, String> overrides = new HashMap<>();
            // Use in-memory H2 by default in cloud environments to avoid file locking/path issues.
            String jdbcUrl = System.getenv().getOrDefault("H2_JDBC_URL", DEFAULT_H2_URL);
            overrides.put("jakarta.persistence.jdbc.url", jdbcUrl);
            emf = Persistence.createEntityManagerFactory("task-manager-unit", overrides);
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
