package com.jeff.taskmanager.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * JPA entity representing an application user.
 *
 * <p>The user entity stores the username and hashed password used for
 * authentication and task ownership.</p>
 */
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique username used to identify the user. */
    @Column(unique = true, nullable = false)
    private String username;

    /** Hashed password value; never serialized in API responses. */
    @JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    public User() {}

    public User(String username, String passwordHash) {
        this.username = username;
        this.passwordHash = passwordHash;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
