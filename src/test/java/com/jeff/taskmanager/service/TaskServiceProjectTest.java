package com.jeff.taskmanager.service;

import com.jeff.taskmanager.model.Project;
import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.ProjectRepository;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class TaskServiceProjectTest {
    private static class InMemoryTaskRepository extends TaskRepository {
        private final Map<Long, Task> store = new LinkedHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override
        public Task save(Task task) {
            if (task.getId() == null) {
                task.setId(seq.getAndIncrement());
            }
            store.put(task.getId(), task);
            return task;
        }

        @Override
        public Optional<Task> findByIdAndUser(Long id, String username) {
            return Optional.ofNullable(store.get(id))
                    .filter(task -> task.getOwner() != null && username.equalsIgnoreCase(task.getOwner().getUsername()));
        }

        @Override
        public List<Task> findAllByUser(String username) {
            return store.values().stream()
                    .filter(task -> task.getOwner() != null && username.equalsIgnoreCase(task.getOwner().getUsername()))
                    .toList();
        }
    }

    private static class InMemoryUserRepository extends UserRepository {
        private final Map<String, User> store = new LinkedHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override
        public Optional<User> findByUsername(String username) {
            return Optional.ofNullable(store.get(username.toLowerCase()));
        }

        @Override
        public User save(User user) {
            if (user.getId() == null) {
                user.setId(seq.getAndIncrement());
            }
            store.put(user.getUsername().toLowerCase(), user);
            return user;
        }
    }

    private static class InMemoryProjectRepository extends ProjectRepository {
        private final Map<Long, Project> store = new LinkedHashMap<>();
        private final AtomicLong seq = new AtomicLong(1);

        @Override
        public Project save(Project project) {
            if (project.getId() == null) {
                project.setId(seq.getAndIncrement());
            }
            store.put(project.getId(), project);
            return project;
        }

        @Override
        public Optional<Project> findById(Long id) {
            return Optional.ofNullable(store.get(id));
        }
    }

    @Test
    void addTask_assignsTaskToProjectOwnedByUser() {
        InMemoryUserRepository userRepository = new InMemoryUserRepository();
        User user = userRepository.save(new User("alice", "password"));
        InMemoryProjectRepository projectRepository = new InMemoryProjectRepository();
        Project project = new Project();
        project.setName("Sprint project");
        project.setOwner(user);
        projectRepository.save(project);

        TaskService service = new TaskService(new InMemoryTaskRepository(), userRepository, projectRepository);
        Task task = new Task("Ship feature", "Finish work", LocalDate.now(), false);
        task.setProjectId(project.getId());

        Task saved = service.addTask(task, "alice");

        assertNotNull(saved.getProject());
        assertEquals(project.getId(), saved.getProject().getId());
        assertEquals("Sprint project", saved.getProject().getName());
    }

    @Test
    void addTask_rejectsProjectThatDoesNotBelongToUser() {
        InMemoryUserRepository userRepository = new InMemoryUserRepository();
        User alice = userRepository.save(new User("alice", "password"));
        User bob = userRepository.save(new User("bob", "password"));
        InMemoryProjectRepository projectRepository = new InMemoryProjectRepository();
        Project bobProject = new Project();
        bobProject.setName("Bob project");
        bobProject.setOwner(bob);
        projectRepository.save(bobProject);

        TaskService service = new TaskService(new InMemoryTaskRepository(), userRepository, projectRepository);
        Task task = new Task("Wrong project", "This should fail", LocalDate.now(), false);
        task.setProjectId(bobProject.getId());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.addTask(task, "alice"));

        assertEquals("Project does not belong to this user.", ex.getMessage());
    }
}
