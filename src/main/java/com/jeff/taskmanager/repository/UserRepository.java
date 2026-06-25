package com.jeff.taskmanager.repository;

import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.util.PersistanceManager;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

import java.util.Optional;

/**
 * Repository for persisting {@link com.jeff.taskmanager.model.User user} entities.
 */
public class UserRepository {

    /**
     * Save a user to the database.
     *
     * @param user the user to persist
     * @return the persisted or merged user instance
     */
    public User save(User user) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            em.getTransaction().begin();
            if (user.getId() == null) {
                em.persist(user);
            } else {
                user = em.merge(user);
            }
            em.getTransaction().commit();
            return user;
        } finally {
            if (em.getTransaction().isActive())
                em.getTransaction().rollback();
            em.close();
        }
    }

    /**
     * Find a user by username.
     *
     * @param username the username to look up
     * @return an optional matching user
     */
    public Optional<User> findByUsername(String username) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            TypedQuery<User> q = em.createQuery(
                    "SELECT u FROM User u WHERE LOWER(u.username) = :username",
                    User.class
            );
            q.setParameter("username", username.toLowerCase());
            return q.getResultStream().findFirst();
        } finally {
            em.close();
        }
    }

    /**
     * Find a user by primary key.
     *
     * @param id the user identifier
     * @return an optional matching user
     */
    public Optional<User> findById(Long id) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            return Optional.ofNullable(em.find(User.class, id));
        } finally {
            em.close();
        }
    }
}
