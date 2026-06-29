package com.jeff.taskmanager;

import java.time.LocalDate;
import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.service.TaskService;

import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.control.Button;
import javafx.scene.control.DatePicker;
import javafx.scene.control.ChoiceBox;
import javafx.scene.control.TableView;
import javafx.scene.control.TableColumn;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.layout.Priority;
import javafx.stage.Stage;

/**
 * JavaFX application entry point for the desktop task manager UI.
 *
 * <p>This class builds a styled task creation form and task table,
 * and delegates persistence to {@link com.jeff.taskmanager.service.TaskService}.</p>
 */
public class App extends Application {

    @SuppressWarnings("unchecked")
    @Override
    public void start(Stage primaryStage) {

        TaskService taskService = new TaskService();

        // ── Header bar ──────────────────────────────────────────────────────
        Label appTitle = new Label("Smart Task Manager");
        appTitle.getStyleClass().add("header-label");

        HBox headerBar = new HBox(appTitle);
        headerBar.getStyleClass().add("header-bar");
        headerBar.setAlignment(Pos.CENTER_LEFT);

        // ── Form section label ───────────────────────────────────────────────
        Label formSectionLabel = new Label("ADD A NEW TASK");
        formSectionLabel.getStyleClass().add("section-label");

        // ── Title field ──────────────────────────────────────────────────────
        Label titleLabel = new Label("Title");
        titleLabel.getStyleClass().add("form-label");
        TextField titleField = new TextField();
        titleField.setPromptText("Task title...");
        titleField.setPrefWidth(200);

        VBox titleBox = new VBox(4, titleLabel, titleField);

        // ── Due date field ───────────────────────────────────────────────────
        Label dateLabel = new Label("Due date");
        dateLabel.getStyleClass().add("form-label");
        DatePicker datePicker = new DatePicker();
        datePicker.setPromptText("Pick a date");
        datePicker.setPrefWidth(150);

        VBox dateBox = new VBox(4, dateLabel, datePicker);

        // ── Priority field ───────────────────────────────────────────────────
        Label priorityLabel = new Label("Priority");
        priorityLabel.getStyleClass().add("form-label");
        ChoiceBox<String> priorityField = new ChoiceBox<>();
        priorityField.getItems().addAll("Low", "Medium", "High");
        priorityField.setValue("Medium");
        priorityField.setPrefWidth(120);

        VBox priorityBox = new VBox(4, priorityLabel, priorityField);

        // ── Add button ───────────────────────────────────────────────────────
        Button addButton = new Button("Add task");
        addButton.getStyleClass().add("btn-primary");
        VBox addButtonBox = new VBox(addButton);
        addButtonBox.setAlignment(Pos.BOTTOM_LEFT);

        HBox topFormRow = new HBox(12, titleBox, dateBox, priorityBox, addButtonBox);
        topFormRow.setAlignment(Pos.BOTTOM_LEFT);

        // ── Description field ────────────────────────────────────────────────
        Label descLabel = new Label("Description");
        descLabel.getStyleClass().add("form-label");
        TextField descriptionField = new TextField();
        descriptionField.setPromptText("Optional description...");
        descriptionField.setPrefWidth(500);
        HBox.setHgrow(descriptionField, Priority.ALWAYS);

        VBox descBox = new VBox(4, descLabel, descriptionField);

        // ── Form area container ──────────────────────────────────────────────
        VBox formArea = new VBox(10, formSectionLabel, topFormRow, descBox);
        formArea.getStyleClass().add("form-area");

        // ── TableView ────────────────────────────────────────────────────────
        TableView<Task> tableView = new TableView<>();
        tableView.getStyleClass().add("table-view");
        tableView.setPlaceholder(new Label("No tasks yet — add one above."));
        tableView.getItems().addAll(taskService.listTasks(""));
        VBox.setVgrow(tableView, Priority.ALWAYS);

        TableColumn<Task, String> titleColumn = new TableColumn<>("Title");
        titleColumn.setCellValueFactory(new PropertyValueFactory<>("title"));
        titleColumn.setPrefWidth(200);

        TableColumn<Task, String> descriptionColumn = new TableColumn<>("Description");
        descriptionColumn.setCellValueFactory(new PropertyValueFactory<>("description"));
        descriptionColumn.setPrefWidth(180);

        TableColumn<Task, LocalDate> dueDateColumn = new TableColumn<>("Due date");
        dueDateColumn.setCellValueFactory(new PropertyValueFactory<>("dueDate"));
        dueDateColumn.setPrefWidth(110);

        TableColumn<Task, Boolean> completedColumn = new TableColumn<>("Completed");
        completedColumn.setCellValueFactory(new PropertyValueFactory<>("completed"));
        completedColumn.setPrefWidth(90);

        // Priority column with coloured badge labels
        TableColumn<Task, String> priorityColumn = new TableColumn<>("Priority");
        priorityColumn.setCellValueFactory(new PropertyValueFactory<>("priority"));
        priorityColumn.setPrefWidth(100);
        priorityColumn.setCellFactory(col -> new javafx.scene.control.TableCell<>() {
            private final ChoiceBox<String> priorityBox = new ChoiceBox<>();
            {
                priorityBox.getItems().addAll("Low", "Medium", "High");
                priorityBox.setOnAction(event -> {
                    Task task = getTableView().getItems().get(getIndex());
                    task.setPriority(priorityBox.getValue());
                    taskService.updateTaskPriority(task.getTitle(), task.getPriority());
                });
            }

            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setGraphic(null);
                } else {
                    priorityBox.setValue(item);
                    // Apply style class based on value
                    priorityBox.getStyleClass().removeAll("badge-high", "badge-medium", "badge-low");
                    switch (item) {
                        case "High"   -> priorityBox.getStyleClass().add("badge-high");
                        case "Medium" -> priorityBox.getStyleClass().add("badge-medium");
                        default       -> priorityBox.getStyleClass().add("badge-low");
                    }
                    setGraphic(priorityBox);
                }
            }
        });

        // Actions column with styled delete button
        TableColumn<Task, Void> actionsColumn = new TableColumn<>("Actions");
        actionsColumn.setPrefWidth(90);
        actionsColumn.setCellFactory(col -> new javafx.scene.control.TableCell<>() {
            private final Button deleteButton = new Button("Delete");
            {
                deleteButton.getStyleClass().add("btn-danger");
                deleteButton.setOnAction(event -> {
                    Task task = getTableView().getItems().get(getIndex());
                    getTableView().getItems().remove(task);
                    taskService.deleteTask(task);
                });
            }

            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                setGraphic(empty ? null : deleteButton);
            }
        });

        tableView.getColumns().addAll(
            titleColumn, descriptionColumn, dueDateColumn,
            completedColumn, priorityColumn, actionsColumn
        );

        // ── Add task action ──────────────────────────────────────────────────
        addButton.setOnAction(action -> {
            String taskTitle = titleField.getText().trim();
            LocalDate dueDate = datePicker.getValue();
            String taskDescription = descriptionField.getText().trim();
            String priority = priorityField.getValue();

            if (taskTitle.isEmpty()) return;

            Task task = new Task(taskTitle, taskDescription, dueDate, false);
            task.setPriority(priority);

            taskService.addTask(task, "");
            tableView.getItems().add(task);

            titleField.clear();
            descriptionField.clear();
            datePicker.setValue(null);
            priorityField.setValue("Medium");
        });

        // ── Root layout ──────────────────────────────────────────────────────
        VBox root = new VBox(0, headerBar, formArea, tableView);
        VBox.setMargin(tableView, new Insets(16, 20, 16, 20));

        Scene scene = new Scene(root, 960, 560);
        scene.getStylesheets().add(
            getClass().getResource("/com/jeff/taskmanager/styles.css").toExternalForm()
        );

        primaryStage.setTitle("Smart Task Manager");
        primaryStage.setScene(scene);
        primaryStage.setMinWidth(700);
        primaryStage.setMinHeight(450);
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}