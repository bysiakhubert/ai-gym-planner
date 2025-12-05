# API Endpoint Implementation Plan: Sessions Resource

## 1. Endpoint Overview

This plan details the implementation of the Sessions resource, which manages the execution of training workouts. It covers starting a new session, updating it during execution, completing it, and retrieving history.

**Key Features:**
-   **Snapshot Logic**: Sessions store a copy of the plan at the time of execution, allowing plans to change without affecting history.
-   **State Management**: Enforces strict states (In Progress vs. Completed) with specific validation rules.
-   **Audit Logging**: Integrates with `AuditLogService` to track user activity.
-   **Concurrency**: Prevents multiple simultaneous active sessions for a single user.

## 2. Request Details

### 2.1. Create Session (Start)
-   **Method**: `POST`
-   **URL**: `/api/sessions`
-   **Body**: `CreateSessionRequest` (JSON)
    -   `plan_id`: string (UUID)
    -   `date`: string (ISO Date)
    -   `session`: `SessionStructure` object

### 2.2. Update Session
-   **Method**: `PATCH`
-   **URL**: `/api/sessions/[id]`
-   **Body**: `UpdateSessionRequest` (JSON)
    -   `session`: `SessionStructure` object

### 2.3. Complete Session
-   **Method**: `POST`
-   **URL**: `/api/sessions/[id]/complete`
-   **Body**: `CompleteSessionRequest` (JSON, Optional)
    -   `session`: `SessionStructure` object (Optional final update)

### 2.4. List Sessions
-   **Method**: `GET`
-   **URL**: `/api/sessions`
-   **Query Parameters**:
    -   `plan_id` (UUID, optional)
    -   `date_from`, `date_to` (ISO Date, optional)
    -   `completed` (boolean, optional)
    -   `limit`, `offset` (pagination)
    -   `sort`, `order`

### 2.5. Get Session Details
-   **Method**: `GET`
-   **URL**: `/api/sessions/[id]`

## 3. Types and Schemas

### Used Types (`src/types.ts`)
-   **DTOs**: `CreateSessionRequest`, `UpdateSessionRequest`, `CompleteSessionRequest`, `SessionResponse`, `SessionSummary`.
-   **Entities**: `SessionEntity`, `SessionStructure`.
-   **Service**: `PaginatedSessionsResponse`, `ListSessionsQueryParams`.

### New Zod Schemas (`src/lib/schemas/sessions.ts`)
We need to define Zod schemas for runtime validation of the JSON bodies and query parameters.
-   `createSessionSchema`
-   `updateSessionSchema`
-   `completeSessionSchema`
-   `sessionQuerySchema`

## 4. Data Flow

1.  **Incoming Request**: Astro Server Endpoint receives the request.
2.  **Authentication**: `context.locals.supabase.auth.getUser()` verifies identity.
3.  **Validation**: Zod schemas validate the request body and query params.
4.  **Service Layer** (`SessionService`):
    *   **Business Logic Checks**:
        *   Does the plan exist and belong to the user?
        *   Is there already an active session? (Conflict check)
        *   Is the session already completed? (Update prevention)
    *   **Database Interaction**: Supabase Client executes queries against `training_sessions` and `plans`.
    *   **Audit Logging**: Calls `AuditLogService` for `session_started` and `session_completed`.
5.  **Response**: Returns formatted JSON or Error Object.

## 5. Security Considerations

-   **Owner-Only Access**: All DB queries must include `user_id = auth.uid()`.
-   **Plan Ownership**: When creating a session, validatate that `plan_id` belongs to the authenticated user.
-   **Input Sanitization**: Zod validation prevents malformed JSON injection.
-   **State Protection**: Completed sessions are immutable (except for admin/deletion if implemented later).

## 6. Error Handling

| Scenario | HTTP Status | Error Type | Message |
| :--- | :--- | :--- | :--- |
| Invalid JSON body | 400 | `ValidationError` | "Invalid session data" |
| Plan not found/owned | 400 | `ValidationError` | "Plan not found or access denied" |
| Active session exists | 409 | `ConflictError` | "An in-progress session already exists" |
| Session not found | 404 | `NotFound` | "Session not found" |
| Update completed session | 400 | `ValidationError` | "Cannot update completed session" |
| Database Error | 500 | `InternalServerError` | "Failed to process request" |

## 7. Performance Considerations

-   **Pagination**: Enforced on the List endpoint to prevent large payload transfers.
-   **Summary vs Detail**: List endpoint returns `SessionSummary` (excluding the heavy `session` JSONB column), while Details endpoint returns full data.
-   **Indexes**: (Future) Ensure `user_id`, `plan_id`, and `started_at` are indexed in Postgres.

## 8. Implementation Steps

### Step 1: Define Validation Schemas
Create `src/lib/schemas/sessions.ts`.
-   Implement Zod schemas matching the DTOs in `types.ts`.
-   Ensure strictly typed validation for the nested `SessionStructure` JSON.

### Step 2: Implement Session Service
Update `src/lib/services/sessionService.ts`.
-   **Dependencies**: Import `supabase` client type, `AuditLogService`.
-   **`create`**:
    -   Check for existing active session (`ended_at IS NULL`).
    -   Verify plan ownership.
    -   Insert into `training_sessions`.
    -   Update `plans.has_sessions = true`.
    -   Log `session_started`.
-   **`update`**:
    -   Verify session exists, belongs to user, and is active.
    -   Update `session` column.
-   **`complete`**:
    -   Verify session is active.
    -   Update `session` (if provided) and set `ended_at = NOW()`.
    -   Log `session_completed`.
-   **`getById`**: Fetch full details.
-   **`list`**: Fetch summaries with pagination/filtering.

### Step 3: Implement API Endpoints
Create the following Astro server endpoints:
1.  `src/pages/api/sessions/index.ts`:
    -   `POST`: Calls `create`.
    -   `GET`: Calls `list` (parses query params).
2.  `src/pages/api/sessions/[id]/index.ts`:
    -   `GET`: Calls `getById`.
    -   `PATCH`: Calls `update`.
3.  `src/pages/api/sessions/[id]/complete.ts`:
    -   `POST`: Calls `complete`.

### Step 4: Integration & Testing
-   Test the flow: Start -> Update -> Complete.
-   Verify Audit Logs are created.
-   Verify Plan status updates.
-   Test edge cases: Start second session (fail), update completed session (fail).

