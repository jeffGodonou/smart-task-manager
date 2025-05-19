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
