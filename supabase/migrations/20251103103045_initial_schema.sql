-- ============================================================================
-- Migration: Initial Database Schema for GymPlanner MVP
-- ============================================================================
-- Description: Creates core tables for workout plan management, training
--              session tracking, and audit logging with AI-generated content.
--              Implements Row-Level Security (RLS) for user data isolation.
--
-- Tables Created:
--   - plans: Stores workout plans with metadata and complete plan structure
--   - training_sessions: Records completed/in-progress training sessions
--   - audit_events: Logs all significant user actions and AI interactions
--
-- Security:
--   - RLS enabled on all tables
--   - Owner-only access policies (users can only access their own data)
--   - Policies scoped to authenticated users only
--
-- Functions & Triggers:
--   - update_updated_at_column(): Auto-updates updated_at timestamp
--   - update_plans_updated_at: Trigger for plans table
--
-- Author: AI-Generated
-- Date: 2025-11-03
-- Schema Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- SECTION 1: Functions and Triggers
-- ============================================================================

-- Function to automatically update the updated_at column on row updates
-- This ensures timestamp accuracy without manual application logic
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

comment on function update_updated_at_column() is 
'Trigger function that automatically sets updated_at to current timestamp on row update';

-- ============================================================================
-- SECTION 2: Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: plans
-- ----------------------------------------------------------------------------
-- Stores workout plans with metadata and complete plan structure in JSON format.
-- Supports both AI-generated and manually created plans.
-- Uses jsonb for flexible plan structure that can evolve without schema migrations.
-- ----------------------------------------------------------------------------

create table plans (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- Owner reference - cascade delete ensures cleanup when user is deleted
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- Plan metadata
    name varchar(255) not null,
    effective_from timestamptz not null,
    effective_to timestamptz not null,
    
    -- Source tracking - distinguishes AI vs manual creation
    source varchar(15) not null check (source in ('ai', 'manual')),
    
    -- AI generation data - prompt is null for manual plans
    prompt text null,
    
    -- User preferences used for AI generation (goals, system, available days, etc.)
    preferences jsonb not null default '{}',
    
    -- Complete plan structure including schedule, exercises, sets, reps, weights
    -- Structure: { "schedule": { "YYYY-MM-DD": { "name": "...", "exercises": [...] } } }
    plan jsonb not null,
    
    -- Soft delete flag - preserves historical data for analytics
    archived boolean not null default false,
    
    -- Audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table plans is 
'Stores workout plans with metadata and complete plan structure in JSON format';

comment on column plans.user_id is 
'Reference to plan owner in Supabase Auth';

comment on column plans.effective_from is 
'Start date/time of the plan cycle (00:00:00 in user timezone)';

comment on column plans.effective_to is 
'End date/time of the plan cycle (23:59:59 in user timezone)';

comment on column plans.source is 
'Indicates whether plan was AI-generated or manually created';

comment on column plans.prompt is 
'Original user prompt for AI-generated plans (null for manual plans)';

comment on column plans.preferences is 
'User preferences used for AI generation (system, goals, available days, duration, etc.)';

comment on column plans.plan is 
'Complete plan structure including schedule, exercises, sets, reps, weights, rest periods';

comment on column plans.archived is 
'Soft delete flag - true means plan is deleted/archived but preserved for history';

-- Trigger to auto-update updated_at on row modifications
create trigger update_plans_updated_at
    before update on plans
    for each row
    execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Table: training_sessions
-- ----------------------------------------------------------------------------
-- Records completed or in-progress training sessions.
-- Sessions are immutable snapshots that preserve historical data even when
-- plans are modified. Stores both planned and actual performance data.
-- user_id is denormalized for RLS performance (avoids JOIN with plans).
-- ----------------------------------------------------------------------------

create table training_sessions (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- Owner reference - denormalized for RLS performance
    -- Cascade delete ensures cleanup when user is deleted
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- Plan reference - nullable to preserve sessions even if plan is deleted
    -- Note: In MVP, plans are soft-deleted (archived), so this should rarely be null
    plan_id uuid,
    
    -- Complete session data including planned values and actual results
    -- Structure: { "plan_name": "...", "day_name": "...", "date": "YYYY-MM-DD", "exercises": [...] }
    session jsonb not null,
    
    -- Session timing
    started_at timestamptz not null,
    ended_at timestamptz null,  -- null = session in progress
    
    -- Audit timestamp
    created_at timestamptz not null default now()
);

comment on table training_sessions is 
'Records completed or in-progress training sessions with planned and actual performance data';

comment on column training_sessions.user_id is 
'Reference to session owner (denormalized for RLS performance)';

comment on column training_sessions.plan_id is 
'Reference to the plan this session belongs to (nullable to preserve history)';

comment on column training_sessions.session is 
'Complete session data including planned values and actual results';

comment on column training_sessions.started_at is 
'Timestamp when the training session began';

comment on column training_sessions.ended_at is 
'Timestamp when the session was completed (null = in progress)';

-- ----------------------------------------------------------------------------
-- Table: audit_events
-- ----------------------------------------------------------------------------
-- Append-only audit log for all significant user actions, AI interactions,
-- and system events. Used for analytics, debugging, and compliance.
-- No UPDATE or DELETE operations allowed - this is an immutable log.
-- ----------------------------------------------------------------------------

create table audit_events (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- User who triggered the event - cascade delete for GDPR compliance
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- Event classification
    event_type text not null,
    
    -- Optional entity references
    entity_type text null,
    entity_id uuid null,
    
    -- Event-specific data (AI model info, generation parameters, errors, etc.)
    payload jsonb not null default '{}',
    
    -- Event timestamp
    created_at timestamptz not null default now()
);

comment on table audit_events is 
'Append-only audit log for user actions, AI interactions, and system events';

comment on column audit_events.user_id is 
'Reference to the user who triggered the event';

comment on column audit_events.event_type is 
'Type of event (e.g., ai_generation_requested, plan_created, session_completed)';

comment on column audit_events.entity_type is 
'Type of entity affected (e.g., plan, session)';

comment on column audit_events.entity_id is 
'ID of the affected entity';

comment on column audit_events.payload is 
'Event-specific data including AI model info, generation parameters, errors, etc.';

-- ============================================================================
-- SECTION 3: Row-Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables to enforce data isolation
alter table plans enable row level security;
alter table training_sessions enable row level security;
alter table audit_events enable row level security;

-- ============================================================================
-- SECTION 4: RLS Policies - plans table
-- ============================================================================

-- Policy: Authenticated users can view their own plans
-- Rationale: Users must be logged in and can only see plans they own
create policy "authenticated users can view own plans"
    on plans
    for select
    to authenticated
    using (user_id = auth.uid());

comment on policy "authenticated users can view own plans" on plans is
'Allows authenticated users to view only their own plans';

-- Policy: Authenticated users can insert their own plans
-- Rationale: Users can create new plans, but only associated with their own user_id
create policy "authenticated users can insert own plans"
    on plans
    for insert
    to authenticated
    with check (user_id = auth.uid());

comment on policy "authenticated users can insert own plans" on plans is
'Allows authenticated users to create plans only for themselves';

-- Policy: Authenticated users can update their own plans
-- Rationale: Users can modify their plans, but only their own
create policy "authenticated users can update own plans"
    on plans
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

comment on policy "authenticated users can update own plans" on plans is
'Allows authenticated users to update only their own plans';

-- Policy: Authenticated users can delete their own plans
-- Rationale: Users can archive (soft delete) their plans
-- Note: Application layer should set archived=true rather than hard DELETE
create policy "authenticated users can delete own plans"
    on plans
    for delete
    to authenticated
    using (user_id = auth.uid());

comment on policy "authenticated users can delete own plans" on plans is
'Allows authenticated users to delete/archive only their own plans';

-- ============================================================================
-- SECTION 5: RLS Policies - training_sessions table
-- ============================================================================

-- Policy: Authenticated users can view their own sessions
-- Rationale: Users must be logged in and can only see sessions they own
create policy "authenticated users can view own sessions"
    on training_sessions
    for select
    to authenticated
    using (user_id = auth.uid());

comment on policy "authenticated users can view own sessions" on training_sessions is
'Allows authenticated users to view only their own training sessions';

-- Policy: Authenticated users can insert their own sessions
-- Rationale: Users can create new training sessions, but only for themselves
create policy "authenticated users can insert own sessions"
    on training_sessions
    for insert
    to authenticated
    with check (user_id = auth.uid());

comment on policy "authenticated users can insert own sessions" on training_sessions is
'Allows authenticated users to create training sessions only for themselves';

-- Policy: Authenticated users can update their own sessions
-- Rationale: Users can modify in-progress sessions (updating actual reps/weights)
-- Note: Application should treat sessions as immutable once ended_at is set
create policy "authenticated users can update own sessions"
    on training_sessions
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

comment on policy "authenticated users can update own sessions" on training_sessions is
'Allows authenticated users to update only their own sessions (typically in-progress sessions)';

-- Policy: Authenticated users can delete their own sessions
-- Rationale: Users can delete sessions if needed (e.g., accidental creation)
-- Note: Application should rarely delete sessions - they are historical records
create policy "authenticated users can delete own sessions"
    on training_sessions
    for delete
    to authenticated
    using (user_id = auth.uid());

comment on policy "authenticated users can delete own sessions" on training_sessions is
'Allows authenticated users to delete only their own sessions';

-- ============================================================================
-- SECTION 6: RLS Policies - audit_events table
-- ============================================================================

-- Policy: Authenticated users can view their own events
-- Rationale: Users can view their own activity history and AI interactions
create policy "authenticated users can view own events"
    on audit_events
    for select
    to authenticated
    using (user_id = auth.uid());

comment on policy "authenticated users can view own events" on audit_events is
'Allows authenticated users to view only their own audit events';

-- Policy: Authenticated users can insert their own events
-- Rationale: Application can log events on behalf of authenticated users
create policy "authenticated users can insert own events"
    on audit_events
    for insert
    to authenticated
    with check (user_id = auth.uid());

comment on policy "authenticated users can insert own events" on audit_events is
'Allows authenticated users (via application) to create audit events for themselves';

-- Note: No UPDATE or DELETE policies for audit_events
-- Rationale: Audit log must be immutable (append-only) for data integrity and compliance

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
--   ✓ Created 3 tables: plans, training_sessions, audit_events
--   ✓ Created function: update_updated_at_column()
--   ✓ Created trigger: update_plans_updated_at
--   ✓ Enabled RLS on all tables
--   ✓ Created 11 RLS policies (4 for plans, 4 for sessions, 2 for events)
--   ✓ Added comprehensive comments for documentation
--
-- Next Steps:
--   1. Verify migration with: supabase db reset
--   2. Test RLS policies with test users
--   3. Implement application-layer validation for plan date overlaps
--   4. Set up automatic backups and PITR
-- ============================================================================

