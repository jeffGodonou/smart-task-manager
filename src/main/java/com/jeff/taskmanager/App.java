package com.jeff.taskmanager;

import java.time.LocalDate;
import com.jeff.taskmanager.model.Task;
import com.jeff.taskmanager.service.TaskService;

import javafx.application.Application;
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
import javafx.stage.Stage;

public class App extends Application {
    @SuppressWarnings("unchecked")
    @Override
    public void start(Stage primaryStage) {
        // Initialize the TaskService
        TaskService taskService = new TaskService();

        // Set the form to create a new task
        Label label = new Label("Smart Task Manager");
        Label title = new Label("Title:");
        TextField titleField = new TextField();
        Label date  = new Label ("Due Date");
        DatePicker datePicker = new DatePicker();
        Button add = new Button("Add Task");

        HBox hbox = new HBox(10, title, titleField, date, datePicker, add);

        // Define the description field
        Label description = new Label("Description:");
        TextField descriptionField = new TextField();
        HBox descriptionBox = new HBox(10, description, descriptionField);

        // Define the table view to display tasks
        TableView<Task> tableView = new TableView<>();

        // load persisted tasks into the TableView at startup
        tableView.getItems().addAll(taskService.listTasks(""));

        // define the table of tasks 
        TableColumn<Task, String> titleColumn = new TableColumn<>("Title");
        titleColumn.setCellValueFactory(new PropertyValueFactory<>("title"));
        
        TableColumn<Task, String> descriptionColumn = new TableColumn<>("Description");
        descriptionColumn.setCellValueFactory(new PropertyValueFactory<>("description"));

        TableColumn<Task, LocalDate> dueDateColumn = new TableColumn<>("Due Date");
        dueDateColumn.setCellValueFactory(new PropertyValueFactory<>("dueDate"));

        TableColumn<Task, Boolean> completedColumn = new TableColumn<>("Completed");
        completedColumn.setCellValueFactory(new PropertyValueFactory<>("completed"));

        TableColumn<Task, String> priorityColumn = new TableColumn<>("Priority");
        priorityColumn.setCellValueFactory(new PropertyValueFactory<>("priority"));
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
                if (empty) {
                    setGraphic(null);
                } else {
                    priorityBox.setValue(item);
                    setGraphic(priorityBox);
                }
            }
        });

        TableColumn<Task, Void> actionsColumn = new TableColumn<>("Actions");
        actionsColumn.setCellFactory(col -> new javafx.scene.control.TableCell<>() {
            private final Button deleteButton = new Button("Delete");
            
            // remove task from table view after deletion
            {
                deleteButton.setOnAction(event -> {
                    Task task = getTableView().getItems().get(getIndex());
                    getTableView().getItems().remove(task);
                    taskService.deleteTask(task); 
                });
            }

            // specify delete button appearence
            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                if (empty) {
                    setGraphic(null);
                } else {
                    setGraphic(deleteButton);
                }
            }
        });

        // set TableView
        tableView.getColumns().addAll(titleColumn, descriptionColumn, dueDateColumn, completedColumn, priorityColumn, actionsColumn);

        // Set the action for the add button
        add.setOnAction((action-> {
            String taskTitle = titleField.getText();
            LocalDate dueDate = datePicker.getValue();
            String taskDescription = descriptionField.getText();
            Task task = new Task(taskTitle, taskDescription , dueDate, false);
            
            taskService.addTask(task, "");
            System.out.println("Task added: " + taskTitle + " Due:" + dueDate);
            tableView.getItems().add(task);
            
            titleField.clear();
            descriptionField.clear();
            datePicker.setValue(null);
        }));

        VBox vbox = new VBox(10, label, hbox, descriptionBox, tableView);
        Scene scene = new Scene(vbox, 900, 450);


        primaryStage.setTitle("Task Manager");

        primaryStage.setScene(scene);
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
