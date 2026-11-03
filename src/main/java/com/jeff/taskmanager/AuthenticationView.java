package com.jeff.taskmanager;

import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.util.PasswordUtil;
import javafx.geometry.Insets;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.VBox;

import java.util.function.BiConsumer;

final class AuthenticationView extends BorderPane {
    private enum Mode {
        LOGIN,
        REGISTER,
        RESET_PASSWORD
    }

    private final UserRepository users;
    private final BiConsumer<String, Boolean> onAuthenticated;

    AuthenticationView(UserRepository users, String theme, BiConsumer<String, Boolean> onAuthenticated) {
        this.users = users;
        this.onAuthenticated = onAuthenticated;
        getStyleClass().add("root");
        applyTheme(theme);
        showForm(Mode.LOGIN, null);
    }

    private void showForm(Mode mode, String initialMessage) {
        TextField username = new TextField();
        username.setPromptText("Username");
        PasswordField password = new PasswordField();
        password.setPromptText(mode == Mode.RESET_PASSWORD ? "New password" : "Password");

        Label feedback = new Label(initialMessage == null ? "" : initialMessage);
        feedback.setWrapText(true);
        feedback.getStyleClass().add("auth-feedback");

        Label title = new Label(switch (mode) {
            case LOGIN -> "Welcome back";
            case REGISTER -> "Create an account";
            case RESET_PASSWORD -> "Reset your password";
        });
        title.getStyleClass().add("auth-title");

        Button submit = new Button(submitLabel(mode));
        submit.getStyleClass().add("btn-primary");
        submit.setDefaultButton(true);
        submit.setOnAction(event -> submit(mode, username.getText(), password.getText(), feedback));

        Button switchMode = new Button(switchLabel(mode));
        switchMode.setOnAction(event -> showForm(
                mode == Mode.LOGIN ? Mode.REGISTER : Mode.LOGIN, null));

        VBox form = new VBox(12, title, username, password, feedback, submit, switchMode);
        form.setMaxWidth(360);
        form.setPadding(new Insets(28));
        form.getStyleClass().add("auth-panel");

        if (mode == Mode.LOGIN) {
            Button resetPassword = new Button("Forgot password?");
            resetPassword.setOnAction(event -> showForm(Mode.RESET_PASSWORD, null));
            form.getChildren().add(resetPassword);
        }

        setCenter(form);
    }

    private void submit(Mode mode, String rawUsername, String password, Label feedback) {
        String username = rawUsername.trim();
        feedback.setText("");
        if (username.isBlank() || password.isBlank()) {
            feedback.setText("Enter both a username and password.");
            return;
        }

        try {
            switch (mode) {
                case LOGIN -> login(username, password, feedback);
                case REGISTER -> register(username, password, feedback);
                case RESET_PASSWORD -> resetPassword(username, password, feedback);
            }
        } catch (RuntimeException exception) {
            feedback.setText("Unable to complete the request: " + exception.getMessage());
        }
    }

    private void login(String username, String password, Label feedback) {
        User user = users.findByUsername(username).orElse(null);
        if (user == null || !PasswordUtil.verifyPassword(password, user.getPasswordHash())) {
            feedback.setText("Invalid username or password.");
            return;
        }
        onAuthenticated.accept(user.getUsername(), false);
    }

    private void register(String username, String password, Label feedback) {
        if (users.findByUsername(username).isPresent()) {
            feedback.setText("Username already exists.");
            return;
        }
        users.save(new User(username, PasswordUtil.hashPassword(password)));
        onAuthenticated.accept(username, true);
    }

    private void resetPassword(String username, String newPassword, Label feedback) {
        User user = users.findByUsername(username).orElse(null);
        if (user == null) {
            feedback.setText("No account found for that username.");
            return;
        }
        user.setPasswordHash(PasswordUtil.hashPassword(newPassword));
        users.save(user);
        showForm(Mode.LOGIN, "Password reset. You can now log in.");
    }

    private void applyTheme(String theme) {
        getStyleClass().add("theme-" + theme);
    }

    private static String submitLabel(Mode mode) {
        return switch (mode) {
            case LOGIN -> "Log in";
            case REGISTER -> "Create account";
            case RESET_PASSWORD -> "Reset password";
        };
    }

    private static String switchLabel(Mode mode) {
        return switch (mode) {
            case LOGIN -> "Create an account";
            case REGISTER -> "Already have an account? Log in";
            case RESET_PASSWORD -> "Back to login";
        };
    }
}
