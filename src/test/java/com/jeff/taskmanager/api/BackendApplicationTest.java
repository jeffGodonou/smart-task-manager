package com.jeff.taskmanager.api;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BackendApplicationTest {
    @Test
    void resolvePortUsesEnvironmentValueWhenProvided() {
        assertEquals(9000, BackendApplication.resolvePort("9000"));
    }

    @Test
    void resolvePortFallsBackToDefaultWhenMissing() {
        assertEquals(8080, BackendApplication.resolvePort(null));
    }
}
