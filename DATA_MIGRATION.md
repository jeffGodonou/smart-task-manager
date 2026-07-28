# Data Migration: Embedded Subtasks → Parent-Child Relationships

## Overview

This document describes the data migration for M9 (Subtask Architecture Migration), which transitions the Task data model from embedded `@Embeddable` subtasks to self-referential parent-child JPA relationships.

## Migration Strategy

### Old Model (Pre-M9)
- **Entity**: `@Embeddable SubTask` inner class
- **Storage**: Join table `task_subtasks` with columns:
  - `task_id` (FK to parent task)
  - `child_tasks_id` (FK to subtask)
  - Other fields: `title`, `description`, `priority`, `due_date`, `is_completed`, `status`

### New Model (Post-M9)
- **Entity**: Self-referential `Task` entity
- **Storage**: Single `tasks` table with new column:
  - `parent_task_id` (nullable FK to parent task)
  - Child tasks are queried by filtering WHERE `parent_task_id = id`

### Migration Process

1. **Automatic Schema Update**: Hibernate's `hbm2ddl.auto=update` automatically:
   - Adds the `parent_task_id` column
   - Creates the foreign key constraint
   - Leaves the old `task_subtasks` table intact (if it exists)

2. **Data Migration**: `DataMigrationService.runMigrations()` is called at application startup and:
   - Detects if the legacy `task_subtasks` table exists
   - If found, migrates data to the new parent-child model using SQL INSERT
   - Is **idempotent** — safe to run multiple times
   - Logs all operations for audit trail

3. **Old Table Cleanup** (Optional):
   - After verification, manually drop the old `task_subtasks` table
   - Uncomment the DROP TABLE statement in `DataMigrationService` if desired
   - **Recommend**: Keep for 1-2 deployments as backup, then remove

## SQL Migration Statement

```sql
INSERT INTO tasks (title, description, priority, due_date, is_completed, status, owner_id, parent_task_id)
SELECT 
  st.title, 
  st.description, 
  st.priority, 
  st.due_date, 
  st.is_completed, 
  st.status, 
  t.user_id, 
  t.id
FROM task_subtasks st
JOIN tasks t ON st.task_id = t.id
WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE parent_task_id = t.id);
```

This statement:
- Reads from the old `task_subtasks` join table
- Joins with the parent `tasks` table to get owner
- Creates new Task records with `parent_task_id` pointing to the parent
- Prevents duplicate inserts (WHERE NOT EXISTS clause)

## Deployment Steps

### Development Environment
1. Run `mvn clean compile` — Hibernate auto-updates schema
2. Run `mvn test` — Migration runs at test startup via `DataMigrationService.runMigrations()`
3. Verify logs show "Data migrations completed successfully"

### Production Environment (Render)
1. **Backup database** before deploying
2. Deploy new code (BackendApplication now calls `DataMigrationService.runMigrations()`)
3. **Monitor startup logs** for migration messages:
   - Success: `"Data migrations completed successfully"`
   - No-op: `"No legacy task_subtasks table found - schema already migrated"`
   - Errors: Check logs and rollback if necessary
4. **Verify data integrity** (see section below)
5. After 1-2 deployments: Optional—drop the old `task_subtasks` table

## Data Integrity Verification

After migration, verify:

```sql
-- 1. Count migrated subtasks
SELECT COUNT(*) as total_subtasks FROM tasks WHERE parent_task_id IS NOT NULL;

-- 2. Count parent tasks
SELECT COUNT(*) as total_parents FROM tasks WHERE parent_task_id IS NULL;

-- 3. Verify no orphaned subtasks (parent doesn't exist)
SELECT COUNT(*) as orphaned 
FROM tasks t 
WHERE parent_task_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM tasks WHERE id = t.parent_task_id);

-- 4. Verify old join table still exists (if not dropped)
SELECT COUNT(*) FROM task_subtasks;

-- 5. Compare counts (should match after migration)
SELECT 
  (SELECT COUNT(*) FROM task_subtasks) as old_count,
  (SELECT COUNT(*) FROM tasks WHERE parent_task_id IS NOT NULL) as new_count;
```

## Rollback Plan

If issues arise:

1. **Before dropping old table**: Restore database from backup
2. **After dropping old table**: Rebuild from task_subtasks join table using reverse SQL:
   ```sql
   INSERT INTO task_subtasks (task_id, child_tasks_id, title, description, ...)
   SELECT parent_task_id, id, title, description, ...
   FROM tasks
   WHERE parent_task_id IS NOT NULL;
   ```

## Testing

- **Unit Tests**: `DataMigrationServiceTest` verifies idempotency and data integrity
- **Integration Tests**: `TaskControllerE2ETest` validates API works with new parent-child model
- **Smoke Tests**: Manual creation/update of tasks with subtasks post-deployment

## FAQ

**Q: What if the application crashes during migration?**  
A: The migration is wrapped in a transaction. If it fails, changes are rolled back and logged. Restart the application to retry.

**Q: Can I skip the migration?**  
A: If you're starting with a fresh database (no legacy data), the migration automatically detects this and skips. No manual action needed.

**Q: When should I drop the old task_subtasks table?**  
A: After 1-2 deployments with successful migration logs. Create a follow-up deployment to drop it safely.

**Q: Is the migration reversible?**  
A: Yes, but complex. Keep the old join table for at least 2 deployments as an escape hatch.

## Migration Service API

```java
// Called automatically at application startup
DataMigrationService.runMigrations();

// Or manually in tests/scripts
DataMigrationService.runMigrations();
```

The service is static and handles all setup internally via `PersistanceManager.getEntityManager()`.
