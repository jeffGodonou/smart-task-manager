package com.jeff.taskmanager.util;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PersistanceManagerTest {

    @Test
    void resolveJdbcUrlUsesFileStorageByDefault() {
        String url = PersistanceManager.resolveJdbcUrl(Map.of());

        assertTrue(url.contains("jdbc:h2:file:"), "Expected file-backed H2 database by default");
        assertTrue(url.contains("taskdb"), "Expected a stable database file name");
    }

    @Test
    void resolveJdbcUrlUsesSupabaseDatabaseUrlWhenPresent() {
        Map<String, String> env = Map.of(
                "DATABASE_URL", "jdbc:postgresql://db.example.supabase.co:5432/postgres?sslmode=require",
                "SUPABASE_URL", "https://example.supabase.co"
        );

        String url = PersistanceManager.resolveJdbcUrl(env);

        assertTrue(url.contains("jdbc:postgresql://"), "Expected Supabase/Postgres JDBC URL when DATABASE_URL is configured");
        assertTrue(url.contains("sslmode=require"), "Expected SSL mode for Supabase");
    }
}
