package com.jeff.taskmanager;

import com.jeff.taskmanager.model.Project;
import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.ProjectRepository;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.service.TaskService;
import javafx.application.Application;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonType;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.Tab;
import javafx.scene.control.TabPane;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.stage.Stage;

import java.util.List;
import java.time.YearMonth;
import java.util.prefs.Preferences;

/**
 * JavaFX application entry point and coordinator for the desktop task manager.
 */
public class App extends Application implements TaskViews.TaskActions {
    private static final List<String> THEMES = List.of("blue", "light", "dark", "forest", "gray");
    private static final int LIST_TAB = 0;
    private static final int KANBAN_TAB = 1;
    private static final int CALENDAR_TAB = 2;
    private static final int PROJECTS_TAB = 3;
    private static final int STATS_TAB = 4;

    private final TaskService taskService = new TaskService();
    private final ProjectRepository projectRepository = new ProjectRepository();
    private final UserRepository userRepository = new UserRepository();
    private final Preferences preferences = Preferences.userNodeForPackage(App.class);

    private Stage stage;
    private String currentUsername;
    private String theme;
    private YearMonth calendarMonth = YearMonth.now();
    private TabPane tabs;
    private BorderPane appRoot;
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
        showAuthentication();
    }

    private void showAuthentication() {
        AuthenticationView view = new AuthenticationView(userRepository, theme, this::onAuthenticated);
        stage.setScene(createScene(view, 520, 440));
        stage.setMinWidth(420);
        stage.setMinHeight(380);
        stage.show();
    }

    private void onAuthenticated(String username, boolean showWelcome) {
        currentUsername = username;
        buildWorkspace(showWelcome);
    }

    private void buildWorkspace(boolean showWelcome) {
        tabs = createTabs();

        Label brand = new Label("Smart Task Manager");
        brand.getStyleClass().add("header-label");
        Label username = new Label(currentUsername);
        username.getStyleClass().add("header-username");
        ComboBox<String> themePicker = new ComboBox<>(FXCollections.observableArrayList(THEMES));
        themePicker.setValue(theme);
        themePicker.setPromptText("Theme");
        themePicker.setOnAction(event -> changeTheme(themePicker.getValue()));

        Button profile = new Button("Profile");
        profile.setOnAction(event -> editProfile());
        Button logout = new Button("Log out");
        logout.setOnAction(event -> {
            currentUsername = null;
            showAuthentication();
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
        if (showWelcome) {
            Label welcome = new Label("Welcome, " + currentUsername + "!");
            welcome.getStyleClass().add("welcome-message");
            appRoot.setBottom(welcome);
            BorderPane.setMargin(welcome, new Insets(8, 20, 12, 20));
        }

        stage.setScene(createScene(appRoot, 1120, 740));
        stage.setMinWidth(760);
        stage.setMinHeight(540);
        stage.show();
        refreshWorkspace();
    }

    private TabPane createTabs() {
        TabPane pane = new TabPane(
                new Tab("List"),
                new Tab("Kanban"),
                new Tab("Calendar"),
                new Tab("Projects"),
                new Tab("Stats"));
        pane.getTabs().forEach(tab -> tab.setClosable(false));
        return pane;
    }

    private void refreshWorkspace() {
        tasks = taskService.listTasks(currentUsername);
        projects = projectRepository.findByOwnerUsername(currentUsername);
        tabs.getTabs().get(LIST_TAB).setContent(
                TaskViews.taskList(tasks, projects, this, this::showError));
        tabs.getTabs().get(KANBAN_TAB).setContent(TaskViews.kanban(tasks, this));
        tabs.getTabs().get(CALENDAR_TAB).setContent(TaskViews.calendar(
                tasks,
                calendarMonth,
                month -> {
                    calendarMonth = month;
                    refreshWorkspace();
                },
                this::edit));
        tabs.getTabs().get(PROJECTS_TAB).setContent(new ProjectManagementView(
                projects, currentUsername, projectRepository, userRepository, this::refreshWorkspace));
        tabs.getTabs().get(STATS_TAB).setContent(TaskViews.statistics(tasks));
    }

    private void changeTheme(String selectedTheme) {
        if (!THEMES.contains(selectedTheme)) {
            return;
        }
        theme = selectedTheme;
        preferences.put("theme", theme);
        applyTheme(appRoot);
    }

    private void applyTheme(Node root) {
        root.getStyleClass().removeIf(style -> style.startsWith("theme-"));
        root.getStyleClass().add("theme-" + theme);
    }

    private Scene createScene(Parent root, double width, double height) {
        Scene scene = new Scene(root, width, height);
        var stylesheet = getClass().getResource("/com/jeff/taskmanager/styles.css");
        if (stylesheet == null) {
            throw new IllegalStateException("The application stylesheet is missing.");
        }
        scene.getStylesheets().add(stylesheet.toExternalForm());
        return scene;
    }

    @Override
    public void create(Task task) {
        try {
            taskService.addTask(task, currentUsername);
            refreshWorkspace();
        } catch (RuntimeException exception) {
            showError("Unable to save task: " + exception.getMessage());
        }
    }

    @Override
    public void update(Task task, Runnable change) {
        try {
            change.run();
            taskService.updateTask(task.getId(), task, currentUsername);
            refreshWorkspace();
        } catch (RuntimeException exception) {
            showError("Unable to update task: " + exception.getMessage());
        }
    }

    @Override
    public void edit(Task task) {
        if (task != null) {
            TaskViews.editTask(task, projects, this::update, this::showError);
        }
    }

    @Override
    public void delete(Task task) {
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

    private void editProfile() {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new IllegalStateException("User account no longer exists."));
        ProfileEditor.show(user, userRepository, this::onProfileUpdated, this::showError);
    }

    private void onProfileUpdated(User user) {
        currentUsername = user.getUsername();
        buildWorkspace(false);
    }

    private void showError(String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR, message, ButtonType.OK);
        alert.setHeaderText("Smart Task Manager");
        alert.showAndWait();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
