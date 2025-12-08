# Manual Testing Guide: POST /api/plans/:id/continue

## Endpoint Overview
The continue endpoint allows users to duplicate an existing training plan with shifted dates, maintaining the same workout structure and rest day intervals.

## Prerequisites
1. Have at least one existing training plan in the database
2. Server running on http://localhost:4321
3. Bruno (or Postman/curl) for API testing

## Test Scenarios

### Test 1: Basic Plan Continuation (Happy Path)
**Setup:**
1. Create or use an existing plan with ID `{plan_id}`
2. Note the plan's effective_from and effective_to dates

**Request:**
```http
POST http://localhost:4321/api/plans/{plan_id}/continue
Content-Type: application/json

{
  "effective_from": "2025-02-01",
  "name": "PPL Cycle 2"
}
```

**Expected Response: 201 Created**
- New plan with different ID
- Same plan structure but shifted dates
- `effective_from` set to "2025-02-01T00:00:00Z"
- `effective_to` shifted by same delta as effective_from
- All workout dates in `plan.schedule` shifted accordingly
- All `done` flags reset to `false`
- `name` set to "PPL Cycle 2"

**Validation:**
- Compare original and new plan schedules
- Verify date offsets are consistent
- Check that workout content is identical

---

### Test 2: Auto-Generated Name
**Request:**
```http
POST http://localhost:4321/api/plans/{plan_id}/continue
Content-Type: application/json

{
  "effective_from": "2025-03-01"
}
```

**Expected Response: 201 Created**
- Plan name should be "Copy of {Original Plan Name}"

---

### Test 3: Invalid Plan ID Format
**Request:**
```http
POST http://localhost:4321/api/plans/invalid-uuid/continue
Content-Type: application/json

{
  "effective_from": "2025-02-01"
}
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "ValidationError",
  "message": "Invalid plan ID format",
  "details": {
    "errors": ["Invalid plan ID format"]
  }
}
```

---

### Test 4: Non-Existent Plan
**Request:**
```http
POST http://localhost:4321/api/plans/00000000-0000-0000-0000-000000000000/continue
Content-Type: application/json

{
  "effective_from": "2025-02-01"
}
```

**Expected Response: 404 Not Found**
```json
{
  "error": "NotFound",
  "message": "Plan with id \"00000000-0000-0000-0000-000000000000\" not found"
}
```

---

### Test 5: Invalid Date Format
**Request:**
```http
POST http://localhost:4321/api/plans/{plan_id}/continue
Content-Type: application/json

{
  "effective_from": "2025/02/01"
}
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "ValidationError",
  "message": "Invalid request body",
  "details": {
    "errors": {
      "effective_from": ["effective_from must be in YYYY-MM-DD format"]
    }
  }
}
```

---

### Test 6: Date Overlap with Existing Plan
**Setup:**
1. Create a plan with dates: 2025-02-01 to 2025-03-15
2. Try to continue another plan with effective_from that would overlap

**Request:**
```http
POST http://localhost:4321/api/plans/{plan_id}/continue
Content-Type: application/json

{
  "effective_from": "2025-02-10"
}
```

**Expected Response: 409 Conflict**
```json
{
  "error": "DateOverlapError",
  "message": "Plan dates overlap with existing plan \"...\" (...)"
}
```

---

### Test 7: Invalid JSON Body
**Request:**
```http
POST http://localhost:4321/api/plans/{plan_id}/continue
Content-Type: application/json

{ invalid json }
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "ValidationError",
  "message": "Invalid JSON in request body"
}
```

---

### Test 8: Missing Required Field
**Request:**
```http
POST http://localhost:4321/api/plans/{plan_id}/continue
Content-Type: application/json

{
  "name": "New Plan"
}
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "ValidationError",
  "message": "Invalid request body",
  "details": {
    "errors": {
      "effective_from": ["Required"]
    }
  }
}
```

---

### Test 9: Name Too Long
**Request:**
```http
POST http://localhost:4321/api/plans/{plan_id}/continue
Content-Type: application/json

{
  "effective_from": "2025-02-01",
  "name": "A".repeat(101)
}
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "ValidationError",
  "message": "Invalid request body",
  "details": {
    "errors": {
      "name": ["Plan name must be 100 characters or less"]
    }
  }
}
```

---

## Database Verification

After successful plan creation, verify in Supabase:

1. **Plans table:**
   - New plan exists with different ID
   - `user_id` matches original
   - `archived` is false
   - `source` matches original plan
   - `plan` JSON has shifted dates

2. **Audit Events table:**
   - `plan_created` event logged with new plan ID
   - Payload includes plan_name, source, effective_from, effective_to

## Bruno Collection

Use the provided Bruno collection file:
`bruno-collections/Gym-planned/Continue plan.bru`

1. Open Bruno
2. Import the collection
3. Set the `planId` path parameter
4. Adjust the `effective_from` date
5. Execute the request

## Common Issues

**Issue: Dates not shifting correctly**
- Check that source plan has valid ISO dates in schedule keys
- Verify time delta calculation in `shiftPlanDates` function

**Issue: Done flags not resetting**
- Verify deep copy in `shiftPlanDates` creates new objects
- Check that `done: false` is explicitly set

**Issue: Date overlap false positives**
- Check timezone handling in date calculations
- Verify ISO timestamp formatting

## Next Steps After Testing

1. ✅ Verify all test scenarios pass
2. ✅ Check database state after each operation
3. ✅ Review audit logs for proper event tracking
4. ⬜ Update API documentation
5. ⬜ Create frontend integration if needed

