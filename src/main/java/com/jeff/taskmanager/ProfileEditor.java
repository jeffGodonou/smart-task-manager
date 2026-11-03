package com.jeff.taskmanager;

import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.util.PasswordUtil;
import javafx.geometry.Insets;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Dialog;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;

import java.util.function.Consumer;

final class ProfileEditor {
    private ProfileEditor() {
    }

    static void show(User user, UserRepository users, Consumer<User> onSaved,
                     Consumer<String> showError) {
        Dialog<ButtonType> dialog = new Dialog<>();
        dialog.setTitle("Edit profile");
        dialog.getDialogPane().getButtonTypes().addAll(ButtonType.CANCEL, ButtonType.OK);

        TextField username = new TextField(user.getUsername());
        TextField githubLogin = new TextField(orEmpty(user.getGithubLogin()));
        PasswordField currentPassword = new PasswordField();
        currentPassword.setPromptText("Current password (required to change password)");
        PasswordField newPassword = new PasswordField();
        newPassword.setPromptText("New password (optional)");
        VBox fields = new VBox(10,
                new Label("Username"), username,
                new Label("GitHub login"), githubLogin,
                currentPassword, newPassword);
        fields.setPadding(new Insets(12));
        dialog.getDialogPane().setContent(fields);

        if (dialog.showAndWait().orElse(ButtonType.CANCEL) != ButtonType.OK) {
            return;
        }

        String updatedUsername = username.getText().trim();
        if (updatedUsername.isBlank()) {
            showError.accept("Username cannot be empty.");
            return;
        }
        if (!updatedUsername.equalsIgnoreCase(user.getUsername())
                && users.findByUsername(updatedUsername).isPresent()) {
            showError.accept("Username already exists.");
            return;
        }
        if (!newPassword.getText().isBlank()) {
            if (currentPassword.getText().isBlank()
                    || !PasswordUtil.verifyPassword(currentPassword.getText(), user.getPasswordHash())) {
                showError.accept("Enter your correct current password to change it.");
                return;
            }
            user.setPasswordHash(PasswordUtil.hashPassword(newPassword.getText()));
        }

        user.setUsername(updatedUsername);
        user.setGithubLogin(githubLogin.getText());
        onSaved.accept(users.save(user));
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value;
    }
}
