package com.jeff.taskmanager;

import com.jeff.taskmanager.model.Project;
import com.jeff.taskmanager.repository.ProjectRepository;
import com.jeff.taskmanager.repository.UserRepository;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.scene.control.Button;
import javafx.scene.control.ChoiceBox;
import javafx.scene.control.Label;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.util.List;

final class ProjectManagementView extends VBox {
    private final String username;
    private final ProjectRepository projectsRepository;
    private final UserRepository usersRepository;
    private final Runnable onSaved;

    private final TextField name = new TextField();
    private final TextArea description = new TextArea();
    private final ChoiceBox<Project.ProjectType> type = new ChoiceBox<>(
            FXCollections.observableArrayList(Project.ProjectType.values()));
    private final TextField category = new TextField();
    private final TextField endDate = new TextField();
    private final TextField repositoryUrl = new TextField();
    private final TextField localPath = new TextField();
    private final TextField branch = new TextField("main");
    private final Label feedback = new Label();
    private final Button save = new Button("Add project");
    private final TableView<Project> projectTable;
    private Project editingProject;

    ProjectManagementView(List<Project> projects, String username, ProjectRepository projectsRepository,
                          UserRepository usersRepository, Runnable onSaved) {
        this.username = username;
        this.projectsRepository = projectsRepository;
        this.usersRepository = usersRepository;
        this.onSaved = onSaved;

        name.setPromptText("Project name");
        description.setPromptText("Description");
        description.setPrefRowCount(2);
        type.setValue(Project.ProjectType.NON_CODING);
        category.setPromptText("Category");
        endDate.setPromptText("End date (YYYY-MM-DD)");
        repositoryUrl.setPromptText("Repository URL");
        localPath.setPromptText("Local path");
        branch.setPromptText("Branch");
        save.getStyleClass().add("btn-primary");

        projectTable = createProjectTable(projects);
        // Selecting a project loads it into the form for in-place editing.
        projectTable.getSelectionModel().selectedItemProperty().addListener(
                (observable, previous, selected) -> selectProject(selected));

        Button newProject = new Button("New project");
        newProject.setOnAction(event -> clearForm());
        save.setOnAction(event -> saveProject());

        HBox detailsRow = new HBox(10, name, type, category, endDate);
        HBox repositoryRow = new HBox(10, repositoryUrl, localPath, branch, save, newProject);
        HBox.setHgrow(name, Priority.ALWAYS);
        HBox.setHgrow(repositoryUrl, Priority.ALWAYS);

        getChildren().addAll(new Label("Projects"), detailsRow, description, repositoryRow, feedback, projectTable);
        setSpacing(12);
        setPadding(new Insets(20));
        VBox.setVgrow(projectTable, Priority.ALWAYS);
    }

    private TableView<Project> createProjectTable(List<Project> projects) {
        TableView<Project> table = new TableView<>(FXCollections.observableArrayList(projects));
        table.setPlaceholder(new Label("No projects yet."));
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);

        TableColumn<Project, String> nameColumn = new TableColumn<>("Project");
        nameColumn.setCellValueFactory(new PropertyValueFactory<>("name"));
        TableColumn<Project, String> typeColumn = new TableColumn<>("Type");
        typeColumn.setCellValueFactory(cell ->
                new javafx.beans.property.SimpleStringProperty(cell.getValue().getProjectType().toString()));
        TableColumn<Project, String> descriptionColumn = new TableColumn<>("Description");
        descriptionColumn.setCellValueFactory(new PropertyValueFactory<>("description"));
        TableColumn<Project, String> endDateColumn = new TableColumn<>("End date");
        endDateColumn.setCellValueFactory(new PropertyValueFactory<>("endDate"));
        table.getColumns().add(nameColumn);
        table.getColumns().add(typeColumn);
        table.getColumns().add(descriptionColumn);
        table.getColumns().add(endDateColumn);
        return table;
    }

    private void selectProject(Project project) {
        if (project == null) {
            return;
        }
        editingProject = project;
        name.setText(orEmpty(project.getName()));
        description.setText(orEmpty(project.getDescription()));
        type.setValue(project.getProjectType());
        category.setText(orEmpty(project.getProjectCategory()));
        endDate.setText(orEmpty(project.getEndDate()));
        repositoryUrl.setText(orEmpty(project.getRepositoryUrl()));
        localPath.setText(orEmpty(project.getLocalPath()));
        branch.setText(orEmpty(project.getBranch()));
        save.setText("Update project");
        feedback.setText("");
    }

    private void clearForm() {
        editingProject = null;
        projectTable.getSelectionModel().clearSelection();
        name.clear();
        description.clear();
        type.setValue(Project.ProjectType.NON_CODING);
        category.clear();
        endDate.clear();
        repositoryUrl.clear();
        localPath.clear();
        branch.setText("main");
        save.setText("Add project");
        feedback.setText("");
    }

    private void saveProject() {
        String projectName = name.getText().trim();
        if (projectName.isEmpty()) {
            feedback.setText("Project name is required.");
            return;
        }
        // Coding projects need a source location; non-coding projects do not.
        if (type.getValue() == Project.ProjectType.CODING
                && repositoryUrl.getText().isBlank() && localPath.getText().isBlank()) {
            feedback.setText("Coding projects need a repository URL or local path.");
            return;
        }

        try {
            Project project = editingProject == null ? new Project() : editingProject;
            project.setName(projectName);
            project.setDescription(description.getText());
            project.setProjectType(type.getValue());
            project.setProjectCategory(category.getText());
            project.setEndDate(endDate.getText());
            project.setRepositoryUrl(repositoryUrl.getText());
            project.setLocalPath(localPath.getText());
            project.setBranch(branch.getText());
            // Associate the project with its owner so subsequent lists and task assignments stay scoped.
            project.setOwner(usersRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalStateException("User account no longer exists.")));
            projectsRepository.save(project);
            onSaved.run();
        } catch (RuntimeException exception) {
            feedback.setText("Unable to save project: " + exception.getMessage());
        }
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value;
    }
}
