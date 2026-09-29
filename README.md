# Smart Task Manager

Smart Task Manager is a full-stack productivity app for organizing projects and tasks. It combines a Java + Spring Boot backend with a React + Vite frontend, supporting task management, project tracking, list filtering, and paginated views.

---

## Tech Stack

- Java 25
- Spring Boot
- Maven / Maven Wrapper
- JPA / Hibernate
- H2 for local development
- PostgreSQL-ready configuration for production
- React 19
- Vite
- TypeScript
- Vitest for frontend tests

---

## Features

- Project management with coding and non-coding project types
- Task CRUD workflows
- Task list filtering: All, Active, Completed
- Pagination in the task list view with 10 tasks per page
- Task detail modal editor
- Project progress tracking
- Docker-ready deployment setup

---

## Project Structure

```text
smart-task-manager/
├── src/                     # Spring Boot backend
├── frontend/frontend/       # React frontend app
├── Dockerfile               # Container build config
├── pom.xml                  # Maven backend config
├── mvnw / mvnw.cmd          # Maven wrapper
├── README.md                # Project overview
├── ROADMAP.md               # Planned work
├── render.yaml              # Deployment config
├── data/                    # Local app data
└── target/                  # Build artifacts
```

---

## Getting Started

### Prerequisites

- Java 25+
- Node.js 18+
- npm
- Maven or the included Maven wrapper

### Run the backend

```bash
git clone https://github.com/jeffGodonou/smart-task-manager.git
cd smart-task-manager
./mvnw clean spring-boot:run
```

The API runs on:

```text
http://localhost:8080
```

### Run the frontend

```bash
cd frontend/frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

---

## Testing

### Backend tests

```bash
./mvnw test
```

### Frontend tests

```bash
cd frontend/frontend
npm test
```

---

## Database Configuration

For local development, the app can use an H2 file database. For a durable setup, it supports PostgreSQL via environment variables such as:

- `DATABASE_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`

When `DATABASE_URL` is present, Hibernate is switched to the PostgreSQL dialect automatically.

### Safety notes

- Do not commit real secrets to Git.
- Prefer Render, Supabase, or hosting environment variables for production values.
- Keep SSL enabled for remote databases.
- Rotate credentials periodically.

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | Get all tasks |
| GET | `/tasks/{id}` | Get a task by ID |
| POST | `/tasks` | Create a task |
| PUT | `/tasks/{id}` | Update a task |
| DELETE | `/tasks/{id}` | Delete a task |

---

## Notes

The list view now paginates at 10 tasks per page, making large task collections easier to navigate without overwhelming the UI.

---

## Author

**Jeff Godonou** — [github.com/jeffGodonou](https://github.com/jeffGodonou)

