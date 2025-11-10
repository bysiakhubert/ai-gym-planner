-- ============================================================================
-- Supabase Seed Script
-- ============================================================================
-- Description:
--   Populates the database with initial data required for development.
--   This script is executed automatically by `supabase db reset`.
--
-- Environment:
--   - Local development ONLY
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: Default Development User
-- ----------------------------------------------------------------------------
-- Creates a dummy user in `auth.users` to satisfy foreign key constraints
-- during local development when no real authentication is in place.
-- The UUID is hardcoded to match `DEFAULT_USER_ID` in the application code.
-- ----------------------------------------------------------------------------

insert into
  auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_token,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    email_change_sent_at
  )
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dev.user@example.com',
    '$2a$10$t5Bf9v7.anzF2p32sHu.s.60n/s3x.4w.xGSZ2S9.r2T.L.9Qv2j.', -- "password"
    '2024-01-01 00:00:00.000000+00',
    '',
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{}',
    '2024-01-01 00:00:00.000000+00',
    '2024-01-01 00:00:00.000000+00',
    '',
    '',
    '',
    '',
    null
  );
