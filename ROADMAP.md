# Roadmap

Milestones:

- M0: Project setup and learning goals (complete)
- M1: Project structure refactor + README (current)
- M2: Unit tests + CI
- M3: JPA persistence + H2 dev profile
- M4: REST API + DTOs
- M5: React frontend scaffold
- M6: Kanban + calendar UI
- M7: Auth (OAuth2/JWT) + sync
- M8: Task details workflow (notes + subtasks)
- M9: Subtask architecture migration (embedded -> first-class child task)
- M10: E2E tests + performance tuning
- M11: Documentation and release

Subtask architecture decisions:

- Subtask is a first-class task (parent-child relation).
- No nested subtasks allowed.
- Maximum 4 subtasks per parent task.
- Parent completion is derived from children:
	- all subtasks completed -> parent completed
	- any subtask incomplete -> parent not completed
- If more than 4 subtasks are needed, split the work into additional parent tasks.

M8 acceptance criteria (task details workflow):

- User can open a task and add completion notes.
- User can create, check, and remove subtasks in task details.
- Notes and subtasks are persisted and visible after reload.

M9 acceptance criteria (architecture migration):

- Task model migrated to parent-child task relationship.
- Existing embedded subtasks migrated to child task rows.
- Backend enforces max 4 subtasks and no nesting.
- Parent task completion auto-recomputes from child tasks.
- Frontend blocks adding a 5th subtask and blocks subtask-of-subtask creation.

Learning checkpoints:
- After M2: comfortable with JUnit, Mockito, and CI pipelines
- After M3: able to design JPA entities and repositories
- After M5: basic full-stack CRUD flow implemented
- After M6: skillful with complex UI state (drag/drop, calendar)
- After M7: understand auth flows and token handling
- After M9: able to evolve domain models with safe migration strategies and business invariants

Suggested timeline: 1-2 weeks per milestone depending on depth.
