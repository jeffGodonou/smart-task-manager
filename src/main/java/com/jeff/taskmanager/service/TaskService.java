package com.jeff.taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.repository.TaskRepository;

import java.time.LocalDate;
import java.util.List;

public class TaskService {
    private final TaskRepository taskRepository;

    // Default constructor - keeps existing behavior if someone uses no-arg
    public TaskService() {
        this.taskRepository = new TaskRepository();
    }

    // Constructor injection - useful for tests and flexibility
    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    /***
     * Add a task
     */
    public void addTask(Task task) {
        taskRepository.save(task);
    }

    /***
     * Delete a task
     */
    public void deleteTask(Task task) {
        taskRepository.delete(task);
    }

    /***
     * List tasks
     */
    public List<Task> listTasks() {
        return taskRepository.findAll();
    }

    /**
     * Update description by id
     */
    public boolean updateTaskDescription(Long id, String description) {
        return taskRepository.findByID(id)
                .map(t -> {
                    t.setDescription(description);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    /**
     * Update due date by id
     */
    public boolean updateTaskDueDate(Long id, LocalDate dueDate) {
        return taskRepository.findByID(id)
                .map(t -> {
                    t.setDueDate(dueDate);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    /**
     * Update priority by id
     */
    public boolean updateTaskPriority(Long id, String priority) {
        return taskRepository.findByID(id)
                .map(t -> {
                    t.setPriority(priority);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    /**
     * Complete task by id
     */
    public boolean completeTask(Long id) {
        return taskRepository.findByID(id)
                .map(t -> {
                    t.setCompleted(true);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    // Backwards-compatible methods using title (delegates to repository)
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
