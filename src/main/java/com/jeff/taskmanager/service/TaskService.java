package com.jeff.taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;

import java.time.LocalDate;
import java.util.List;

public class TaskService {
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService() {
        this(new TaskRepository(), new UserRepository());
    }

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public Task addTask(Task task, String username) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new IllegalArgumentException("Unknown user"));
        task.setOwner(user);
        return taskRepository.save(task);
    }

    public void deleteTask(Task task) {
        taskRepository.delete(task);
    }

    public void deleteTaskById(Long id, String username) {
        taskRepository.findByIdAndUser(id, username).ifPresent(taskRepository::delete);
    }

    public Task getTaskById(Long id, String username) {
        return taskRepository.findByIdAndUser(id, username).orElse(null);
    }

    public Task updateTask(Long id, Task source, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(existing -> {
                    existing.setTitle(source.getTitle());
                    existing.setDescription(source.getDescription());
                    existing.setPriority(source.getPriority());
                    existing.setDueDate(source.getDueDate());
                    existing.setCompleted(source.isCompleted());
                    existing.setStatus(source.getStatus());
                    return taskRepository.save(existing);
                }).orElse(null);
    }

    public boolean updateTaskStatus(Long id, Task.Status status, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setStatus(status);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    public List<Task> listTasks(String username) {
        return taskRepository.findAllByUser(username);
    }

    public boolean updateTaskDescription(Long id, String description, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setDescription(description);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    public boolean updateTaskDueDate(Long id, LocalDate dueDate, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setDueDate(dueDate);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    public boolean updateTaskPriority(Long id, String priority, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setPriority(priority);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    public boolean completeTask(Long id, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setCompleted(true);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    public void updateTaskDescription(String title, String description) {
        taskRepository.findByTitle(title).ifPresent(t -> {
            t.setDescription(description);
            taskRepository.save(t);
        });
    }

    public void updateTaskDueDate(String title, LocalDate dueDate) {
        taskRepository.findByTitle(title).ifPresent(t -> {
            t.setDueDate(dueDate);
            taskRepository.save(t);
        });
    }

    public void updateTaskPriority(String title, String priority) {
        taskRepository.findByTitle(title).ifPresent(t -> {
            t.setPriority(priority);
            taskRepository.save(t);
        });
    }

    public boolean completeTask(String title) {
        return taskRepository.findByTitle(title).map(t -> {
            t.setCompleted(true);
            taskRepository.save(t);
            return true;
        }).orElse(false);
    }
}
