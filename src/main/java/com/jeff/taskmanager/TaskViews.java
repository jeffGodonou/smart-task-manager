package com.jeff.taskmanager;

import com.jeff.taskmanager.model.Project;
import com.jeff.taskmanager.model.Task;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonType;
import javafx.scene.control.CheckBox;
import javafx.scene.control.ChoiceBox;
import javafx.scene.control.ComboBox;
import javafx.scene.control.DatePicker;
import javafx.scene.control.Dialog;
import javafx.scene.control.Label;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.ColumnConstraints;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.util.StringConverter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

final class TaskViews {
    private static final List<String> PRIORITIES = List.of("Low", "Medium", "High");

    private TaskViews() {
    }

    static VBox taskList(List<Task> tasks, List<Project> projects, TaskActions actions,
                         Consumer<String> showError) {
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
        ComboBox<Project> project = projectPicker(projects);
        Button add = new Button("Add task");
        add.getStyleClass().add("btn-primary");
        add.setOnAction(event -> {
            if (title.getText().isBlank()) {
                showError.accept("A task title is required.");
                return;
            }
            Task task = new Task(title.getText().trim(), description.getText().trim(),
                    dueDate.getValue(), false);
            task.setPriority(priority.getValue());
            task.setProjectId(project.getValue() == null ? null : project.getValue().getId());
            actions.create(task);
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
        // Show subtasks as rows too, so they can be edited and completed independently.
        table.setItems(FXCollections.observableArrayList(flatten(tasks)));
        table.getColumns().add(taskColumn("Title", "title"));
        table.getColumns().add(taskColumn("Description", "description"));
        table.getColumns().add(taskColumn("Due date", "dueDate"));
        table.getColumns().add(taskColumn("Priority", "priority"));
        table.getColumns().add(statusColumn(actions));
        table.getColumns().add(completionColumn(actions));
        table.getColumns().add(actionColumn(actions));
        VBox.setVgrow(table, Priority.ALWAYS);

        VBox content = new VBox(14, section, form, table);
        content.setPadding(new Insets(20));
        return content;
    }

    static VBox kanban(List<Task> tasks, TaskActions actions) {
        HBox columns = new HBox(14);
        for (Task.Status status : Task.Status.values()) {
            VBox column = new VBox(10);
            column.getStyleClass().add("kanban-column");
            Label heading = new Label(statusLabel(status));
            heading.getStyleClass().add("section-label");
            column.getChildren().add(heading);

            for (Task task : flatten(tasks)) {
                if (taskStatus(task) != status) {
                    continue;
                }
                Label title = new Label(task.getTitle());
                title.setWrapText(true);
                Label dueDate = new Label(task.getDueDate() == null
                        ? "No due date" : task.getDueDate().toString());
                ChoiceBox<Task.Status> move = new ChoiceBox<>(
                        FXCollections.observableArrayList(Task.Status.values()));
                move.setValue(status);
                move.setOnAction(event -> actions.update(task, () -> {
                    task.setStatus(move.getValue());
                    task.setCompleted(move.getValue() == Task.Status.DONE);
                }));
                column.getChildren().add(new VBox(4, title, dueDate, move));
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

    static VBox calendar(List<Task> tasks, YearMonth month, Consumer<YearMonth> onMonthChange,
                         Consumer<Task> onEditTask) {
        Button previous = new Button("‹");
        Button next = new Button("›");
        Label monthLabel = new Label(month.getMonth().getDisplayName(TextStyle.FULL, Locale.getDefault())
                + " " + month.getYear());
        monthLabel.getStyleClass().add("section-label");
        previous.setOnAction(event -> onMonthChange.accept(month.minusMonths(1)));
        next.setOnAction(event -> onMonthChange.accept(month.plusMonths(1)));
        HBox monthHeader = new HBox(10, previous, monthLabel, next);
        monthHeader.setAlignment(Pos.CENTER_LEFT);

        GridPane grid = new GridPane();
        grid.setHgap(6);
        grid.setVgap(6);
        for (int column = 0; column < 7; column++) {
            Label weekday = new Label(DayOfWeek.of(column + 1)
                    .getDisplayName(TextStyle.SHORT, Locale.getDefault()));
            weekday.getStyleClass().add("section-label");
            grid.add(weekday, column, 0);
            ColumnConstraints constraints = new ColumnConstraints();
            constraints.setPercentWidth(100.0 / 7.0);
            grid.getColumnConstraints().add(constraints);
        }

        int firstWeekdayOffset = month.atDay(1).getDayOfWeek().getValue() - 1;
        List<Task> calendarTasks = flatten(tasks);
        for (int day = 1; day <= month.lengthOfMonth(); day++) {
            LocalDate date = month.atDay(day);
            VBox cell = new VBox(4);
            cell.getStyleClass().add("calendar-day");
            cell.getChildren().add(new Label(Integer.toString(day)));
            for (Task task : calendarTasks) {
                if (date.equals(task.getDueDate())) {
                    Button event = new Button(task.getTitle());
                    event.setMaxWidth(Double.MAX_VALUE);
                    event.setOnAction(click -> onEditTask.accept(task));
                    cell.getChildren().add(event);
                }
            }
            int position = firstWeekdayOffset + day - 1;
            // Convert the date's offset into a zero-based column and a calendar row.
            grid.add(cell, position % 7, position / 7 + 1);
            GridPane.setHgrow(cell, Priority.ALWAYS);
            GridPane.setVgrow(cell, Priority.ALWAYS);
        }

        VBox content = new VBox(14, monthHeader, grid);
        content.setPadding(new Insets(20));
        VBox.setVgrow(grid, Priority.ALWAYS);
        return content;
    }

    static VBox statistics(List<Task> tasks) {
        List<Task> allTasks = flatten(tasks);
        long completed = allTasks.stream().filter(Task::isCompleted).count();
        long overdue = allTasks.stream()
                .filter(task -> task.getDueDate() != null
                        && task.getDueDate().isBefore(LocalDate.now()) && !task.isCompleted())
                .count();
        long toDo = allTasks.stream().filter(task -> taskStatus(task) == Task.Status.TODO).count();
        long inProgress = allTasks.stream().filter(task -> taskStatus(task) == Task.Status.IN_PROGRESS).count();
        long done = allTasks.stream().filter(task -> taskStatus(task) == Task.Status.DONE).count();
        long tasksWithSubtasks = tasks.stream().filter(task -> !task.getSubtasks().isEmpty()).count();
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
                new Label("Tasks with subtasks: " + tasksWithSubtasks),
                new Label("Subtasks: " + subtaskCount));
        content.setPadding(new Insets(20));
        content.getStyleClass().add("stats-view");
        return content;
    }

    static void editTask(Task task, List<Project> projects, BiConsumer<Task, Runnable> update,
                         Consumer<String> showError) {
        Dialog<ButtonType> dialog = new Dialog<>();
        dialog.setTitle("Edit task");
        dialog.getDialogPane().getButtonTypes().addAll(ButtonType.CANCEL, ButtonType.OK);

        TextField title = new TextField(task.getTitle());
        TextArea description = new TextArea(orEmpty(task.getDescription()));
        description.setPrefRowCount(3);
        DatePicker dueDate = new DatePicker(task.getDueDate());
        ChoiceBox<String> priority = new ChoiceBox<>(FXCollections.observableArrayList(PRIORITIES));
        priority.setValue(task.getPriority() == null ? "Medium" : task.getPriority());
        ChoiceBox<Task.Status> status = new ChoiceBox<>(
                FXCollections.observableArrayList(Task.Status.values()));
        status.setValue(taskStatus(task));
        CheckBox priorityTask = new CheckBox("Mark as priority");
        priorityTask.setSelected(task.isPriorityTask());
        ComboBox<Project> project = projectPicker(projects);
        projects.stream()
                .filter(item -> item.getId().equals(task.getProjectId()))
                .findFirst()
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
        // Subtasks are one level deep, so only parent tasks can add children here.
        if (task.getParentTask() == null) {
            fields.getChildren().addAll(new Label("Subtasks (maximum 4)"), newSubtask);
        }
        fields.setPadding(new Insets(12));
        dialog.getDialogPane().setContent(fields);
        dialog.setResultConverter(button -> button == ButtonType.OK ? button : null);

        Optional<ButtonType> result = dialog.showAndWait();
        if (result.isEmpty() || !ButtonType.OK.equals(result.get())) {
            return;
        }
        if (title.getText().isBlank()) {
            showError.accept("A task title is required.");
            return;
        }
        if (!newSubtask.getText().isBlank() && task.getSubtasks().size() >= 4) {
            showError.accept("A task cannot have more than 4 subtasks.");
            return;
        }

        update.accept(task, () -> {
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

    static List<Task> flatten(List<Task> roots) {
        // TaskService limits trees to one subtask level, so one pass is sufficient.
        List<Task> flattened = new ArrayList<>();
        for (Task task : roots) {
            flattened.add(task);
            flattened.addAll(task.getSubtasks());
        }
        return flattened;
    }

    private static TableColumn<Task, String> taskColumn(String title, String property) {
        TableColumn<Task, String> column = new TableColumn<>(title);
        column.setCellValueFactory(new PropertyValueFactory<>(property));
        return column;
    }

    private static TableColumn<Task, Task.Status> statusColumn(TaskActions actions) {
        TableColumn<Task, Task.Status> column = new TableColumn<>("Status");
        column.setCellValueFactory(cell -> new javafx.beans.property.SimpleObjectProperty<>(
                taskStatus(cell.getValue())));
        column.setCellFactory(ignored -> new TableCell<>() {
            private final ChoiceBox<Task.Status> status = new ChoiceBox<>(
                    FXCollections.observableArrayList(Task.Status.values()));
            {
                status.setOnAction(event -> {
                    Task task = getTableRow().getItem();
                    if (task != null && status.getValue() != null) {
                        actions.update(task, () -> {
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

    private static TableColumn<Task, Boolean> completionColumn(TaskActions actions) {
        TableColumn<Task, Boolean> column = new TableColumn<>("Done");
        column.setCellValueFactory(cell -> new javafx.beans.property.SimpleBooleanProperty(
                cell.getValue().isCompleted()));
        column.setCellFactory(ignored -> new TableCell<>() {
            private final CheckBox completed = new CheckBox();
            {
                completed.setOnAction(event -> {
                    Task task = getTableRow().getItem();
                    if (task != null) {
                        actions.update(task, () -> {
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

    private static TableColumn<Task, Void> actionColumn(TaskActions actions) {
        TableColumn<Task, Void> column = new TableColumn<>("Actions");
        column.setCellFactory(ignored -> new TableCell<>() {
            private final Button edit = new Button("Edit");
            private final Button delete = new Button("Delete");
            private final HBox buttons = new HBox(6, edit, delete);
            {
                edit.setOnAction(event -> actions.edit(getTableRow().getItem()));
                delete.setOnAction(event -> actions.delete(getTableRow().getItem()));
            }
            @Override
            protected void updateItem(Void value, boolean empty) {
                super.updateItem(value, empty);
                setGraphic(empty ? null : buttons);
            }
        });
        return column;
    }

    private static ComboBox<Project> projectPicker(List<Project> projects) {
        ComboBox<Project> picker = new ComboBox<>(FXCollections.observableArrayList(projects));
        picker.setPromptText("Project");
        picker.setConverter(new StringConverter<>() {
            @Override
            public String toString(Project project) {
                return project == null ? "" : project.getName();
            }

            @Override
            public Project fromString(String value) {
                return projects.stream()
                        .filter(project -> project.getName().equals(value))
                        .findFirst()
                        .orElse(null);
            }
        });
        return picker;
    }

    private static Task.Status taskStatus(Task task) {
        // Treat older tasks without a stored status as not started.
        return task.getStatus() == null ? Task.Status.TODO : task.getStatus();
    }

    private static String statusLabel(Task.Status status) {
        return switch (status) {
            case TODO -> "To Do";
            case IN_PROGRESS -> "In Progress";
            case DONE -> "Done";
        };
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value;
    }

    interface TaskActions {
        void create(Task task);
        void update(Task task, Runnable change);
        void edit(Task task);
        void delete(Task task);
    }
}
