# Smart Task Manager
 
A task management REST API built with Java and Spring Boot, following a clean layered architecture with JPA persistence, TDD practices, and an automated CI/CD pipeline via GitHub Actions.
 
---
 
## Tech Stack
 
- **Language:** Java 25.0
- **Framework:** Spring Boot
- **Build tool:** Maven
- **Persistence:** JPA / Hibernate · H2 (in-memory for dev)
- **Testing:** JUnit 5 / Mockito · TDD
- **CI/CD:** GitHub Actions
---
 
## Architecture
 
The project follows a standard layered architecture:
 
```text
src/
└── main/java/com/jeff/taskmanager

    ├── util/        # Domain utilities

    ├── api/         # REST controllers — handles HTTP requests and responses
    ├── service/     # Business logic layer
    ├── repository/  # Data access layer (JPA repositories)
    └── model/       # Domain entities
```
 
---
 
## Getting Started
 
### Prerequisites
 
- Java 25+
- Maven (or use the included `mvnw` wrapper)
### Run locally
 
```bash
# Clone the repo
git clone https://github.com/jeffGodonou/smart-task-manager.git
cd smart-task-manager
 
# Build and run
./mvnw clean package
java -jar target/smart-task-manager-1.0-SNAPSHOT.jar
```
 
The API will be available at `http://localhost:8080`
 
### Run tests
 
```bash
./mvnw test
```

## Persistence and Supabase

For local development, the app can still use an H2 file database. For a durable deployed setup, use a shared PostgreSQL database such as Supabase.

### Recommended production variables

- `DATABASE_URL`: `jdbc:postgresql://<host>:5432/postgres?sslmode=require`
- `DB_USERNAME`: your Supabase database user
- `DB_PASSWORD`: your Supabase database password
- `JWT_SECRET`: a stable long secret for signing tokens

The app now checks these environment variables first and automatically switches Hibernate to the PostgreSQL dialect and driver when `DATABASE_URL` is present.

### Safety notes for Supabase

- Never commit the real database password or JWT secret to Git.
- Use Supabase project secrets or Render environment variables instead of hardcoding them.
- Keep SSL enabled (`sslmode=require`) for hosted services.
- Restrict database access to the app and rotate credentials periodically.
- Use Supabase Row Level Security (RLS) if you later expose the database directly to the frontend.
- Keep the JWT secret stable across deploys so existing sessions do not become invalid unexpectedly.

Without a durable database and a stable secret, user data and login tokens can disappear or break after restarts or redeploys.
 
---
 
## API Endpoints
 
| Method | Endpoint      | Description       |
|--------|---------------|-------------------|
| GET    | `/tasks`      | Get all tasks     |
| GET    | `/tasks/{id}` | Get a task by ID  |
| POST   | `/tasks`      | Create a new task |
| PUT    | `/tasks/{id}` | Update a task     |
| DELETE | `/tasks/{id}` | Delete a task     |
 
---
 
## Roadmap
 
See [ROADMAP.md](./ROADMAP.md) for planned features and milestones, including:
 
- React frontend with Kanban and calendar views
- OAuth2 / JWT authentication
- Integration and E2E tests
---
 
## Author
 
**Jeff Godonou** — [github.com/jeffGodonou](https://github.com/jeffGodonou)
 
