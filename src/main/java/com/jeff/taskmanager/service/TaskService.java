package com.jeff.taskmanager.service;

import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.TaskRepository;
import com.jeff.taskmanager.repository.UserRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Business service for task management operations.
 *
 * <p>This service coordinates task persistence and user ownership checks.
 * It delegates persistence actions to the {@link TaskRepository} and resolves
 * users via the {@link UserRepository}.</p>
 */
public class TaskService {
    private static final int MAX_SUBTASKS_PER_TASK = 4;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    /**
     * Construct a TaskService with default repository implementations.
     */
    public TaskService() {
        this(new TaskRepository(), new UserRepository());
    }

    /**
     * Construct a TaskService with explicit repository dependencies.
     *
     * @param taskRepository repository used for task persistence
     * @param userRepository repository used for user lookup
     */
    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    /**
     * Add a new task for the given user.
     *
     * @param task the task to persist
     * @param username the owner of the task
     * @return the saved task instance
     * @throws IllegalArgumentException if the user cannot be found
     */
    public Task addTask(Task task, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Unknown user"));
        task.setOwner(user);
        validateAndNormalizeTaskRules(task);
        return taskRepository.save(task);
    }

    /**
     * Delete the provided task instance.
     *
     * @param task the task to remove
     */
    public void deleteTask(Task task) {
        taskRepository.delete(task);
    }

    /**
     * Delete a task by ID if it belongs to the given user.
     *
     * @param id the task identifier
     * @param username the username of the owner
     */
    public void deleteTaskById(Long id, String username) {
        taskRepository.findByIdAndUser(id, username).ifPresent(taskRepository::delete);
    }

    /**
     * Retrieve a task by its ID for the specified user.
     *
     * @param id the task identifier
     * @param username the username of the owner
     * @return the task when found, or {@code null} when not found or unauthorized
     */
    public Task getTaskById(Long id, String username) {
        return taskRepository.findByIdAndUser(id, username).orElse(null);
    }

    /**
     * Update an existing task owned by a specific user.
     *
     * @param id the task identifier
     * @param source the task payload containing updates
     * @param username the username of the owner
     * @return the updated task, or {@code null} when the task is not found
     */
    public Task updateTask(Long id, Task source, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(existing -> {
                    source.setOwner(existing.getOwner());
                    validateAndNormalizeTaskRules(source);
                    existing.setTitle(source.getTitle());
                    existing.setDescription(source.getDescription());
                    existing.setNotes(source.getNotes());
                    existing.setSubtasks(source.getSubtasks());
                    existing.setPriority(source.getPriority());
                    existing.setDueDate(source.getDueDate());
                    existing.setCompleted(source.isCompleted());
                    existing.setStatus(source.getStatus());
                    return taskRepository.save(existing);
                }).orElse(null);
    }

    private void validateAndNormalizeTaskRules(Task task) {
        if (task == null) {
            throw new TaskRuleViolationException("Task payload is required.");
        }

        List<Task> subtasks = task.getSubtasks() == null
                ? new ArrayList<>()
                : new ArrayList<>(task.getSubtasks());

        if (subtasks.size() > MAX_SUBTASKS_PER_TASK) {
            throw new TaskRuleViolationException("A task cannot have more than 4 subtasks.");
        }

        for (Task subTask : subtasks) {
            if (subTask == null || subTask.getTitle() == null || subTask.getTitle().trim().isEmpty()) {
                throw new TaskRuleViolationException("Subtasks must have a non-empty title.");
            }
            subTask.setTitle(subTask.getTitle().trim());
            // Phase 2 contract: subtasks are one-level children only.
            if (subTask.getSubtasks() != null && !subTask.getSubtasks().isEmpty()) {
                throw new TaskRuleViolationException("Nested subtasks are not allowed.");
            }

            subTask.setOwner(task.getOwner());
            subTask.setPriority(subTask.getPriority() == null || subTask.getPriority().isBlank() ? "Medium" : subTask.getPriority());
            subTask.setDueDate(subTask.getDueDate() == null ? task.getDueDate() : subTask.getDueDate());
            subTask.setNotes(subTask.getNotes() == null ? null : subTask.getNotes().trim());
            subTask.setStatus(subTask.isCompleted() ? Task.Status.DONE : Task.Status.TODO);
        }

        task.setSubtasks(subtasks);

        // Phase 1 contract: when subtasks exist, parent completion is derived from them.
        if (!subtasks.isEmpty()) {
            long completedCount = subtasks.stream().filter(Task::isCompleted).count();
            boolean allDone = completedCount == subtasks.size();

            task.setCompleted(allDone);
            if (allDone) {
                task.setStatus(Task.Status.DONE);
            } else if (completedCount > 0) {
                task.setStatus(Task.Status.IN_PROGRESS);
            } else {
                task.setStatus(Task.Status.TODO);
            }
        }
    }

    /**
     * Update the status of a task owned by a user.
     *
     * @param id the task identifier
     * @param status new status value
     * @param username the username of the owner
     * @return {@code true} when the update succeeded, otherwise {@code false}
     */
    public boolean updateTaskStatus(Long id, Task.Status status, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setStatus(status);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    /**
     * List all tasks for the specified user.
     *
     * @param username the username of the owner
     * @return tasks belonging to the user
     */
    public List<Task> listTasks(String username) {
        return taskRepository.findAllByUser(username);
    }

    /**
     * Update the description of an owned task.
     *
     * @param id the task identifier
     * @param description the new description
     * @param username the username of the owner
     * @return {@code true} when the update succeeded, otherwise {@code false}
     */
    public boolean updateTaskDescription(Long id, String description, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setDescription(description);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    /**
     * Update the due date of an owned task.
     *
     * @param id the task identifier
     * @param dueDate the new due date
     * @param username the username of the owner
     * @return {@code true} when the update succeeded, otherwise {@code false}
     */
    public boolean updateTaskDueDate(Long id, LocalDate dueDate, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setDueDate(dueDate);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    /**
     * Update the priority of an owned task.
     *
     * @param id the task identifier
     * @param priority the new priority value
     * @param username the username of the owner
     * @return {@code true} when the update succeeded, otherwise {@code false}
     */
    public boolean updateTaskPriority(Long id, String priority, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setPriority(priority);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    /**
     * Mark an owned task as completed.
     *
     * @param id the task identifier
     * @param username the username of the owner
     * @return {@code true} when the task was marked complete, otherwise {@code false}
     */
    public boolean completeTask(Long id, String username) {
        return taskRepository.findByIdAndUser(id, username)
                .map(t -> {
                    t.setCompleted(true);
                    taskRepository.save(t);
                    return true;
                }).orElse(false);
    }

    /**
     * Update a task description by title. This method does not enforce user ownership.
     *
     * @param title the task title to find
     * @param description the new description
     */
    public void updateTaskDescription(String title, String description) {
        taskRepository.findByTitle(title).ifPresent(t -> {
            t.setDescription(description);
            taskRepository.save(t);
        });
    }

    /**
     * Update a task due date by title. This method does not enforce user ownership.
     *
     * @param title the task title to find
     * @param dueDate the new due date
     */
    public void updateTaskDueDate(String title, LocalDate dueDate) {
        taskRepository.findByTitle(title).ifPresent(t -> {
            t.setDueDate(dueDate);
            taskRepository.save(t);
        });
    }

    /**
     * Update a task priority by title. This method does not enforce user ownership.
     *
     * @param title the task title to find
     * @param priority the new priority value
     */
    public void updateTaskPriority(String title, String priority) {
        taskRepository.findByTitle(title).ifPresent(t -> {
            t.setPriority(priority);
            taskRepository.save(t);
        });
    }

    /**
     * Mark a task complete by title. This method does not enforce user ownership.
     *
     * @param title the task title to find
     * @return {@code true} when a matching task was found and updated
     */
    public boolean completeTask(String title) {
        return taskRepository.findByTitle(title).map(t -> {
            t.setCompleted(true);
            taskRepository.save(t);
            return true;
        }).orElse(false);
    }
}
