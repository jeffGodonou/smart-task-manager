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
}
