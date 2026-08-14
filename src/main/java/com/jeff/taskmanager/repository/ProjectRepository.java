package com.jeff.taskmanager.repository;

import com.jeff.taskmanager.model.Project;
import com.jeff.taskmanager.util.PersistanceManager;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

import java.util.List;
import java.util.Optional;

public class ProjectRepository {

    public Project save(Project project) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            em.getTransaction().begin();
            if (project.getId() == null) {
                em.persist(project);
            } else {
                project = em.merge(project);
            }
            em.getTransaction().commit();
            return project;
        } finally {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            em.close();
        }
    }

    public Optional<Project> findById(Long id) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            return Optional.ofNullable(em.find(Project.class, id));
        } finally {
            em.close();
        }
    }

    public List<Project> findByOwnerUsername(String username) {
        EntityManager em = PersistanceManager.getEntityManager();
        try {
            TypedQuery<Project> query = em.createQuery(
                    "SELECT p FROM Project p WHERE p.owner.username = :username ORDER BY p.id DESC",
                    Project.class
            );
            query.setParameter("username", username);
            return query.getResultList();
        } finally {
            em.close();
        }
    }
}
