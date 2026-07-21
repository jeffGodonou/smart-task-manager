package com.jeff.taskmanager.service;

/**
 * Runtime exception thrown when task business rules are violated.
 */
public class TaskRuleViolationException extends RuntimeException {
    public TaskRuleViolationException(String message) {
        super(message);
    }
}
