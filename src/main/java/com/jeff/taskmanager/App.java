package com.jeff.taskmanager;

import com.jeff.taskmanager.model.Project;
import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.ProjectRepository;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.service.TaskService;
import com.jeff.taskmanager.util.PasswordUtil;
import javafx.application.Application;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonType;
import javafx.scene.control.CheckBox;
import javafx.scene.control.ChoiceBox;
import javafx.scene.control.ComboBox;
import javafx.scene.control.DatePicker;
import javafx.scene.control.Dialog;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.Tab;
import javafx.scene.control.TabPane;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.ColumnConstraints;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;
import javafx.util.StringConverter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.prefs.Preferences;

/**
 * JavaFX application entry point for the desktop task manager.
 *
 * <p>The desktop client uses the same local repositories and task rules as
 * the web application, with JavaFX screens for authentication and each task view.</p>
 */
public class App extends Application {
    private static final List<String> THEMES = List.of("blue", "light", "dark", "forest", "gray");
    private static final List<String> PRIORITIES = List.of("Low", "Medium", "High");

    private final TaskService taskService = new TaskService();
    private final ProjectRepository projectRepository = new ProjectRepository();
    private final UserRepository userRepository = new UserRepository();
    private final Preferences preferences = Preferences.userNodeForPackage(App.class);

    private Stage stage;
    private String currentUsername;
    private String theme;
    private TabPane tabs;
    private BorderPane appRoot;
    private YearMonth calendarMonth = YearMonth.now();
    private List<Task> tasks = List.of();
    private List<Project> projects = List.of();

    @Override
    public void start(Stage primaryStage) {
        stage = primaryStage;
        theme = preferences.get("theme", "blue");
        if (!THEMES.contains(theme)) {
            theme = "blue";
        }
        stage.setTitle("Smart Task Manager");
        showAuthentication("login", null);
    }

    private void showAuthentication(String mode, String initialMessage) {
        TextField usernameField = new TextField();
        usernameField.setPromptText("Username");
        PasswordField passwordField = new PasswordField();
        passwordField.setPromptText(mode.equals("reset") ? "New password" : "Password");
        Label feedback = new Label(initialMessage == null ? "" : initialMessage);
        feedback.setWrapText(true);
        feedback.getStyleClass().add("auth-feedback");

        Label title = new Label(switch (mode) {
            case "register" -> "Create an account";
            case "reset" -> "Reset your password";
            default -> "Welcome back";
        });
        title.getStyleClass().add("auth-title");

        Button submit = new Button(switch (mode) {
            case "register" -> "Create account";
            case "reset" -> "Reset password";
            default -> "Log in";
        });
        submit.getStyleClass().add("btn-primary");
        submit.setDefaultButton(true);
        submit.setOnAction(event -> {
            String username = usernameField.getText().trim();
            String password = passwordField.getText();
            feedback.setText("");
            if (username.isBlank() || password.isBlank()) {
                feedback.setText("Enter both a username and password.");
                return;
            }

            try {
                if (mode.equals("register")) {
                    if (userRepository.findByUsername(username).isPresent()) {
                        feedback.setText("Username already exists.");
                        return;
                    }
                    userRepository.save(new User(username, PasswordUtil.hashPassword(password)));
                    signIn(username, true);
                } else if (mode.equals("reset")) {
                    User user = userRepository.findByUsername(username).orElse(null);
                    if (user == null) {
                        feedback.setText("No account found for that username.");
                        return;
                    }
                    user.setPasswordHash(PasswordUtil.hashPassword(password));
                    userRepository.save(user);
                    showAuthentication("login", "Password reset. You can now log in.");
                } else {
                    User user = userRepository.findByUsername(username).orElse(null);
                    if (user == null || !PasswordUtil.verifyPassword(password, user.getPasswordHash())) {
                        feedback.setText("Invalid username or password.");
                        return;
                    }
                    signIn(user.getUsername(), false);
                }
            } catch (RuntimeException exception) {
                feedback.setText("Unable to complete the request: " + exception.getMessage());
            }
        });

        Button switchMode = new Button(switch (mode) {
            case "register" -> "Already have an account? Log in";
            case "reset" -> "Back to login";
            default -> "Create an account";
        });
        switchMode.setOnAction(event -> showAuthentication(
                mode.equals("login") ? "register" : "login", null));
        Button resetPassword = new Button("Forgot password?");
        resetPassword.setOnAction(event -> showAuthentication("reset", null));

        VBox form = new VBox(12, title, usernameField, passwordField, feedback, submit, switchMode);
        form.setMaxWidth(360);
        form.setPadding(new Insets(28));
        form.getStyleClass().add("auth-panel");
        if (mode.equals("login")) {
            form.getChildren().add(resetPassword);
        }
        BorderPane root = new BorderPane(form);
        root.setCenter(form);
        root.getStyleClass().add("root");
        applyTheme(root);
        stage.setScene(createScene(root, 520, 440));
        stage.setMinWidth(420);
        stage.setMinHeight(380);
        stage.show();
    }

    private void signIn(String username, boolean showWelcome) {
        currentUsername = username;
        buildWorkspace(showWelcome);
    }

    private void buildWorkspace(boolean showWelcome) {
        tabs = new TabPane();
        tabs.getTabs().setAll(
                new Tab("List"),
                new Tab("Kanban"),
                new Tab("Calendar"),
                new Tab("Projects"),
                new Tab("Stats")
        );
        tabs.getTabs().forEach(tab -> tab.setClosable(false));

        Label brand = new Label("Smart Task Manager");
        brand.getStyleClass().add("header-label");
        Label username = new Label(currentUsername);
        username.getStyleClass().add("header-username");
        ComboBox<String> themePicker = new ComboBox<>(FXCollections.observableArrayList(THEMES));
        themePicker.setValue(theme);
        themePicker.setPromptText("Theme");
        themePicker.setOnAction(event -> {
            theme = themePicker.getValue();
            preferences.put("theme", theme);
            applyTheme(appRoot);
        });

        Button profile = new Button("Profile");
        profile.setOnAction(event -> editProfile());
        Button logout = new Button("Log out");
        logout.setOnAction(event -> {
            currentUsername = null;
            showAuthentication("login", null);
        });
        HBox header = new HBox(12, brand, username, themePicker, profile, logout);
        header.setAlignment(Pos.CENTER_LEFT);
        header.setPadding(new Insets(12, 20, 12, 20));
        header.getStyleClass().add("header-bar");
        HBox.setHgrow(brand, Priority.ALWAYS);

        appRoot = new BorderPane();
        appRoot.setTop(header);
        appRoot.setCenter(tabs);
        appRoot.getStyleClass().add("root");
        applyTheme(appRoot);
        stage.setScene(createScene(appRoot, 1120, 740));
        stage.setMinWidth(760);
        stage.setMinHeight(540);
        stage.show();

        if (showWelcome) {
            Label welcome = new Label("Welcome, " + currentUsername + "!");
            welcome.getStyleClass().add("welcome-message");
            appRoot.setBottom(welcome);
            BorderPane.setMargin(welcome, new Insets(8, 20, 12, 20));
        }
        refreshWorkspace();
    }

    private void applyTheme(Node root) {
        if (root == null) {
            return;
        }
        root.getStyleClass().removeIf(style -> style.startsWith("theme-"));
        root.getStyleClass().add("theme-" + theme);
    }

    private Scene createScene(Node root, double width, double height) {
        Scene scene = new Scene(root, width, height);
        var stylesheet = getClass().getResource("/com/jeff/taskmanager/styles.css");
        if (stylesheet == null) {
            throw new IllegalStateException("The application stylesheet is missing.");
        }
        scene.getStylesheets().add(stylesheet.toExternalForm());
        return scene;
    }

    private void refreshWorkspace() {
        tasks = taskService.listTasks(currentUsername);
        projects = projectRepository.findByOwnerUsername(currentUsername);
        tabs.getTabs().get(0).setContent(buildTaskList());
        tabs.getTabs().get(1).setContent(buildKanban());
        tabs.getTabs().get(2).setContent(buildCalendar());
        tabs.getTabs().get(3).setContent(buildProjects());
        tabs.getTabs().get(4).setContent(buildStats());
    }

    private VBox buildTaskList() {
        Label section = new Label("Your tasks");
        section.getStyleClass().add("section-label");
        TextField title = new TextField();
        title.setPromptText("Task title...");
        TextField description = new TextField();
        description.setPromptText("Description (optional)");
        DatePicker dueDate = new DatePicker();
        dueDate.setPromptText("Due date");
        ChoiceBox<String> priority = new ChoiceBox<>(FXCollections.observableArrayList(PRIORITIES));
        priority.setValue("Medium");
        ComboBox<Project> project = projectPicker();
        Button add = new Button("Add task");
        add.getStyleClass().add("btn-primary");
        add.setOnAction(event -> {
            if (title.getText().isBlank()) {
                showError("A task title is required.");
                return;
            }
            Task task = new Task(title.getText().trim(), description.getText().trim(),
                    dueDate.getValue(), false);
            task.setPriority(priority.getValue());
            task.setProjectId(project.getValue() == null ? null : project.getValue().getId());
            saveNewTask(task);
            title.clear();
            description.clear();
            dueDate.setValue(null);
            priority.setValue("Medium");
            project.setValue(null);
        });
        HBox form = new HBox(10, title, description, dueDate, priority, project, add);
        form.setAlignment(Pos.CENTER_LEFT);
        HBox.setHgrow(title, Priority.ALWAYS);
        HBox.setHgrow(description, Priority.ALWAYS);

        TableView<Task> table = new TableView<>();
        table.setPlaceholder(new Label("No tasks yet — add one above."));
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        table.setItems(FXCollections.observableArrayList(flattenTasks(tasks)));
        table.getColumns().add(taskColumn("Title", "title"));
        table.getColumns().add(taskColumn("Description", "description"));
        table.getColumns().add(taskColumn("Due date", "dueDate"));
        table.getColumns().add(taskColumn("Priority", "priority"));
        table.getColumns().add(statusColumn());
        table.getColumns().add(completionColumn());
        table.getColumns().add(actionColumn());
        VBox.setVgrow(table, Priority.ALWAYS);

        VBox content = new VBox(14, section, form, table);
        content.setPadding(new Insets(20));
        return content;
    }

    private TableColumn<Task, String> taskColumn(String title, String property) {
        TableColumn<Task, String> column = new TableColumn<>(title);
        column.setCellValueFactory(new PropertyValueFactory<>(property));
        return column;
    }

    private TableColumn<Task, Task.Status> statusColumn() {
        TableColumn<Task, Task.Status> column = new TableColumn<>("Status");
        column.setCellValueFactory(cell -> new javafx.beans.property.SimpleObjectProperty<>(
                cell.getValue().getStatus() == null ? Task.Status.TODO : cell.getValue().getStatus()));
        column.setCellFactory(ignored -> new TableCell<>() {
            private final ChoiceBox<Task.Status> status = new ChoiceBox<>(
                    FXCollections.observableArrayList(Task.Status.values()));
            {
                status.setOnAction(event -> {
                    Task task = getTableRow().getItem();
                    if (task != null && status.getValue() != null) {
                        updateTask(task, () -> {
                            task.setStatus(status.getValue());
                            task.setCompleted(status.getValue() == Task.Status.DONE);
                        });
                    }
                });
            }
            @Override
            protected void updateItem(Task.Status value, boolean empty) {
                super.updateItem(value, empty);
                if (empty || value == null) {
                    setGraphic(null);
                } else {
                    status.setValue(value);
                    setGraphic(status);
                }
            }
        });
        return column;
    }

    private TableColumn<Task, Boolean> completionColumn() {
        TableColumn<Task, Boolean> column = new TableColumn<>("Done");
        column.setCellValueFactory(cell -> new javafx.beans.property.SimpleBooleanProperty(
                cell.getValue().isCompleted()));
        column.setCellFactory(ignored -> new TableCell<>() {
            private final CheckBox completed = new CheckBox();
            {
                completed.setOnAction(event -> {
                    Task task = getTableRow().getItem();
                    if (task != null) {
                        updateTask(task, () -> {
                            task.setCompleted(completed.isSelected());
                            task.setStatus(completed.isSelected() ? Task.Status.DONE : Task.Status.TODO);
                        });
                    }
                });
            }
            @Override
            protected void updateItem(Boolean value, boolean empty) {
                super.updateItem(value, empty);
                if (empty || value == null) {
                    setGraphic(null);
                } else {
                    completed.setSelected(value);
                    setGraphic(completed);
                }
            }
        });
        return column;
    }

    private TableColumn<Task, Void> actionColumn() {
        TableColumn<Task, Void> column = new TableColumn<>("Actions");
        column.setCellFactory(ignored -> new TableCell<>() {
            private final Button edit = new Button("Edit");
            private final Button delete = new Button("Delete");
            private final HBox buttons = new HBox(6, edit, delete);
            {
                edit.setOnAction(event -> editTask(getTableRow().getItem()));
                delete.setOnAction(event -> deleteTask(getTableRow().getItem()));
            }
            @Override
            protected void updateItem(Void value, boolean empty) {
                super.updateItem(value, empty);
                setGraphic(empty ? null : buttons);
            }
        });
        return column;
    }

    private VBox buildKanban() {
        HBox columns = new HBox(14);
        for (Task.Status status : Task.Status.values()) {
            VBox column = new VBox(10);
            column.getStyleClass().add("kanban-column");
            Label heading = new Label(switch (status) {
                case TODO -> "To Do";
                case IN_PROGRESS -> "In Progress";
                case DONE -> "Done";
            });
            heading.getStyleClass().add("section-label");
            column.getChildren().add(heading);
            for (Task task : flattenTasks(tasks)) {
                Task.Status taskStatus = task.getStatus() == null ? Task.Status.TODO : task.getStatus();
                if (taskStatus != status) {
                    continue;
                }
                Label taskTitle = new Label(task.getTitle());
                taskTitle.setWrapText(true);
                Label due = new Label(task.getDueDate() == null ? "No due date" : task.getDueDate().toString());
                ChoiceBox<Task.Status> move = new ChoiceBox<>(FXCollections.observableArrayList(Task.Status.values()));
                move.setValue(status);
                move.setOnAction(event -> updateTask(task, () -> {
                    task.setStatus(move.getValue());
                    task.setCompleted(move.getValue() == Task.Status.DONE);
                }));
                column.getChildren().add(new VBox(4, taskTitle, due, move));
            }
            HBox.setHgrow(column, Priority.ALWAYS);
            columns.getChildren().add(column);
        }
        VBox content = new VBox(columns);
        content.setPadding(new Insets(20));
        HBox.setHgrow(columns, Priority.ALWAYS);
        VBox.setVgrow(columns, Priority.ALWAYS);
        return content;
    }

    private VBox buildCalendar() {
        Button previous = new Button("‹");
        Button next = new Button("›");
        Label monthLabel = new Label(calendarMonth.getMonth().getDisplayName(TextStyle.FULL, Locale.getDefault())
                + " " + calendarMonth.getYear());
        monthLabel.getStyleClass().add("section-label");
        previous.setOnAction(event -> {
            calendarMonth = calendarMonth.minusMonths(1);
            tabs.getTabs().get(2).setContent(buildCalendar());
        });
        next.setOnAction(event -> {
            calendarMonth = calendarMonth.plusMonths(1);
            tabs.getTabs().get(2).setContent(buildCalendar());
        });
        HBox monthHeader = new HBox(10, previous, monthLabel, next);
        monthHeader.setAlignment(Pos.CENTER_LEFT);

        GridPane grid = new GridPane();
        grid.setHgap(6);
        grid.setVgap(6);
        for (int day = 0; day < 7; day++) {
            Label dayName = new Label(DayOfWeek.of(day == 6 ? 7 : day + 1)
                    .getDisplayName(TextStyle.SHORT, Locale.getDefault()));
            dayName.getStyleClass().add("section-label");
            grid.add(dayName, day, 0);
        }
        LocalDate first = calendarMonth.atDay(1);
        int offset = first.getDayOfWeek().getValue() - 1;
        for (int day = 1; day <= calendarMonth.lengthOfMonth(); day++) {
            LocalDate date = calendarMonth.atDay(day);
            VBox cell = new VBox(4);
            cell.getStyleClass().add("calendar-day");
            cell.getChildren().add(new Label(Integer.toString(day)));
            for (Task task : flattenTasks(tasks)) {
                if (date.equals(task.getDueDate())) {
                    Button event = new Button(task.getTitle());
                    event.setMaxWidth(Double.MAX_VALUE);
                    event.setOnAction(click -> editTask(task));
                    cell.getChildren().add(event);
                }
            }
            int position = offset + day - 1;
            grid.add(cell, position % 7, position / 7 + 1);
            GridPane.setHgrow(cell, Priority.ALWAYS);
            GridPane.setVgrow(cell, Priority.ALWAYS);
        }
        for (int day = 0; day < 7; day++) {
            ColumnConstraints constraints = new ColumnConstraints();
            constraints.setPercentWidth(100.0 / 7.0);
            grid.getColumnConstraints().add(constraints);
        }
        VBox content = new VBox(14, monthHeader, grid);
        content.setPadding(new Insets(20));
        VBox.setVgrow(grid, Priority.ALWAYS);
        return content;
    }

    private VBox buildProjects() {
        TextField name = new TextField();
        name.setPromptText("Project name");
        TextArea description = new TextArea();
        description.setPromptText("Description");
        description.setPrefRowCount(2);
        ChoiceBox<Project.ProjectType> type = new ChoiceBox<>(
                FXCollections.observableArrayList(Project.ProjectType.values()));
        type.setValue(Project.ProjectType.NON_CODING);
        TextField category = new TextField();
        category.setPromptText("Category");
        TextField endDate = new TextField();
        endDate.setPromptText("End date (YYYY-MM-DD)");
        TextField repository = new TextField();
        repository.setPromptText("Repository URL");
        TextField localPath = new TextField();
        localPath.setPromptText("Local path");
        TextField branch = new TextField("main");
        branch.setPromptText("Branch");
        Project[] editingProject = {null};
        Button save = new Button("Add project");
        save.getStyleClass().add("btn-primary");
        Button clearProjectForm = new Button("New project");
        Label feedback = new Label();
        TableView<Project> projectTable = new TableView<>(FXCollections.observableArrayList(projects));
        projectTable.setPlaceholder(new Label("No projects yet."));
        projectTable.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        TableColumn<Project, String> projectName = new TableColumn<>("Project");
        projectName.setCellValueFactory(new PropertyValueFactory<>("name"));
        TableColumn<Project, String> projectType = new TableColumn<>("Type");
        projectType.setCellValueFactory(cell -> new javafx.beans.property.SimpleStringProperty(
                cell.getValue().getProjectType().toString()));
        TableColumn<Project, String> projectDescription = new TableColumn<>("Description");
        projectDescription.setCellValueFactory(new PropertyValueFactory<>("description"));
        TableColumn<Project, String> projectEndDate = new TableColumn<>("End date");
        projectEndDate.setCellValueFactory(new PropertyValueFactory<>("endDate"));
        projectTable.getColumns().addAll(projectName, projectType, projectDescription, projectEndDate);

        projectTable.getSelectionModel().selectedItemProperty().addListener((observable, previous, selected) -> {
            if (selected == null) {
                return;
            }
            editingProject[0] = selected;
            name.setText(orEmpty(selected.getName()));
            description.setText(orEmpty(selected.getDescription()));
            type.setValue(selected.getProjectType());
            category.setText(orEmpty(selected.getProjectCategory()));
            endDate.setText(orEmpty(selected.getEndDate()));
            repository.setText(orEmpty(selected.getRepositoryUrl()));
            localPath.setText(orEmpty(selected.getLocalPath()));
            branch.setText(orEmpty(selected.getBranch()));
            save.setText("Update project");
            feedback.setText("");
        });
        clearProjectForm.setOnAction(event -> {
            editingProject[0] = null;
            projectTable.getSelectionModel().clearSelection();
            name.clear();
            description.clear();
            type.setValue(Project.ProjectType.NON_CODING);
            category.clear();
            endDate.clear();
            repository.clear();
            localPath.clear();
            branch.setText("main");
            save.setText("Add project");
            feedback.setText("");
        });
        save.setOnAction(event -> {
            String trimmedName = name.getText().trim();
            if (trimmedName.isEmpty()) {
                feedback.setText("Project name is required.");
                return;
            }
            if (type.getValue() == Project.ProjectType.CODING
                    && repository.getText().isBlank() && localPath.getText().isBlank()) {
                feedback.setText("Coding projects need a repository URL or local path.");
                return;
            }
            try {
                Project project = editingProject[0] == null ? new Project() : editingProject[0];
                project.setName(trimmedName);
                project.setDescription(description.getText());
                project.setProjectType(type.getValue());
                project.setProjectCategory(category.getText());
                project.setEndDate(endDate.getText());
                project.setRepositoryUrl(repository.getText());
                project.setLocalPath(localPath.getText());
                project.setBranch(branch.getText());
                project.setOwner(userRepository.findByUsername(currentUsername)
                        .orElseThrow(() -> new IllegalStateException("User account no longer exists.")));
                projectRepository.save(project);
                refreshWorkspace();
            } catch (RuntimeException exception) {
                feedback.setText("Unable to save project: " + exception.getMessage());
            }
        });

        HBox rowOne = new HBox(10, name, type, category, endDate);
        HBox rowTwo = new HBox(10, repository, localPath, branch, save, clearProjectForm);
        HBox.setHgrow(name, Priority.ALWAYS);
        HBox.setHgrow(repository, Priority.ALWAYS);
        VBox content = new VBox(12, new Label("Projects"), rowOne, description, rowTwo, feedback, projectTable);
        content.setPadding(new Insets(20));
        VBox.setVgrow(projectTable, Priority.ALWAYS);
        return content;
    }

    private VBox buildStats() {
        List<Task> allTasks = flattenTasks(tasks);
        long completed = allTasks.stream().filter(Task::isCompleted).count();
        long overdue = allTasks.stream().filter(task -> task.getDueDate() != null
                && task.getDueDate().isBefore(LocalDate.now()) && !task.isCompleted()).count();
        long toDo = allTasks.stream().filter(task -> task.getStatus() == null
                || task.getStatus() == Task.Status.TODO).count();
        long inProgress = allTasks.stream().filter(task -> task.getStatus() == Task.Status.IN_PROGRESS).count();
        long done = allTasks.stream().filter(task -> task.getStatus() == Task.Status.DONE).count();
        long withSubtasks = tasks.stream().filter(task -> !task.getSubtasks().isEmpty()).count();
        long subtaskCount = tasks.stream().mapToLong(task -> task.getSubtasks().size()).sum();

        VBox content = new VBox(14,
                new Label("Task statistics"),
                new Label("Total tasks: " + allTasks.size()),
                new Label("Completed: " + completed),
                new Label("Remaining: " + (allTasks.size() - completed)),
                new Label("To do: " + toDo),
                new Label("In progress: " + inProgress),
                new Label("Done: " + done),
                new Label("Overdue: " + overdue),
                new Label("Tasks with subtasks: " + withSubtasks),
                new Label("Subtasks: " + subtaskCount));
        content.setPadding(new Insets(20));
        content.getStyleClass().add("stats-view");
        return content;
    }

    private ComboBox<Project> projectPicker() {
        ComboBox<Project> picker = new ComboBox<>(FXCollections.observableArrayList(projects));
        picker.setPromptText("Project");
        picker.setConverter(new StringConverter<>() {
            @Override
            public String toString(Project project) {
                return project == null ? "" : project.getName();
            }
            @Override
            public Project fromString(String value) {
                return projects.stream().filter(project -> project.getName().equals(value))
                        .findFirst().orElse(null);
            }
        });
        return picker;
    }

    private List<Task> flattenTasks(List<Task> roots) {
        List<Task> flattened = new ArrayList<>();
        for (Task task : roots) {
            flattened.add(task);
            flattened.addAll(task.getSubtasks());
        }
        return flattened;
    }

    private void saveNewTask(Task task) {
        try {
            taskService.addTask(task, currentUsername);
            refreshWorkspace();
        } catch (RuntimeException exception) {
            showError("Unable to save task: " + exception.getMessage());
        }
    }

    private void updateTask(Task task, Runnable update) {
        try {
            update.run();
            taskService.updateTask(task.getId(), task, currentUsername);
            refreshWorkspace();
        } catch (RuntimeException exception) {
            showError("Unable to update task: " + exception.getMessage());
        }
    }

    private void deleteTask(Task task) {
        if (task == null) {
            return;
        }
        Alert confirmation = new Alert(Alert.AlertType.CONFIRMATION,
                "Delete \"" + task.getTitle() + "\"?", ButtonType.CANCEL, ButtonType.OK);
        confirmation.setHeaderText("Delete task");
        if (confirmation.showAndWait().orElse(ButtonType.CANCEL) == ButtonType.OK) {
            taskService.deleteTaskById(task.getId(), currentUsername);
            refreshWorkspace();
        }
    }

    private void editTask(Task task) {
        if (task == null) {
            return;
        }
        Dialog<ButtonType> dialog = new Dialog<>();
        dialog.setTitle("Edit task");
        dialog.getDialogPane().getButtonTypes().addAll(ButtonType.CANCEL, ButtonType.OK);
        TextField title = new TextField(task.getTitle());
        TextArea description = new TextArea(orEmpty(task.getDescription()));
        description.setPrefRowCount(3);
        DatePicker dueDate = new DatePicker(task.getDueDate());
        ChoiceBox<String> priority = new ChoiceBox<>(FXCollections.observableArrayList(PRIORITIES));
        priority.setValue(task.getPriority() == null ? "Medium" : task.getPriority());
        ChoiceBox<Task.Status> status = new ChoiceBox<>(FXCollections.observableArrayList(Task.Status.values()));
        status.setValue(task.getStatus() == null ? Task.Status.TODO : task.getStatus());
        CheckBox priorityTask = new CheckBox("Mark as priority");
        priorityTask.setSelected(task.isPriorityTask());
        ComboBox<Project> project = projectPicker();
        projects.stream().filter(item -> item.getId().equals(task.getProjectId())).findFirst()
                .ifPresent(project::setValue);
        TextField newSubtask = new TextField();
        newSubtask.setPromptText("Add a subtask (optional)");
        VBox fields = new VBox(8,
                new Label("Title"), title,
                new Label("Description"), description,
                new Label("Due date"), dueDate,
                new Label("Priority"), priority,
                new Label("Status"), status,
                priorityTask, new Label("Project"), project);
        if (task.getParentTask() == null) {
            fields.getChildren().addAll(new Label("Subtasks (maximum 4)"), newSubtask);
        }
        fields.setPadding(new Insets(12));
        dialog.getDialogPane().setContent(fields);
        dialog.setResultConverter(button -> button == ButtonType.OK ? button : null);
        Optional<ButtonType> result = dialog.showAndWait();
        if (result.isEmpty()) {
            return;
        }
        if (title.getText().isBlank()) {
            showError("A task title is required.");
            return;
        }
        if (!newSubtask.getText().isBlank() && task.getSubtasks().size() >= 4) {
            showError("A task cannot have more than 4 subtasks.");
            return;
        }
        updateTask(task, () -> {
            task.setTitle(title.getText().trim());
            task.setDescription(description.getText().trim());
            task.setDueDate(dueDate.getValue());
            task.setPriority(priority.getValue());
            task.setPriorityTask(priorityTask.isSelected());
            task.setStatus(status.getValue());
            task.setCompleted(status.getValue() == Task.Status.DONE);
            task.setProjectId(project.getValue() == null ? null : project.getValue().getId());
            if (!newSubtask.getText().isBlank()) {
                task.addChildTask(new Task(newSubtask.getText().trim(), "", task.getDueDate(), false));
            }
        });
    }

    private void editProfile() {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new IllegalStateException("User account no longer exists."));
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
        String nextUsername = username.getText().trim();
        if (nextUsername.isBlank()) {
            showError("Username cannot be empty.");
            return;
        }
        if (!nextUsername.equalsIgnoreCase(user.getUsername())
                && userRepository.findByUsername(nextUsername).isPresent()) {
            showError("Username already exists.");
            return;
        }
        if (!newPassword.getText().isBlank()) {
            if (currentPassword.getText().isBlank()
                    || !PasswordUtil.verifyPassword(currentPassword.getText(), user.getPasswordHash())) {
                showError("Enter your correct current password to change it.");
                return;
            }
            user.setPasswordHash(PasswordUtil.hashPassword(newPassword.getText()));
        }
        user.setUsername(nextUsername);
        user.setGithubLogin(githubLogin.getText());
        userRepository.save(user);
        currentUsername = nextUsername;
        buildWorkspace(false);
    }

    private void showError(String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR, message, ButtonType.OK);
        alert.setHeaderText("Smart Task Manager");
        alert.showAndWait();
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value;
    }

    public static void main(String[] args) {
        launch(args);
    }
}
