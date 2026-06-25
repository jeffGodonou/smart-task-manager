package com.jeff.taskmanager.repository;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.util.PersistanceManager;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

import java.util.List;
import java.util.Optional;

/**
 * Repository for persisting {@link Task task} entities.
 *
 * <p>Provides create, update, delete, and query operations for tasks.</p>
 */
public class TaskRepository {
    
    /**
     * Save a task to the database.
     *
     * <p>If the task has no identifier, it is persisted as a new entity.
     * Otherwise the existing task entity is merged.</p>
     *
     * @param task the task to save
     * @return the persisted or merged task instance
     */
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

    /**
     * Delete the provided task from the database.
     *
     * @param task the task to remove
     */
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

    /**
     * Find a task by its primary key identifier.
     *
     * @param id the task identifier
     * @return an optional task instance
     */
    public Optional<Task> findByID(Long id) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            return Optional.ofNullable(em.find(Task.class, id));
        } finally {
            em.close();
        }
    }

    /**
     * Find a task by ID and ensure it belongs to the specified user.
     *
     * @param id the task identifier
     * @param username the owning user's username
     * @return an optional task instance for the owner
     */
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

    /**
     * Find all tasks owned by the specified user.
     *
     * @param username the owner's username
     * @return the list of tasks for that user
     */
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

    /**
     * Find a task by its title, ignoring case.
     *
     * @param title the task title to search for
     * @return an optional matching task
     */
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

    /**
     * Retrieve all tasks stored in the database.
     *
     * @return the complete task list
     */
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
