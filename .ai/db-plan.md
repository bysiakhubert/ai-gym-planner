# Database Schema - GymPlanner MVP

## Overview

This document defines the PostgreSQL database schema for GymPlanner MVP. The schema is designed to support workout plan management, training session tracking, and audit logging with AI-generated content.

## Core Design Principles

1. **Flexible Data Model**: Use `jsonb` columns for plan and session data to accommodate evolving workout structures without schema migrations
2. **Immutable Sessions**: Training sessions are snapshots that preserve historical data even when plans are modified
3. **Owner Isolation**: Row-Level Security (RLS) ensures users can only access their own data
4. **Audit Trail**: All significant actions and AI interactions are logged in `audit_events`
5. **Minimal Constraints**: MVP focuses on application-layer validation; database constraints are limited to essential data integrity

## Tables

### 1. plans

Stores workout plans with metadata and complete plan structure in JSON format.

```sql
CREATE TABLE plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    effective_from timestamptz NOT NULL,
    effective_to timestamptz NOT NULL,
    source text NOT NULL CHECK (source IN ('ai', 'manual')),
    prompt text NULL,
    preferences jsonb NOT NULL DEFAULT '{}',
    plan jsonb NOT NULL,
    has_sessions boolean NOT NULL DEFAULT false,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Column Descriptions:**
- `id`: Unique identifier for the plan
- `user_id`: Reference to the plan owner in Supabase Auth
- `name`: User-defined name for the plan
- `effective_from`: Start date/time of the plan cycle
- `effective_to`: End date/time of the plan cycle
- `source`: Indicates whether plan was AI-generated or manually created
- `prompt`: Original user prompt for AI-generated plans (null for manual plans)
- `preferences`: User preferences used for AI generation (system, goals, available days, etc.)
- `plan`: Complete plan structure including schedule, exercises, sets, reps, weights, rest periods
- `has_sessions`: Flag indicating whether any training sessions have been recorded for this plan
- `archived`: Soft delete flag (true = deleted/archived)
- `created_at`: Timestamp of plan creation
- `updated_at`: Timestamp of last modification

**Plan JSON Structure Example:**
```json
{
  "schedule": {
    "2025-01-15": {
      "name": "Push Day",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": [
            { "reps": 8, "weight": 80.0, "rest_seconds": 180 },
            { "reps": 8, "weight": 80.0, "rest_seconds": 180 },
            { "reps": 8, "weight": 80.0, "rest_seconds": 180 }
          ]
        }
      ]
    }
  }
}
```

**Numeric Value Semantics:**
- `reps`: numeric(5,2) - allows decimal reps for partial ROM or tempo work
- `weight`: numeric(6,2) - weight in kg with 2 decimal precision
- `rest_seconds`: integer - rest time in seconds

---

### 2. training_sessions

Records completed or in-progress training sessions with both planned and actual performance data.

```sql
CREATE TABLE training_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    session jsonb NOT NULL,
    started_at timestamptz NOT NULL,
    ended_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

**Column Descriptions:**
- `id`: Unique identifier for the session
- `user_id`: Reference to the session owner (denormalized for RLS performance)
- `plan_id`: Reference to the plan this session belongs to
- `session`: Complete session data including planned values and actual results
- `started_at`: Timestamp when the training session began
- `ended_at`: Timestamp when the session was completed (null = in progress)
- `created_at`: Timestamp when the record was created (for audit purposes)

**Session JSON Structure Example:**
```json
{
  "plan_name": "PPL Week 1",
  "day_name": "Push Day",
  "date": "2025-01-15",
  "exercises": [
    {
      "name": "Bench Press",
      "sets": [
        {
          "planned_reps": 8,
          "planned_weight": 80.0,
          "actual_reps": 8,
          "actual_weight": 80.0,
          "rest_seconds": 180,
          "completed": true
        }
      ]
    }
  ]
}
```

---

### 3. audit_events

Logs all significant user actions, AI interactions, and system events for analytics and debugging.

```sql
CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    entity_type text NULL,
    entity_id uuid NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
```

**Column Descriptions:**
- `id`: Unique identifier for the event
- `user_id`: Reference to the user who triggered the event
- `event_type`: Type of event (see Event Types below)
- `entity_type`: Type of entity affected (e.g., 'plan', 'session')
- `entity_id`: ID of the affected entity
- `payload`: Event-specific data including AI model info, generation parameters, errors, etc.
- `created_at`: Timestamp when the event occurred

**Event Types:**
- `ai_generation_requested`: User initiated AI plan generation
- `ai_generation_completed`: AI successfully generated a plan
- `ai_generation_failed`: AI generation failed
- `plan_created`: New plan was created (manual or AI-accepted)
- `plan_accepted`: User accepted an AI-generated plan
- `plan_rejected`: User rejected an AI-generated plan
- `plan_updated`: Existing plan was modified
- `plan_deleted`: Plan was archived
- `session_started`: Training session began
- `session_completed`: Training session finished

**Payload Example for AI Events:**
```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "prompt_tokens": 450,
  "completion_tokens": 1200,
  "generation_time_ms": 3500,
  "preferences": {
    "goal": "hypertrofia",
    "system": "PPL",
    "days": ["monday", "wednesday", "friday"],
    "duration_weeks": 6
  }
}
```

---

## Relationships

### Entity-Relationship Diagram

```
auth.users (Supabase Auth)
    │
    ├──< plans (1:N)
    │     │
    │     └──< training_sessions (1:N)
    │
    └──< training_sessions (1:N, denormalized)
    │
    └──< audit_events (1:N)
```

### Relationship Details

1. **auth.users → plans** (One-to-Many)
   - One user can have multiple plans
   - Cascade delete: When user is deleted, all their plans are deleted
   - FK: `plans.user_id → auth.users.id`

2. **plans → training_sessions** (One-to-Many)
   - One plan can have multiple training sessions
   - Cascade delete: When plan is deleted, all its sessions are deleted
   - FK: `training_sessions.plan_id → plans.id`

3. **auth.users → training_sessions** (One-to-Many, denormalized)
   - Denormalized for RLS performance
   - Cascade delete: When user is deleted, all their sessions are deleted
   - FK: `training_sessions.user_id → auth.users.id`

4. **auth.users → audit_events** (One-to-Many)
   - One user can have multiple audit events
   - Cascade delete: When user is deleted, all their events are deleted
   - FK: `audit_events.user_id → auth.users.id`

---

## Indexes

**Note**: In MVP, indexes are intentionally omitted to simplify initial development. Indexes should be added in future iterations based on actual query patterns and performance profiling.

**Recommended indexes for post-MVP:**
```sql
-- For plans
CREATE INDEX idx_plans_user_id ON plans(user_id) WHERE NOT archived;
CREATE INDEX idx_plans_effective_dates ON plans(user_id, effective_from, effective_to) WHERE NOT archived;

-- For training_sessions
CREATE INDEX idx_sessions_user_plan ON training_sessions(user_id, plan_id);
CREATE INDEX idx_sessions_started_at ON training_sessions(user_id, started_at DESC);

-- For audit_events
CREATE INDEX idx_audit_user_created ON audit_events(user_id, created_at DESC);
CREATE INDEX idx_audit_event_type ON audit_events(event_type, created_at DESC);
```

---

## Row-Level Security (RLS) Policies

All tables use "owner-only" policies to ensure users can only access their own data.

### plans

```sql
-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own plans
CREATE POLICY "Users can view own plans"
    ON plans FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Users can insert their own plans
CREATE POLICY "Users can insert own plans"
    ON plans FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own plans
CREATE POLICY "Users can update own plans"
    ON plans FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own plans (archiving)
CREATE POLICY "Users can delete own plans"
    ON plans FOR DELETE
    USING (user_id = auth.uid());
```

### training_sessions

```sql
-- Enable RLS
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
    ON training_sessions FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
    ON training_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
    ON training_sessions FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
    ON training_sessions FOR DELETE
    USING (user_id = auth.uid());
```

**Note on Session Immutability**: While UPDATE and DELETE policies are defined for completeness, the application layer should treat sessions as immutable once `ended_at` is set. Consider restricting these operations in post-MVP:

```sql
-- Alternative: Read-only sessions after completion
CREATE POLICY "Users can update in-progress sessions only"
    ON training_sessions FOR UPDATE
    USING (user_id = auth.uid() AND ended_at IS NULL)
    WITH CHECK (user_id = auth.uid());
```

### audit_events

```sql
-- Enable RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own events
CREATE POLICY "Users can view own events"
    ON audit_events FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert own events"
    ON audit_events FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Note: No UPDATE or DELETE policies - audit log should be append-only
```

---

## Database Functions and Triggers

### Auto-update updated_at timestamp

```sql
-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for plans table
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Design Notes and Considerations

### 1. Active Plan Management

**Decision**: Only one active (non-archived) plan should be effective at any given time, with no overlapping `effective_from`/`effective_to` periods.

**Implementation**: Enforced in application layer, not database. This provides flexibility for edge cases (e.g., transitioning between plans, adjusting dates retrospectively).

**Validation Logic** (pseudo-code for application):
```typescript
// Before creating/updating a plan
const hasOverlap = await checkPlanOverlap(
  userId,
  effectiveFrom,
  effectiveTo,
  excludePlanId
);
if (hasOverlap) {
  throw new Error('Plan dates overlap with existing plan');
}
```

### 2. Date Handling and Timezones

**Challenge**: Plan JSON uses local dates (`YYYY-MM-DD`), while database uses `timestamptz`.

**Approach**:
- Store all timestamps in UTC (`timestamptz`)
- Application layer converts user's local date to UTC timestamp
- When matching sessions to plan days, compare dates in user's timezone
- `effective_from` represents start of day (00:00:00) in user's local timezone
- `effective_to` represents end of day (23:59:59) in user's local timezone

**Example**:
```typescript
// User in Europe/Warsaw (UTC+1) creates plan for 2025-01-15
const effectiveFrom = zonedTimeToUtc(
  '2025-01-15 00:00:00',
  'Europe/Warsaw'
); // Stored as 2025-01-14 23:00:00 UTC

// When finding today's workout
const userDate = format(new Date(), 'yyyy-MM-DD', { timeZone: userTimezone });
const workout = plan.schedule[userDate];
```

### 3. Plan Modifications and Session Integrity

**Behavior**: Users can modify plans at any time. Existing sessions remain unchanged (snapshot model).

**Implications**:
- Sessions store complete planned data at the time of training
- Historical sessions show what was actually planned, not current plan state
- Comparison between sessions shows actual progression over time
- Users can update future workouts in a plan without affecting past sessions

### 4. Soft Deletes (Archiving)

**Rationale**: Preserve historical data for analytics and user history.

**Implementation**:
- Plans: Set `archived = true` instead of DELETE
- Sessions: Keep associated with archived plans (cascade prevented by archiving)
- Audit events: Never deleted (append-only log)

**Query Patterns**:
```sql
-- Active plans only
SELECT * FROM plans WHERE user_id = $1 AND NOT archived;

-- Include archived (for history view)
SELECT * FROM plans WHERE user_id = $1 ORDER BY effective_from DESC;
```

### 5. has_sessions Flag

**Purpose**: Quick indicator that a plan has been started/used.

**Use Cases**:
- UI can show "In Progress" badge
- Prevent certain modifications once training has begun
- Analytics: distinguish between created-but-unused plans

**Update Strategy**:
- Set to `true` when first session is created for the plan
- Never set back to `false` (even if sessions are deleted)
- Updated via application logic or database trigger:

```sql
-- Optional trigger to auto-update has_sessions
CREATE OR REPLACE FUNCTION update_plan_has_sessions()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE plans
    SET has_sessions = true
    WHERE id = NEW.plan_id AND NOT has_sessions;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_sessions_flag
    AFTER INSERT ON training_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_plan_has_sessions();
```

### 6. JSON Schema Validation

**MVP Approach**: No database-level JSON schema validation.

**Post-MVP Consideration**: Add CHECK constraints with `jsonb_matches_schema()`:
```sql
-- Example (PostgreSQL 16+)
ALTER TABLE plans
ADD CONSTRAINT valid_plan_structure
CHECK (jsonb_matches_schema(
  '{ "type": "object", "required": ["schedule"], ... }',
  plan
));
```

### 7. Normalization vs. Denormalization

**Choice**: Hybrid approach
- **Normalized**: Core entities (users, plans, sessions) in separate tables
- **Denormalized**: 
  - `user_id` in `training_sessions` (avoids JOIN for RLS)
  - Complete plan/session data in JSON (avoids complex JOINs for display)

**Trade-offs**:
- ✅ Faster reads (no joins needed for workout display)
- ✅ Schema flexibility (JSON can evolve without migrations)
- ✅ Simplified RLS policies
- ⚠️ Slightly higher storage (user_id duplication)
- ⚠️ JSON query patterns may be slower than columnar (acceptable for MVP scale)

### 8. Scalability Considerations

**Current Scale**: MVP expects <1000 users, <10 plans per user, <100 sessions per user per year.

**Future Optimizations** (when needed):
1. Add indexes (see Indexes section)
2. Partition `training_sessions` by user_id or created_at
3. Partition `audit_events` by created_at (monthly partitions)
4. Consider materialized views for dashboard statistics
5. Move old audit events to cold storage (archive after 1 year)

### 9. Backup and Recovery

**Recommendations**:
- Enable Supabase automatic backups (default: daily)
- Point-in-time recovery (PITR) for last 7 days minimum
- Export critical data (plans, sessions) periodically for disaster recovery
- Consider pg_dump for pre-deployment backups during migrations

---

## Migration Strategy

### Initial Schema Setup

1. Create tables in order: `plans`, `training_sessions`, `audit_events`
2. Enable RLS on all tables
3. Create RLS policies
4. Create functions and triggers
5. Verify policies with test users

### Future Migrations

- Use Supabase migrations or a tool like `dbmate`
- Always test migrations on staging environment
- JSON structure changes should be additive (backward compatible)
- Document breaking changes and provide data migration scripts

---

## Example Queries

### Get Active Plans for User
```sql
SELECT *
FROM plans
WHERE user_id = auth.uid()
  AND NOT archived
  AND effective_from <= now()
  AND effective_to >= now();
```

### Get Today's Workout
```sql
-- Application determines today's date in user's timezone (e.g., '2025-01-15')
-- Then extracts from plan JSON:
SELECT
  id,
  name,
  plan -> 'schedule' -> '2025-01-15' as todays_workout
FROM plans
WHERE user_id = auth.uid()
  AND NOT archived
  AND effective_from <= now()
  AND effective_to >= now();
```

### Get Recent Sessions for Plan
```sql
SELECT *
FROM training_sessions
WHERE user_id = auth.uid()
  AND plan_id = $1
ORDER BY started_at DESC
LIMIT 10;
```

### Get AI Generation Success Rate
```sql
SELECT
  COUNT(*) FILTER (WHERE event_type = 'ai_generation_requested') as requested,
  COUNT(*) FILTER (WHERE event_type = 'plan_accepted') as accepted,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'plan_accepted') /
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'ai_generation_requested'), 0),
    2
  ) as acceptance_rate
FROM audit_events
WHERE user_id = auth.uid()
  AND event_type IN ('ai_generation_requested', 'plan_accepted');
```

---

## Compliance and Security

### Data Privacy
- User data is isolated via RLS
- No shared data between users
- Supabase Auth handles authentication securely
- Consider GDPR compliance: allow full data export and deletion

### API Security
- Use Supabase Client with user JWT for all operations
- Never expose service role key to frontend
- API endpoints should verify auth.uid() matches requested user_id
- Rate limit AI generation endpoints to prevent abuse

---

## Appendix: TypeScript Types

For consistency between database and application, here are recommended TypeScript types:

```typescript
// Database row types
type Plan = {
  id: string;
  user_id: string;
  name: string;
  effective_from: string; // ISO timestamp
  effective_to: string;
  source: 'ai' | 'manual';
  prompt: string | null;
  preferences: Record<string, any>;
  plan: PlanStructure;
  has_sessions: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

type PlanStructure = {
  schedule: Record<string, WorkoutDay>; // key: YYYY-MM-DD
};

type WorkoutDay = {
  name: string;
  exercises: Exercise[];
};

type Exercise = {
  name: string;
  sets: SetPlan[];
};

type SetPlan = {
  reps: number;
  weight?: number;
  rest_seconds: number;
};

type TrainingSession = {
  id: string;
  user_id: string;
  plan_id: string;
  session: SessionStructure;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

type SessionStructure = {
  plan_name: string;
  day_name: string;
  date: string; // YYYY-MM-DD
  exercises: SessionExercise[];
};

type SessionExercise = {
  name: string;
  sets: SessionSet[];
};

type SessionSet = {
  planned_reps: number;
  planned_weight?: number;
  actual_reps?: number;
  actual_weight?: number;
  rest_seconds: number;
  completed: boolean;
};

type AuditEvent = {
  id: string;
  user_id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, any>;
  created_at: string;
};
```

---

**Schema Version**: 1.0.0  
**Last Updated**: 2025-11-03  
**Status**: Ready for Implementation
