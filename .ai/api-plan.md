# REST API Plan - GymPlanner MVP

## Overview

This document defines the REST API specification for GymPlanner MVP. The API is designed to support workout plan management, AI-powered plan generation, training session tracking, and historical data analysis. All endpoints use JSON for request and response payloads and are secured via Supabase authentication with Row-Level Security (RLS).

## Base URL

```
/api
```

All API endpoints are prefixed with `/api` and implemented as Astro API routes.

---

## 1. Resources

The API exposes the following main resources:

| Resource     | Database Table      | Description                                           |
| ------------ | ------------------- | ----------------------------------------------------- |
| Plans        | `plans`             | Workout plans with schedules and exercises            |
| Sessions     | `training_sessions` | Training session records with actual performance data |
| Audit Events | `audit_events`      | System and user action logs (read-only via API)       |

## 3. Endpoints

### 3.1. Plans Resource

#### 3.1.1. Generate AI Plan (Preview)

Generate a training plan using AI based on user preferences. This endpoint returns a preview plan that is NOT automatically saved.

**Endpoint**: `POST /api/plans/generate`

**Request Body**:

```json
{
  "preferences": {
    "goal": "hypertrophy",
    "system": "PPL",
    "available_days": ["monday", "wednesday", "friday"],
    "session_duration_minutes": 90,
    "cycle_duration_weeks": 6,
    "notes": "Focus on compound movements, previous shoulder injury"
  }
}
```

**Request Body Schema**:

- `preferences` (object, required):
  - `goal` (string, required): Training goal (e.g., "hypertrophy", "strength", "endurance")
  - `system` (string, required): Training system (e.g., "PPL", "FBW", "Upper/Lower")
  - `available_days` (array of strings, required): Days available for training
  - `session_duration_minutes` (number, required): Target duration per session in minutes
  - `cycle_duration_weeks` (number, required): Length of training cycle in weeks
  - `notes` (string, optional): Additional notes or constraints

**Success Response**: `200 OK`

```json
{
  "plan": {
    "name": "6-Week PPL Hypertrophy Program",
    "effective_from": "2025-01-15T00:00:00Z",
    "effective_to": "2025-02-25T23:59:59Z",
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
  },
  "preferences": {
    "goal": "hypertrophy",
    "system": "PPL",
    "available_days": ["monday", "wednesday", "friday"],
    "session_duration_minutes": 90,
    "cycle_duration_weeks": 6,
    "notes": "Focus on compound movements, previous shoulder injury"
  },
  "metadata": {
    "model": "anthropic/claude-3.5-sonnet",
    "generation_time_ms": 3500
  }
}
```

**Error Responses**:

`400 Bad Request` - Invalid input

```json
{
  "error": "ValidationError",
  "message": "Invalid preferences",
  "details": {
    "available_days": "Must contain at least one day"
  }
}
```

`500 Internal Server Error` - AI generation failed

```json
{
  "error": "AIGenerationFailed",
  "message": "Failed to generate plan. Please try again.",
  "details": "OpenRouter API error"
}
```

**Business Logic**:

1. Validate preferences (required fields, valid values)
2. Call OpenRouter AI API with formatted prompt
3. Parse and validate AI response
4. Calculate effective_from and effective_to based on cycle_duration_weeks
5. Log `ai_generation_requested` and `ai_generation_completed`/`ai_generation_failed` audit events
6. Return generated plan preview

---

#### 3.1.2. Create Plan

Create a new training plan (manual or AI-accepted).

**Endpoint**: `POST /api/plans`

**Request Body**:

```json
{
  "name": "Custom Upper/Lower Split",
  "effective_from": "2025-01-15T00:00:00Z",
  "effective_to": "2025-02-25T23:59:59Z",
  "source": "manual",
  "prompt": null,
  "preferences": {},
  "plan": {
    "schedule": {
      "2025-01-15": {
        "name": "Upper Body",
        "exercises": [
          {
            "name": "Bench Press",
            "sets": [{ "reps": 8, "weight": 80.0, "rest_seconds": 180 }]
          }
        ]
      }
    }
  }
}
```

**Request Body Schema**:

- `name` (string, required): Plan name (1-100 characters)
- `effective_from` (string, required): ISO 8601 timestamp for cycle start
- `effective_to` (string, required): ISO 8601 timestamp for cycle end
- `source` (string, required): Must be "ai" or "manual"
- `prompt` (string, optional): Original prompt for AI plans, null for manual
- `preferences` (object, required): User preferences (empty object for manual plans)
- `plan` (object, required): Plan structure with schedule

**Success Response**: `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Custom Upper/Lower Split",
  "effective_from": "2025-01-15T00:00:00Z",
  "effective_to": "2025-02-25T23:59:59Z",
  "source": "manual",
  "prompt": null,
  "preferences": {},
  "plan": {
    "schedule": {
      "2025-01-15": {
        "name": "Upper Body",
        "exercises": [
          {
            "name": "Bench Press",
            "sets": [{ "reps": 8, "weight": 80.0, "rest_seconds": 180 }]
          }
        ],
        "done": false
      }
    }
  },
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z"
}
```

**Error Responses**:

`400 Bad Request` - Validation error

```json
{
  "error": "ValidationError",
  "message": "Invalid plan data",
  "details": {
    "effective_to": "Must be after effective_from",
    "source": "Must be 'ai' or 'manual'"
  }
}
```

**Business Logic**:

1. Validate all required fields
2. Validate source field ('ai' or 'manual')
3. Validate effective_to > effective_from
4. Check for overlapping date ranges with existing non-archived plans
5. Validate plan JSON structure (schedule with valid dates, exercises, sets)
6. Set user_id from authenticated user
7. Set has_sessions=false, archived=false
8. Create plan in database
9. Log `plan_created` and `plan_accepted` (if source='ai') audit events

---

#### 3.1.3. List Plans

Retrieve all active training plans for authenticated user.

**Endpoint**: `GET /api/plans`

**Query Parameters**:

- `limit` (number, optional): Number of results per page (default: 20, max: 100)
- `offset` (number, optional): Pagination offset (default: 0)
- `sort` (string, optional): Sort field (default: "effective_from", options: "effective_from", "created_at", "name")
- `order` (string, optional): Sort order (default: "desc", options: "asc", "desc")

**Success Response**: `200 OK`

```json
{
  "plans": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "6-Week PPL Program",
      "effective_from": "2025-01-15T00:00:00Z",
      "effective_to": "2025-02-25T23:59:59Z",
      "source": "ai",
      "created_at": "2025-01-10T12:00:00Z",
      "updated_at": "2025-01-10T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

**Note**: The list endpoint returns summary data without the full plan JSON for performance. Use GET /api/plans/:id to retrieve full plan details.

---

#### 3.1.4. Get Plan Details

Retrieve complete details for a specific training plan.

**Endpoint**: `GET /api/plans/:id`

**Path Parameters**:

- `id` (uuid, required): Plan ID

**Success Response**: `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "6-Week PPL Program",
  "effective_from": "2025-01-15T00:00:00Z",
  "effective_to": "2025-02-25T23:59:59Z",
  "source": "ai",
  "prompt": "Create a PPL program for hypertrophy",
  "preferences": {
    "goal": "hypertrophy",
    "system": "PPL",
    "available_days": ["monday", "wednesday", "friday"]
  },
  "plan": {
    "schedule": {
      "2025-01-15": {
        "name": "Push Day",
        "exercises": [
          {
            "name": "Bench Press",
            "sets": [{ "reps": 8, "weight": 80.0, "rest_seconds": 180 }]
          }
        ],
        "done": false
      }
    }
  },
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z"
}
```

**Error Responses**:

`404 Not Found`

```json
{
  "error": "NotFound",
  "message": "Plan not found"
}
```

---

#### 3.1.5. Get next Workout

Retrieve the workout scheduled for next session from a specific plan.

**Endpoint**: `GET /api/plans/:id/next`

**Path Parameters**:

- `id` (uuid, required): Plan ID

**Success Response**: `200 OK`

```json
{
  "date": "2025-01-15",
  "workout": {
    "name": "Push Day",
    "exercises": [
      {
        "name": "Bench Press",
        "sets": [
          { "reps": 8, "weight": 80.0, "rest_seconds": 180 },
          { "reps": 8, "weight": 80.0, "rest_seconds": 180 },
          { "reps": 8, "weight": 80.0, "rest_seconds": 180 }
        ]
      },
      {
        "name": "Overhead Press",
        "sets": [
          { "reps": 10, "weight": 50.0, "rest_seconds": 120 },
          { "reps": 10, "weight": 50.0, "rest_seconds": 120 }
        ]
      }
    ]
  },
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_name": "6-Week PPL Program"
}
```

**Success Response (No Workout)**: `200 OK`

```json
{
  "workout": null,
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan_name": "6-Week PPL Program",
  "message": "There are no more workouts left to do from this plan."
}
```

**Error Responses**:

`404 Not Found`

```json
{
  "error": "NotFound",
  "message": "Plan not found"
}
```

`400 Bad Request`

```json
{
  "error": "ValidationError",
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

**Business Logic**:

1. Retrieve plan by ID (RLS ensures user ownership)
2. Determine target date (query param or today in user's timezone)
3. Extract workout from plan.schedule[date]
4. Return workout data or null if no workout scheduled

---

#### 3.1.6. Update Plan

Update an existing training plan.

**Endpoint**: `PUT /api/plans/:id`

**Path Parameters**:

- `id` (uuid, required): Plan ID

**Request Body**: Same structure as Create Plan (all fields required)

**Success Response**: `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Updated 6-Week PPL Program",
  "effective_from": "2025-01-15T00:00:00Z",
  "effective_to": "2025-02-25T23:59:59Z",
  "source": "ai",
  "prompt": "Create a PPL program for hypertrophy",
  "preferences": {
    "goal": "hypertrophy",
    "system": "PPL"
  },
  "plan": {
    "schedule": {
      "2025-01-15": {
        "name": "Push Day - Modified",
        "exercises": [
          {
            "name": "Bench Press",
            "sets": [{ "reps": 10, "weight": 85.0, "rest_seconds": 180 }]
          }
        ],
        "done": true
      }
    }
  },
  "archived": false,
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-15T14:30:00Z"
}
```

**Error Responses**:

`404 Not Found`

```json
{
  "error": "NotFound",
  "message": "Plan not found"
}
```

`400 Bad Request`

```json
{
  "error": "ValidationError",
  "message": "Invalid plan data",
  "details": {
    "effective_to": "Must be after effective_from"
  }
}
```

`409 Conflict`

```json
{
  "error": "DateOverlapError",
  "message": "Updated dates overlap with another plan",
  "conflicting_plan_id": "650e8400-e29b-41d4-a716-446655440000"
}
```

**Business Logic**:

1. Verify plan exists and user owns it (RLS)
2. Validate all fields (same as create)
3. Check for date overlaps with other plans (excluding current plan)
4. Update plan in database
5. updated_at timestamp is automatically updated by trigger
6. Log `plan_updated` audit event
7. Note: Existing sessions are NOT modified (snapshot model)

---

#### 3.1.7. Archive Plan (Soft Delete)

Archive a training plan (soft delete).

**Endpoint**: `DELETE /api/plans/:id`

**Path Parameters**:

- `id` (uuid, required): Plan ID

**Success Response**: `200 OK`

```json
{
  "message": "Plan archived successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:

`404 Not Found`

```json
{
  "error": "NotFound",
  "message": "Plan not found"
}
```

**Business Logic**:

1. Verify plan exists and user owns it (RLS)
2. Set archived=true (soft delete)
3. Associated sessions remain accessible
4. Log `plan_deleted` audit event

---

#### 3.1.8. Generate Next Cycle

Generate a new training plan based on completed cycle history using AI.

**Endpoint**: `POST /api/plans/:id/generate-next`

**Path Parameters**:

- `id` (uuid, required): Current plan ID to base progression on

**Request Body**:

```json
{
  "cycle_duration_weeks": 6,
  "notes": "Focus more on strength this cycle"
}
```

**Request Body Schema**:

- `cycle_duration_weeks` (number, required): Duration of new cycle in weeks
- `notes` (string, optional): Additional instructions for AI

**Success Response**: `200 OK`

```json
{
  "plan": {
    "name": "6-Week PPL Hypertrophy Program - Cycle 2",
    "effective_from": "2025-02-26T00:00:00Z",
    "effective_to": "2025-04-08T23:59:59Z",
    "schedule": {
      "2025-02-26": {
        "name": "Push Day",
        "exercises": [
          {
            "name": "Bench Press",
            "sets": [{ "reps": 8, "weight": 85.0, "rest_seconds": 180 }]
          }
        ]
      }
    }
  },
  "progression_summary": {
    "changes": [
      "Increased Bench Press weight from 80kg to 85kg based on consistent performance",
      "Added extra set to Overhead Press for volume progression"
    ]
  },
  "metadata": {
    "model": "anthropic/claude-3.5-sonnet",
    "generation_time_ms": 4200
  }
}
```

**Error Responses**:

`404 Not Found`

```json
{
  "error": "NotFound",
  "message": "Plan not found"
}
```

`400 Bad Request`

```json
{
  "error": "ValidationError",
  "message": "Cannot generate next cycle: no training sessions found for this plan"
}
```

**Business Logic**:

1. Verify plan exists and user owns it
2. Retrieve all completed sessions for the plan
3. Validate that plan has sessions (has_sessions=true)
4. Apply rate limiting
5. Format session history and original plan for AI prompt
6. Call OpenRouter AI to generate progression
7. Calculate new effective dates (start after current plan ends)
8. Return generated plan preview (NOT saved)
9. Log audit events

---

### 3.2. Sessions Resource

#### 3.2.1. Create Session (Start Training)

Create and start a new training session.

**Endpoint**: `POST /api/sessions`

**Request Body**:

```json
{
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2025-01-15",
  "session": {
    "plan_name": "6-Week PPL Program",
    "day_name": "Push Day",
    "date": "2025-01-15",
    "exercises": [
      {
        "name": "Bench Press",
        "sets": [
          {
            "planned_reps": 8,
            "planned_weight": 80.0,
            "actual_reps": null,
            "actual_weight": null,
            "rest_seconds": 180,
            "completed": false
          }
        ]
      }
    ]
  }
}
```

**Request Body Schema**:

- `plan_id` (uuid, required): ID of plan this session belongs to
- `date` (string, required): ISO date (YYYY-MM-DD) of the workout
- `session` (object, required): Session structure
  - `plan_name` (string, required): Name of the plan
  - `day_name` (string, required): Name of the workout day
  - `date` (string, required): ISO date
  - `exercises` (array, required): Array of exercises with sets

**Success Response**: `201 Created`

```json
{
  "id": "870e8400-e29b-41d4-a716-446655440002",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "session": {
    "plan_name": "6-Week PPL Program",
    "day_name": "Push Day",
    "date": "2025-01-15",
    "exercises": [
      {
        "name": "Bench Press",
        "sets": [
          {
            "planned_reps": 8,
            "planned_weight": 80.0,
            "actual_reps": null,
            "actual_weight": null,
            "rest_seconds": 180,
            "completed": false
          }
        ]
      }
    ]
  },
  "started_at": "2025-01-15T10:30:00Z",
  "ended_at": null,
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Error Responses**:

`400 Bad Request`

```json
{
  "error": "ValidationError",
  "message": "Invalid session data",
  "details": {
    "plan_id": "Plan not found or does not belong to user"
  }
}
```

`409 Conflict`

```json
{
  "error": "ConflictError",
  "message": "An in-progress session already exists",
  "existing_session_id": "970e8400-e29b-41d4-a716-446655440003"
}
```

**Business Logic**:

1. Validate plan_id exists and belongs to user
2. Check for existing in-progress session (ended_at IS NULL)
3. Validate session structure
4. Set started_at to current timestamp
5. Set ended_at to null
6. Create session in database
7. Update plan.has_sessions=true if this is first session
8. Log `session_started` audit event

---

#### 3.2.2. Update Session

Update session data during training (actual values, completed sets).

**Endpoint**: `PATCH /api/sessions/:id`

**Path Parameters**:

- `id` (uuid, required): Session ID

**Request Body**: Partial update of session data

```json
{
  "session": {
    "plan_name": "6-Week PPL Program",
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
          },
          {
            "planned_reps": 8,
            "planned_weight": 80.0,
            "actual_reps": 7,
            "actual_weight": 80.0,
            "rest_seconds": 180,
            "completed": true
          }
        ]
      }
    ]
  }
}
```

**Success Response**: `200 OK`

```json
{
  "id": "870e8400-e29b-41d4-a716-446655440002",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "session": {
    "plan_name": "6-Week PPL Program",
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
          },
          {
            "planned_reps": 8,
            "planned_weight": 80.0,
            "actual_reps": 7,
            "actual_weight": 80.0,
            "rest_seconds": 180,
            "completed": true
          }
        ]
      }
    ]
  },
  "started_at": "2025-01-15T10:30:00Z",
  "ended_at": null,
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Error Responses**:

`404 Not Found`

```json
{
  "error": "NotFound",
  "message": "Session not found"
}
```

`400 Bad Request`

```json
{
  "error": "ValidationError",
  "message": "Cannot update completed session"
}
```

**Business Logic**:

1. Verify session exists and user owns it
2. Verify session is in progress (ended_at IS NULL)
3. Update session data
4. Validate session structure
5. Save to database

---

#### 3.2.3. Complete Session

Mark a session as completed.

**Endpoint**: `POST /api/sessions/:id/complete`

**Path Parameters**:

- `id` (uuid, required): Session ID

**Request Body**: None (optional final session data update)

```json
{
  "session": {
    "plan_name": "6-Week PPL Program",
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
}
```

**Success Response**: `200 OK`

```json
{
  "id": "870e8400-e29b-41d4-a716-446655440002",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "session": {
    "plan_name": "6-Week PPL Program",
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
  },
  "started_at": "2025-01-15T10:30:00Z",
  "ended_at": "2025-01-15T11:45:00Z",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Error Responses**:

`404 Not Found`

```json
{
  "error": "NotFound",
  "message": "Session not found"
}
```

`400 Bad Request`

```json
{
  "error": "ValidationError",
  "message": "Session is already completed"
}
```

**Business Logic**:

1. Verify session exists and user owns it
2. Verify session is in progress (ended_at IS NULL)
3. If session data provided in body, update it first
4. Set ended_at to current timestamp
5. Validate ended_at > started_at
6. Save to database
7. Update parent plan: set `schedule[date].done = true`
8. Log `session_completed` audit event

---

#### 3.2.4. List Sessions

Retrieve training sessions for authenticated user with filtering and pagination.

**Endpoint**: `GET /api/sessions`

**Query Parameters**:

- `plan_id` (uuid, optional): Filter by plan ID
- `date_from` (string, optional): Filter sessions from date (ISO 8601)
- `date_to` (string, optional): Filter sessions to date (ISO 8601)
- `completed` (boolean, optional): Filter by completion status (null = all, true = completed only, false = in-progress only)
- `limit` (number, optional): Results per page (default: 20, max: 100)
- `offset` (number, optional): Pagination offset (default: 0)
- `sort` (string, optional): Sort field (default: "started_at", options: "started_at", "created_at")
- `order` (string, optional): Sort order (default: "desc")

**Success Response**: `200 OK`

```json
{
  "sessions": [
    {
      "id": "870e8400-e29b-41d4-a716-446655440002",
      "plan_id": "550e8400-e29b-41d4-a716-446655440000",
      "plan_name": "6-Week PPL Program",
      "day_name": "Push Day",
      "date": "2025-01-15",
      "started_at": "2025-01-15T10:30:00Z",
      "ended_at": "2025-01-15T11:45:00Z",
      "duration_minutes": 75,
      "completed_sets": 12,
      "total_sets": 15
    }
  ],
  "pagination": {
    "total": 24,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Note**: List endpoint returns summary data. Use GET /api/sessions/:id for full session details.

---

#### 3.2.5. Get Session Details

Retrieve complete details for a specific training session.

**Endpoint**: `GET /api/sessions/:id`

**Path Parameters**:

- `id` (uuid, required): Session ID

**Success Response**: `200 OK`

```json
{
  "id": "870e8400-e29b-41d4-a716-446655440002",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "plan_id": "550e8400-e29b-41d4-a716-446655440000",
  "session": {
    "plan_name": "6-Week PPL Program",
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
          },
          {
            "planned_reps": 8,
            "planned_weight": 80.0,
            "actual_reps": 7,
            "actual_weight": 80.0,
            "rest_seconds": 180,
            "completed": true
          }
        ]
      },
      {
        "name": "Overhead Press",
        "sets": [
          {
            "planned_reps": 10,
            "planned_weight": 50.0,
            "actual_reps": 10,
            "actual_weight": 50.0,
            "rest_seconds": 120,
            "completed": true
          }
        ]
      }
    ]
  },
  "started_at": "2025-01-15T10:30:00Z",
  "ended_at": "2025-01-15T11:45:00Z",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Error Responses**:

`404 Not Found`

```json
{
  "error": "NotFound",
  "message": "Session not found"
}
```

---

### 3.3. Audit Events Resource (Read-Only)

Audit events are created automatically by the system. This endpoint provides read-only access for analytics and debugging.

#### 3.3.1. List Audit Events

Retrieve audit events for authenticated user.

**Endpoint**: `GET /api/audit-events`

**Query Parameters**:

- `event_type` (string, optional): Filter by event type
- `entity_type` (string, optional): Filter by entity type ('plan', 'session')
- `entity_id` (uuid, optional): Filter by entity ID
- `date_from` (string, optional): Filter events from date (ISO 8601)
- `date_to` (string, optional): Filter events to date (ISO 8601)
- `limit` (number, optional): Results per page (default: 50, max: 200)
- `offset` (number, optional): Pagination offset (default: 0)

**Success Response**: `200 OK`

```json
{
  "events": [
    {
      "id": "980e8400-e29b-41d4-a716-446655440004",
      "event_type": "ai_generation_completed",
      "entity_type": "plan",
      "entity_id": "550e8400-e29b-41d4-a716-446655440000",
      "payload": {
        "model": "anthropic/claude-3.5-sonnet",
        "prompt_tokens": 450,
        "completion_tokens": 1200,
        "generation_time_ms": 3500
      },
      "created_at": "2025-01-10T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

**Event Types**:

- `ai_generation_requested`
- `ai_generation_completed`
- `ai_generation_failed`
- `plan_created`
- `plan_accepted`
- `plan_rejected`
- `plan_updated`
- `plan_deleted`
- `session_started`
- `session_completed`

---

### 3.4. Dashboard Resource

#### 3.4.1. Get Dashboard Summary

Retrieve aggregated data for the main user dashboard to provide quick access to the next workout and motivate action.

**Endpoint**: `GET /api/dashboard`

**Success Response**: `200 OK`

```json
{
  "upcoming_workouts": [
    {
      "plan_id": "550e8400-e29b-41d4-a716-446655440000",
      "plan_name": "6-Week PPL Program",
      "day_name": "Push Day",
      "date": "2025-01-15",
      "is_next": true
    },
    {
      "plan_id": "550e8400-e29b-41d4-a716-446655440000",
      "plan_name": "6-Week PPL Program",
      "day_name": "Pull Day",
      "date": "2025-01-17",
      "is_next": false
    }
  ],
  "user_state": "active"
}
```

**Response Schema**:

- `upcoming_workouts` (array): Chronological list of upcoming workouts from all active plans
  - `plan_id` (uuid): Source plan ID
  - `plan_name` (string): Name of the plan
  - `day_name` (string): Name of the workout day
  - `date` (string): ISO date (YYYY-MM-DD)
  - `is_next` (boolean): Indicator for the immediate next workout
- `user_state` (string): User status for UI handling
  - "new": No active plans created yet
  - "active": Active plans with scheduled workouts
  - "completed": Active plans exist but cycle is finished (no future workouts)

**Business Logic**:

1. Retrieve all non-archived plans for the user
2. If no plans exist, return `user_state="new"` and empty list
3. Collect all future workouts (date >= today) from active plans
4. Sort workouts by date ascending
5. If plans exist but list is empty, return `user_state="completed"`
6. Otherwise return `user_state="active"` with list

---

## 4. Common Error Responses

All endpoints may return the following common error responses:

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 500 Internal Server Error

```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred. Please try again later.",
  "request_id": "req_abc123"
}
```

### 503 Service Unavailable

```json
{
  "error": "ServiceUnavailable",
  "message": "Service temporarily unavailable. Please try again later."
}
```

---

## 5. Validation Rules and Business Logic

### 5.1. Plans Validation

**Required Fields**:

- `name`: 1-100 characters, not empty
- `effective_from`: Valid ISO 8601 timestamp
- `effective_to`: Valid ISO 8601 timestamp, must be after effective_from
- `source`: Must be exactly 'ai' or 'manual'
- `plan`: Must be valid JSON object with 'schedule' property

**Business Rules**:

1. **Date Overlap Prevention**: Before creating or updating a plan, check that effective_from/effective_to don't overlap with any existing non-archived plan for the same user
2. **Source Consistency**: If source='ai', prompt should be provided; if source='manual', prompt should be null
3. **Plan Structure**: plan.schedule must be object with ISO date keys (YYYY-MM-DD)
4. **Workout Days**: Each date in schedule must have 'name' and 'exercises' array
5. **Exercise Sets**: Each exercise must have 'name' and 'sets' array
6. **Set Properties**: Each set must have 'reps' (number), optional 'weight' (number), and 'rest_seconds' (integer)

**Immutability Rules**:

- Once a plan has sessions (has_sessions=true), certain modifications may require user confirmation (implemented in UI, not API)
- Modifying plan does NOT affect existing sessions (snapshot model)

### 5.2. Sessions Validation

**Required Fields**:

- `plan_id`: Must reference existing plan owned by user
- `session`: Must be valid JSON with complete structure
- `started_at`: Must be valid timestamp

**Business Rules**:

1. **Single Active Session**: User can only have one in-progress session at a time (ended_at IS NULL)
2. **Session Completion**: ended_at must be after started_at
3. **Immutability After Completion**: Once ended_at is set, session should not be modified (enforced in application layer)
4. **Session Structure**: Must match schema with plan_name, day_name, date, exercises array
5. **Set Tracking**: Each set must have planned_reps, planned_weight, optional actual_reps, optional actual_weight, rest_seconds, and completed boolean

### 5.3. AI Generation

**Rate Limiting**:

- Maximum 10 AI generation requests per hour per user
- Applies to both /api/plans/generate and /api/plans/:id/generate-next
- Returns 429 Too Many Requests with retry_after header

**Input Validation**:

- `available_days`: Must contain at least 1 day
- `cycle_duration_weeks`: Must be between 1 and 52 weeks
- `session_duration_minutes`: Must be between 15 and 240 minutes
- `goal`: Must be non-empty string
- `system`: Must be non-empty string

**AI Error Handling**:

- Log all AI requests and responses to audit_events
- If AI returns invalid JSON or structure, return 500 with user-friendly message
- Implement timeout (30 seconds) for AI requests
- Implement retry logic (1 retry) for transient failures

### 5.4. Timezone Handling

**Date Conversions**:

- All timestamps stored in database as UTC (timestamptz)
- Plan effective_from represents start of day (00:00:00) in user's local timezone
- Plan effective_to represents end of day (23:59:59) in user's local timezone
- API accepts optional timezone parameter for date-based queries
- Frontend should send user's timezone when relevant

**Example**:

```typescript
// User in Europe/Warsaw (UTC+1) creates plan for 2025-01-15
// Frontend sends: effective_from = "2025-01-15T00:00:00+01:00"
// Stored in DB as: "2025-01-14T23:00:00Z"
```

### 5.5. Audit Logging

All significant operations must log audit events:

| Operation                  | Event Type              | Payload                           |
| -------------------------- | ----------------------- | --------------------------------- |
| Generate AI plan (request) | ai_generation_requested | preferences, model                |
| Generate AI plan (success) | ai_generation_completed | model, tokens, generation_time_ms |
| Generate AI plan (failure) | ai_generation_failed    | error, model                      |
| Accept AI plan             | plan_accepted           | plan_id                           |
| Reject AI plan             | plan_rejected           | None                              |
| Create plan                | plan_created            | plan_id, source                   |
| Update plan                | plan_updated            | plan_id, changes_summary          |
| Archive plan               | plan_deleted            | plan_id                           |
| Start session              | session_started         | session_id, plan_id               |
| Complete session           | session_completed       | session_id, duration_minutes      |

---

## 6. Performance Considerations

### 6.1. Pagination

All list endpoints support pagination:

- Default limit: 20-50 items
- Maximum limit: 100-200 items
- Use offset-based pagination for MVP
- Consider cursor-based pagination for post-MVP

### 6.2. Response Optimization

- List endpoints return summary data (exclude large JSON fields)
- Detail endpoints return complete data
- Consider implementing field selection (?fields=id,name,effective_from) in post-MVP

### 6.3. Caching

- API responses should include appropriate Cache-Control headers
- Consider caching plan data that doesn't change frequently
- Invalidate cache on updates

### 6.4. Database Query Optimization

- RLS policies automatically filter by user_id
- Use database indexes for frequently queried fields (post-MVP)
- Avoid N+1 queries when fetching related data

---

## 7. Security Considerations

### 7.1. Authentication

- All endpoints require valid Supabase JWT token
- Token must be included in Authorization header
- Expired tokens return 401 Unauthorized
- Invalid tokens return 401 Unauthorized

### 7.2. Authorization

- RLS policies enforce user data isolation at database level
- API layer performs additional ownership checks
- Never expose other users' data in responses
- Validate user_id from auth.uid() matches request context

### 7.3. Input Validation

- Validate all request parameters and body data
- Sanitize user input to prevent injection attacks
- Use TypeScript types for compile-time validation
- Use validation library (e.g., Zod) for runtime validation

### 7.4. Rate Limiting

- Implement rate limiting on all endpoints
- Stricter limits on expensive operations (AI generation)
- Return 429 Too Many Requests with Retry-After header
- Consider per-user and per-IP rate limits

### 7.5. Error Handling

- Never expose sensitive data in error messages
- Don't reveal database structure or internal details
- Log detailed errors server-side with request_id
- Return generic error messages to clients

### 7.6. CORS

- Configure CORS to allow requests only from frontend domain
- In development: Allow localhost origins
- In production: Restrict to production domain

---

## 8. API Versioning

### Current Approach (MVP)

- No versioning in URLs (/api/plans, not /api/v1/plans)
- Breaking changes will be avoided
- Additive changes are acceptable (new optional fields, new endpoints)

### Post-MVP Versioning Strategy

- Consider URL-based versioning (/api/v1/, /api/v2/)
- Or header-based versioning (Accept: application/vnd.gymplanner.v2+json)
- Maintain backward compatibility for at least one version

---

## 9. Testing Recommendations

### 9.1. Unit Tests

- Test validation logic for all request bodies
- Test business rules (date overlap, session immutability)
- Test error handling and edge cases

### 9.2. Integration Tests

- Test complete API flows (create plan → start session → complete session)
- Test authentication and authorization
- Test RLS policies
- Test AI integration (with mocked AI responses)

### 9.3. Load Tests

- Test pagination with large datasets
- Test concurrent session updates
- Test rate limiting behavior

---

## 10. Monitoring and Observability

### 10.1. Logging

- Log all API requests (method, path, user_id, response status, duration)
- Log all errors with stack traces
- Log AI generation metrics (tokens, duration, success rate)
- Use structured logging (JSON format)

### 10.2. Metrics

Track key metrics:

- Request rate per endpoint
- Response time percentiles (p50, p95, p99)
- Error rate by endpoint and error type
- AI generation success rate
- Rate limit hits

### 10.3. Alerting

Set up alerts for:

- Error rate > threshold
- Response time > threshold
- AI generation failures
- Database connection issues

---

## 11. Implementation Checklist

### Phase 1: Core CRUD Operations

- [ ] Implement authentication middleware
- [ ] POST /api/plans (manual plans)
- [ ] GET /api/plans (list)
- [ ] GET /api/plans/:id (details)
- [ ] PUT /api/plans/:id (update)
- [ ] DELETE /api/plans/:id (archive)
- [ ] POST /api/sessions (create)
- [ ] PATCH /api/sessions/:id (update)
- [ ] POST /api/sessions/:id/complete
- [ ] GET /api/sessions (list)
- [ ] GET /api/sessions/:id (details)
- [ ] GET /api/dashboard (summary)

### Phase 2: AI Integration

- [ ] POST /api/plans/generate (AI generation)
- [ ] POST /api/plans/:id/generate-next (progression)
- [ ] Implement rate limiting for AI endpoints
- [ ] Implement audit logging for AI events

### Phase 3: Advanced Features

- [ ] GET /api/plans/:id/today (today's workout)
- [ ] POST /api/plans/:id/continue (duplicate)
- [ ] GET /api/audit-events (audit log access)
- [ ] Implement pagination for all list endpoints
- [ ] Add filtering and sorting support

### Phase 4: Optimization

- [ ] Add database indexes
- [ ] Implement caching
- [ ] Optimize query performance
- [ ] Add comprehensive error handling
- [ ] Add request/response validation

---

## Appendix A: TypeScript Type Definitions

```typescript
// API Request/Response Types

// Plans
interface CreatePlanRequest {
  name: string;
  effective_from: string;
  effective_to: string;
  source: "ai" | "manual";
  prompt?: string | null;
  preferences: Record<string, any>;
  plan: PlanStructure;
}

interface PlanResponse {
  id: string;
  user_id: string;
  name: string;
  effective_from: string;
  effective_to: string;
  source: "ai" | "manual";
  prompt: string | null;
  preferences: Record<string, any>;
  plan: PlanStructure;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

interface PlanStructure {
  schedule: Record<string, WorkoutDay>;
}

interface WorkoutDay {
  name: string;
  exercises: Exercise[];
  done: boolean;
}

interface Exercise {
  name: string;
  sets: SetPlan[];
}

interface SetPlan {
  reps: number;
  weight?: number;
  rest_seconds: number;
}

// Sessions
interface CreateSessionRequest {
  plan_id: string;
  date: string;
  session: SessionStructure;
}

interface SessionResponse {
  id: string;
  user_id: string;
  plan_id: string;
  session: SessionStructure;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

interface SessionStructure {
  plan_name: string;
  day_name: string;
  date: string;
  exercises: SessionExercise[];
}

interface SessionExercise {
  name: string;
  sets: SessionSet[];
}

interface SessionSet {
  planned_reps: number;
  planned_weight?: number;
  actual_reps?: number | null;
  actual_weight?: number | null;
  rest_seconds: number;
  completed: boolean;
}

// AI Generation
interface GeneratePlanRequest {
  preferences: {
    goal: string;
    system: string;
    available_days: string[];
    session_duration_minutes: number;
    cycle_duration_weeks: number;
    notes?: string;
  };
}

interface GeneratePlanResponse {
  plan: Omit<PlanResponse, "id" | "user_id" | "archived" | "created_at" | "updated_at">;
  preferences: GeneratePlanRequest["preferences"];
  metadata: {
    model: string;
    generation_time_ms: number;
  };
}

// Pagination
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Errors
interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}
```

---

**API Version**: 1.0.0  
**Last Updated**: 2025-11-05  
**Status**: Ready for Implementation
