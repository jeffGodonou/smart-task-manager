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
    private static final String DEFAULT_H2_URL = "jdbc:h2:file:./data/taskdb;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL";

    public static String resolveJdbcUrl(Map<String, String> environment) {
        if (environment == null || environment.isEmpty()) {
            return DEFAULT_H2_URL;
        }

        String h2Url = firstNonBlank(environment.get("H2_JDBC_URL"), DEFAULT_H2_URL);
        if (!isPostgresEnabled(environment)) {
            return normalizeJdbcUrl(h2Url);
        }

        String jdbcUrl = firstNonBlank(
                environment.get("DATABASE_URL"),
                environment.get("SUPABASE_DB_URL"),
                environment.get("POSTGRES_URL")
        );

        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return normalizeJdbcUrl(h2Url);
        }

        return normalizeJdbcUrl(jdbcUrl);
    }

    private static boolean isPostgresEnabled(Map<String, String> environment) {
        String postgresFlag = firstNonBlank(
                environment.get("USE_POSTGRES_DB"),
                environment.get("USE_POSTGRES"),
                environment.get("ENABLE_POSTGRES_DB"),
                environment.get("POSTGRES_ENABLED")
        );

        if (postgresFlag == null) {
            return false;
        }

        String normalized = postgresFlag.trim().toLowerCase();
        return "true".equals(normalized)
                || "1".equals(normalized)
                || "yes".equals(normalized)
                || "on".equals(normalized);
    }

    public static String normalizeJdbcUrl(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return DEFAULT_H2_URL;
        }

        String trimmed = jdbcUrl.trim();
        if (trimmed.startsWith("jdbc:")) {
            return trimmed;
        }
        if (trimmed.startsWith("postgresql://")) {
            return "jdbc:" + trimmed;
        }
        if (trimmed.startsWith("postgres://")) {
            return "jdbc:postgresql://" + trimmed.substring("postgres://".length());
        }
        return trimmed;
    }

    public static String resolveJdbcDriver(String jdbcUrl) {
        if (jdbcUrl != null && (jdbcUrl.startsWith("jdbc:postgresql") || jdbcUrl.startsWith("jdbc:postgres"))) {
            return "org.postgresql.Driver";
        }
        return "org.h2.Driver";
    }

    public static String resolveHibernateDialect(String jdbcUrl) {
        if (jdbcUrl != null && (jdbcUrl.startsWith("jdbc:postgresql") || jdbcUrl.startsWith("jdbc:postgres"))) {
            return "org.hibernate.dialect.PostgreSQLDialect";
        }
        return "org.hibernate.dialect.H2Dialect";
    }

    public static String resolveJdbcUser(Map<String, String> environment) {
        return firstNonBlank(environment.get("DB_USERNAME"), environment.get("POSTGRES_USER"), environment.get("SUPABASE_DB_USER"), "sa");
    }

    public static String resolveJdbcPassword(Map<String, String> environment) {
        return firstNonBlank(environment.get("DB_PASSWORD"), environment.get("POSTGRES_PASSWORD"), environment.get("SUPABASE_DB_PASSWORD"), "");
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    /**
     * Get or create the singleton {@link EntityManagerFactory}.
     *
     * @return the shared entity manager factory
     */
    public static synchronized EntityManagerFactory getEmf() {
        if (emf == null) {
            Map<String, String> environment = System.getenv();
            Map<String, String> overrides = new HashMap<>();
            String jdbcUrl = resolveJdbcUrl(environment);
            overrides.put("jakarta.persistence.jdbc.url", jdbcUrl);
            overrides.put("jakarta.persistence.jdbc.driver", resolveJdbcDriver(jdbcUrl));

            String jdbcUser = resolveJdbcUser(environment);
            if (jdbcUser != null) {
                overrides.put("jakarta.persistence.jdbc.user", jdbcUser);
            }

            String jdbcPassword = resolveJdbcPassword(environment);
            if (jdbcPassword != null) {
                overrides.put("jakarta.persistence.jdbc.password", jdbcPassword);
            }

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
