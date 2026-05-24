package com.jeff.taskmanager.service;

import  com.jeff.taskmanager.model.Task;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class TaskService {
    private List<Task> tasks = new ArrayList<>();

    public void addTask(Task task) {
        tasks.add(task);
    }

    public void deleteTask(Task task) {
        tasks.remove(task);
    }

    public List <Task> listTasks() {
        return tasks;
    }

    public void updateTaskDescription(String title, String description) {
        tasks.stream()
            .filter(t -> t.getTitle().equalsIgnoreCase(title))
            .findFirst()
            .map( t -> {
                t.setDescription(description);
                return description;
            });
    }

    /***
     * This method update the due Date (to be reviewed)
     * @param title
     * @param dueDate
     */
    public void updateTaskDueDate(String title, LocalDate dueDate) {
        tasks.stream()
            .filter(t -> t.getTitle().equalsIgnoreCase(title))
            .findFirst()
            .map(t -> {
                t.setDueDate(dueDate);
                return dueDate;
            });
    }
 
    /** 
     * This method update the priority of a task (to be reviewed)
     * @param title
     * @param priority
     */
    public void updateTaskPriority(String title, String priority) {
        tasks.stream()
            .filter(t -> t.getTitle().equalsIgnoreCase(title))
            .findFirst()
            .map(t -> {
                t.setPriority(priority);
                return priority;
            });
    }

    /**
     * This method retrieves a task by its title and set it as completed.
     * @param title The title of the task to retrieve.
     * @return The task with the specified title, or null if not found.
     */
    public boolean completeTask(String title) {
        return tasks.stream()
                .filter(t-> t.getTitle().equalsIgnoreCase(title))
                .findFirst()
                .map(t -> {
                    t.setCompleted(true);
                    return true;
                }).orElse(false);
    }

}
