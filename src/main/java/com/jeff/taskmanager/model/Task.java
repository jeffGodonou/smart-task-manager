package com.jeff.taskmanager.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * JPA entity representing a task owned by a user.
 *
 * <p>A task includes a title, description, due date, completion flag,
 * priority, and workflow status.</p>
 */
@Entity
@Table(name = "tasks")
public class Task {
    public enum Status {
        TODO,
        IN_PROGRESS,
        DONE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user that owns this task. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User owner;

    private String title;
    
    @Column(length = 2000)
    private String description;

    @Column(length = 4000)
    @JsonProperty("notes")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_task_id", nullable = true)
    @JsonBackReference("task-parent")
    private Task parentTask;

    @OneToMany(mappedBy = "parentTask", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("task-parent")
    @JsonProperty("subtasks")
    private List<Task> childTasks = new ArrayList<>();

    /** The priority level for the task, e.g. Low, Medium, or High. */
    private String priority;
    
    @Column(name="due_date")
    @JsonProperty("dueDate")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dueDate;

    @Column(name="is_completed")
        @JsonProperty("isCompleted")
    private boolean isCompleted;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @JsonProperty("status")
    private Status status;

    public Task() {}

    public Task(String title, String description, LocalDate dueDate, boolean isCompleted) {
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.isCompleted = isCompleted;
        this.priority = "Medium";
        this.status = Status.TODO;
        this.childTasks = new ArrayList<>();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Task getParentTask() {
        return parentTask;
    }

    public void setParentTask(Task parentTask) {
        this.parentTask = parentTask;
    }

    public List<Task> getSubtasks() {
        return childTasks;
    }

    public List<Task> getChildTasks() {
        return childTasks;
    }

    public void setSubtasks(List<Task> subtasks) {
        setChildTasks(subtasks);
    }

    public void setChildTasks(List<Task> childTasks) {
        this.childTasks.clear();
        if (childTasks == null) {
            return;
        }
        for (Task child : childTasks) {
            if (child == null) {
                continue;
            }
            child.setParentTask(this);
            this.childTasks.add(child);
        }
    }

    public void addChildTask(Task child) {
        if (child == null) {
            return;
        }
        child.setParentTask(this);
        this.childTasks.add(child);
    }

    public void removeChildTask(Task child) {
        if (child == null) {
            return;
        }
        this.childTasks.remove(child);
        child.setParentTask(null);
    }

    public String getPriority() {
        return priority;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public boolean isCompleted() {
        return isCompleted;
    }

    public void setCompleted(boolean completed) {
        isCompleted = completed;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }
}