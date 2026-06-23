package com.jeff.taskmanager.repository;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.util.PersistanceManager;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

import java.util.List;
import java.util.Optional;

public class TaskRepository {
    
    // Save the task in the database
    public Task save(Task task) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            em.getTransaction().begin();
            if (task.getId() == null) {
                em.persist(task);
            } else {
                task = em.merge(task);
            }
            em.getTransaction().commit();
            return task;
        } finally {
            if (em.getTransaction().isActive())
                em.getTransaction().rollback();
            em.close();
        }
    }   

    // delete the task form the database
    public void delete(Task task) {
        EntityManager em = PersistanceManager.getEntityManager();
        try{
            em.getTransaction().begin();
            Task managed = em.contains(task) ? task: em.find(Task.class, task.getId());
            if(managed != null) em.remove(managed);
            em.getTransaction().commit();
        } finally {
            if (em.getTransaction().isActive())
                em.getTransaction().rollback();
            em.close();
        }
    }

    // find task by ID
    public Optional<Task> findByID(Long id) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            return Optional.ofNullable(em.find(Task.class, id));
        } finally {
            em.close();
        }
    }

    // find task by ID and owner username
    public Optional<Task> findByIdAndUser(Long id, String username) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            TypedQuery<Task> q = em.createQuery(
                "SELECT t FROM Task t WHERE t.id = :id AND t.owner.username = :username", Task.class
            );
            q.setParameter("id", id);
            q.setParameter("username", username);
            return q.getResultStream().findFirst();
        } finally {
            em.close();
        }
    }

    // find all tasks associated to one user
    public List<Task> findAllByUser(String username) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            TypedQuery<Task> q = em.createQuery(
                "SELECT t FROM Task t WHERE t.owner.username = :username", Task.class
            );
            q.setParameter("username", username);
            return q.getResultList();
        } finally {
            em.close();
        }
    }

    // find task by title
    public Optional<Task> findByTitle(String title) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            TypedQuery<Task> q = em.createQuery(
                "SELECT t from Task t WHERE LOWER(t.title) =: title", Task.class
            );
            q.setParameter("title", title.toLowerCase());
            List<Task> list = q.getResultList();
            return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
        } finally {
            em.close();
        }
    }

    // Display all task
    public List<Task> findAll() {
        EntityManager em = PersistanceManager.getEntityManager();
        try{
            TypedQuery<Task> q = em.createQuery(
                "SELECT t FROM Task t ", Task.class
            );
            return q.getResultList();
        } finally {
            em.close();
        }
    }
}
