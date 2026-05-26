package com.jeff.taskmanager.util;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;

public class PersistanceManager {
    private static final EntityManagerFactory EMF = Persistence.createEntityManagerFactory("task-manager-unit");

    public static EntityManager getEntityManager() { 
        return EMF.createEntityManager();
    }

    public static void close() {
        if (EMF.isOpen()) EMF.close();
    }

}
