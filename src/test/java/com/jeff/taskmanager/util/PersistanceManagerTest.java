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
    void resolveJdbcUrlUsesH2ByDefaultEvenWhenDatabaseUrlExists() {
        Map<String, String> env = Map.of(
                "DATABASE_URL", "jdbc:postgresql://db.example.supabase.co:5432/postgres?sslmode=require",
                "SUPABASE_URL", "https://example.supabase.co"
        );

        String url = PersistanceManager.resolveJdbcUrl(env);

        assertTrue(url.contains("jdbc:h2:file:"), "Expected local file-backed H2 database by default");
        assertTrue(url.contains("taskdb"), "Expected default H2 database name");
    }

    @Test
    void resolveJdbcUrlUsesSupabaseDatabaseUrlWhenPostgresIsExplicitlyEnabled() {
        Map<String, String> env = Map.of(
                "USE_POSTGRES_DB", "true",
                "DATABASE_URL", "jdbc:postgresql://db.example.supabase.co:5432/postgres?sslmode=require",
                "SUPABASE_URL", "https://example.supabase.co"
        );

        String url = PersistanceManager.resolveJdbcUrl(env);

        assertTrue(url.contains("jdbc:postgresql://"), "Expected Supabase/Postgres JDBC URL when PostgreSQL is explicitly enabled");
        assertTrue(url.contains("sslmode=require"), "Expected SSL mode for Supabase");
    }

    @Test
    void resolveJdbcUrlAddsJdbcPrefixToPostgresUrlsWithoutItWhenEnabled() {
        Map<String, String> env = Map.of(
                "USE_POSTGRES_DB", "true",
                "DATABASE_URL", "postgresql://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=require"
        );

        String url = PersistanceManager.resolveJdbcUrl(env);

        assertTrue(url.startsWith("jdbc:postgresql://"), "Expected a JDBC-formatted PostgreSQL URL");
        assertTrue(url.contains("sslmode=require"), "Expected SSL mode for Supabase");
    }
}
