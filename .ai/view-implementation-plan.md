# API Endpoint Implementation Plan: Generate Next Cycle

## 1. Przegląd punktu końcowego

This endpoint allows users to generate a preview of their next training cycle based on the performance history of their current plan. It utilizes AI to analyze completed sessions and suggest progressions (e.g., increased weights, volume, or exercise variations). The generated plan is returned as a preview and is not automatically saved to the database.

## 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/plans/:id/generate-next`
- **Parametry**:
  - **Path**:
    - `id` (Required, UUID): The ID of the current plan to base the progression on.
  - **Body** (`GenerateNextCycleRequest`):
    - `cycle_duration_weeks` (Required, number): Duration of the new cycle (e.g., 4, 6, 8).
    - `notes` (Optional, string): Specific focus areas or instructions for the AI (e.g., "Focus on bench press strength").

- **Request Body Example**:
  ```json
  {
    "cycle_duration_weeks": 6,
    "notes": "Focus more on strength this cycle"
  }
  ```

## 3. Wykorzystywane typy

The implementation will utilize the following TypeScript definitions from `src/types.ts`:

- **DTOs**:
  - `GenerateNextCycleRequest`: Input validation.
  - `GenerateNextCycleResponse`: Output structure.
  - `PlanResponse`: To type the fetched current plan.
  - `SessionSummary` or `SessionEntity`: To type the fetched session history.
- **Database Models**:
  - `Tables<"plans">`
  - `Tables<"training_sessions">`

## 3. Szczegóły odpowiedzi

- **Success (200 OK)**: Returns `GenerateNextCycleResponse`.
  ```json
  {
    "plan": {
      "name": "...",
      "effective_from": "...",
      "effective_to": "...",
      "schedule": { ... }
    },
    "progression_summary": {
      "changes": ["..."]
    },
    "metadata": {
      "model": "...",
      "generation_time_ms": 123
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation error or plan has no sessions (`has_sessions` is false).
  - `401 Unauthorized`: User is not logged in.
  - `404 Not Found`: Plan does not exist or does not belong to the user.
  - `500 Internal Server Error`: AI service failure or database connection issue.

## 4. Przepływ danych

1.  **Client Request**: Sends `POST` with `planId` and preferences.
2.  **API Handler**: 
    - Validates session (Auth).
    - Validates input body using Zod.
3.  **Plan Service**: Fetches the current plan by `id` and `userId`. Checks if `has_sessions` is true.
4.  **Session Service**: Fetches completed training sessions associated with the plan.
5.  **Audit Service**: Logs `ai_generation_requested`.
6.  **AI Service**: 
    - Constructs a prompt containing the current plan structure and session history.
    - Calls OpenRouter API.
    - Parses the response into `GenerateNextCycleResponse`.
7.  **Audit Service**: Logs `ai_generation_completed`.
8.  **API Handler**: Returns the generated plan preview to the client.

## 5. Względy bezpieczeństwa

- **Authentication**: Verified via `context.locals.auth`.
- **Authorization (RLS)**: 
  - Service methods must include `user_id` in all database queries to ensure users can only access their own plans and sessions.
  - The `getPlanById` check ensures the user owns the plan before generating the next cycle.
- **Input Validation**: 
  - Zod schemas used to strictly validate `cycle_duration_weeks` (e.g., min 1, max 12) to prevent malformed inputs.
- **AI Safety**: 
  - Prompt injection protection by sanitizing the `notes` field before sending to the LLM (though risk is low as output is structured JSON).

## 6. Obsługa błędów

- **ValidationError**: If `has_sessions` is false, return 400 with message "Cannot generate next cycle: no training sessions found for this plan".
- **PlanNotFound**: Return 404.
- **AIGenerationFailed**: Catch errors from `AiPlannerService` and return 500 with a user-friendly message.
- **Database Errors**: Log internal details but return generic 500 errors to client.

## 7. Rozważania dotyczące wydajności

- **Session Fetching**: Instead of fetching full JSON blobs for every session, select only necessary fields (date, exercises, sets, actual_reps, actual_weight) to minimize payload size when querying the database.
- **Prompt Size**: Limit the session history sent to the AI (e.g., last 4-6 weeks or last 20 sessions) to avoid exceeding token limits and reduce latency.
- **Timeouts**: AI generation can be slow. Ensure the endpoint has a sufficient timeout configuration (e.g., 30-60s) or provide immediate feedback if using a queue (MVP will likely use direct request/response).

## 8. Etapy wdrożenia

1.  **Create Session Service**: 
    - Create `src/lib/services/sessionService.ts`.
    - Implement `getCompletedSessions(userId, planId)` to fetch historical performance data.

2.  **Update AI Planner Service**:
    - Modify `src/lib/services/aiPlannerService.ts`.
    - Add `generateNextCycle(currentPlan, sessionHistory, preferences)` method.
    - Implement the prompt logic to compare planned vs. actuals.

3.  **Create API Endpoint**:
    - Create file `src/pages/api/plans/[id]/generate-next.ts`.
    - Implement `POST` handler.
    - Add Zod schema for request body.
    - Orchestrate the service calls (Get Plan -> Get Sessions -> Generate).

4.  **Add Audit Logging**:
    - Integrate `auditLogService` to track generation requests and results.

5.  **Testing**:
    - Verify 404 for invalid plans.
    - Verify 400 for plans with no sessions.
    - Verify 200 for valid generation.
