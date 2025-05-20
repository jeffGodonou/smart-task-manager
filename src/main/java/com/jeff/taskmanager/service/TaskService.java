package com.jeff.taskmanager.service;

import  com.jeff.taskmanager.model.Task;
import java.util.ArrayList;
import java.util.List;

public class TaskService {
    private List<Task> tasks = new ArrayList<>();

    public void addTask(Task task) {
        tasks.add(task);
    }

    public List <Task> listTasks() {
        return tasks;
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
