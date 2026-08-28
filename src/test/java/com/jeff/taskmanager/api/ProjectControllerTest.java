package com.jeff.taskmanager.api;

import com.jeff.taskmanager.model.Project;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.ProjectRepository;
import com.jeff.taskmanager.util.PasswordUtil;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ProjectControllerTest {

    @Test
    void savesProjectMetadataForAuthenticatedUser() {
        InMemoryProjectRepository repository = new InMemoryProjectRepository();
        User user = new User("alice", PasswordUtil.hashPassword("secret"));
        Project project = new Project();
        project.setName("smart-task-manager");
        project.setRepositoryUrl("https://github.com/example/smart-task-manager.git");
        project.setGithubAccount("example");
        project.setBranch("main");
        project.setLocalPath("/workspace/smart-task-manager");
        project.setOwner(user);

        repository.save(project);

        List<Project> saved = repository.findByOwnerUsername(user.getUsername());
        assertEquals(1, saved.size());
        assertEquals("smart-task-manager", saved.get(0).getName());
        assertEquals("https://github.com/example/smart-task-manager.git", saved.get(0).getRepositoryUrl());
        assertEquals("example", saved.get(0).getGithubAccount());
    }

    private static class InMemoryProjectRepository extends ProjectRepository {
        private final java.util.Map<Long, Project> store = new java.util.LinkedHashMap<>();

        @Override
        public Project save(Project project) {
            if (project.getId() == null) {
                project.setId((long) (store.size() + 1));
            }
            store.put(project.getId(), project);
            return project;
        }

        @Override
        public java.util.List<Project> findByOwnerUsername(String username) {
            return store.values().stream()
                    .filter(project -> project.getOwner() != null && username.equals(project.getOwner().getUsername()))
                    .toList();
        }
    }
}
