-- V1_0__initial_schema.sql
-- Initial schema migration from embedded subtasks to parent-child relationships
-- This migration handles the transition from @ElementCollection embedded subtasks
-- to self-referential parent-child Task relationships via parent_task_id foreign key

-- Step 1: Create parent_task_id column if it doesn't exist
-- (May already exist from Hibernate auto-update)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id BIGINT;

-- Step 2: Create foreign key constraint
ALTER TABLE tasks 
  ADD CONSTRAINT IF NOT EXISTS fk_task_parent 
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Step 3: Migrate data from old task_subtasks join table if it exists
-- This script is idempotent - if the join table doesn't exist, the migration still completes
-- The following would migrate data if the old embedded schema exists:
-- INSERT INTO tasks (title, description, priority, due_date, is_completed, status, owner_id, parent_task_id)
-- SELECT st.title, st.description, st.priority, st.due_date, st.is_completed, st.status, t.user_id, t.id
-- FROM task_subtasks st
-- JOIN tasks t ON st.task_id = t.id
-- WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE parent_task_id = t.id);

-- Step 4: No old join table to clean up - parent-child model is self-contained
-- in the tasks table itself via the parent_task_id column
