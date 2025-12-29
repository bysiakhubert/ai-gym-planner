# OpenRouter Integration Setup Guide

This guide explains how to set up and use the OpenRouter AI integration for generating workout plans in GymPlanner.

## Prerequisites

1. **OpenRouter API Key**: Sign up at [OpenRouter](https://openrouter.ai/) and get your API key from the [Keys page](https://openrouter.ai/keys)
2. **Environment Variables**: Configure your `.env` file (see below)

## Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# Required: OpenRouter API Key
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Site URL for OpenRouter ranking (defaults to localhost in development)
SITE_URL=http://localhost:4321

# Supabase Configuration (if not already set)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Architecture Overview

The OpenRouter integration consists of three main components:

### 1. OpenRouterService (`src/lib/services/openRouterService.ts`)

Low-level service responsible for HTTP communication with OpenRouter API.

**Key Features:**
- Bearer token authentication
- Structured output generation using JSON Schema
- Comprehensive error handling (Configuration, Network, API, Parse errors)
- Type-safe responses with Zod validation
- Server-side only (never exposed to client)
- **Singleton pattern**: Created at module level using `import.meta.env` (similar to Supabase client)

**Error Types:**
- `OpenRouterConfigurationError`: Missing or invalid API key
- `OpenRouterNetworkError`: Network connectivity issues
- `OpenRouterAPIError`: API errors (4xx, 5xx responses)
- `OpenRouterParseError`: Invalid JSON or schema mismatch

### 2. AI Response Schemas (`src/lib/schemas/ai-response.ts`)

Zod schemas defining the structure of AI-generated workout plans.

**Schema Hierarchy:**
- `aiSetSchema`: Single set (reps, weight, rest, RIR)
- `aiExerciseSchema`: Exercise with multiple sets
- `aiWorkoutDaySchema`: Workout day with exercises
- `aiPlanSchema`: Complete training plan

### 3. AiPlannerService (`src/lib/services/aiPlannerService.ts`)

Domain service that uses OpenRouterService to generate workout plans.

**Key Methods:**
- `generatePlanPreview(preferences)`: Generates a new workout plan based on user preferences
- `generateNextCycle(...)`: Generates next training cycle (currently uses traditional progression logic)

### 4. AI Prompts (`src/lib/services/aiPrompts.ts`)

Prompt templates and utilities for AI interactions.

**Features:**
- System message defining AI trainer role
- User prompt formatting based on preferences
- Input sanitization to prevent prompt injection

## API Endpoint

### POST `/api/plans/generate`

Generates an AI-powered workout plan preview.

**Request Body:**
```json
{
  "preferences": {
    "goal": "Hypertrophy",
    "system": "PPL",
    "available_days": ["monday", "wednesday", "friday"],
    "session_duration_minutes": 60,
    "cycle_duration_weeks": 4,
    "notes": "Optional user notes"
  }
}
```

**Success Response (200):**
```json
{
  "plan": {
    "name": "4-Week PPL Hypertrophy Program",
    "effective_from": "2025-12-09T...",
    "effective_to": "2026-01-06T...",
    "source": "ai",
    "plan": { "schedule": {...} },
    "schedule": {...}
  },
  "preferences": {...},
  "metadata": {
    "model": "google/gemini-2.0-flash-exp:free",
    "generation_time_ms": 2450
  }
}
```

**Error Responses:**
- `400`: Validation error (invalid preferences)
- `429`: Rate limit exceeded (10 requests per hour)
- `500`: Configuration error or parse error
- `503`: Network error or API unavailable

## Security Considerations

### Server-Side Only
- OpenRouterService MUST only be used in server-side code (`.astro` frontmatter, API routes)
- API key is never exposed to the client
- Uses `import.meta.env.OPENROUTER_API_KEY` (not `PUBLIC_`)

### Input Sanitization
- User notes are sanitized to prevent prompt injection
- Basic pattern matching removes dangerous instructions
- Input length is limited to 500 characters

### Rate Limiting
- In-memory rate limiting: 10 requests per hour per user
- For production, consider using Redis or similar persistent store

## Model Configuration

**Default Model:** `google/gemini-2.0-flash-exp:free`

This model is:
- Free to use (with rate limits)
- Fast response times
- Supports structured outputs (JSON Schema)
- Good quality for workout plan generation

**Alternative Models:**
You can change the model in `OpenRouterService`:
- `openai/gpt-4o-mini`: Higher quality, paid
- `anthropic/claude-3-haiku`: Fast and affordable
- See [OpenRouter Models](https://openrouter.ai/models) for full list

## Testing

### Manual Testing

1. Start the development server:
```bash
npm run dev
```

2. Navigate to `/generate` in your browser

3. Fill in the workout preferences form

4. Click "Generate Plan" and verify the AI response

### Error Testing

Test different error scenarios by:
- Removing `OPENROUTER_API_KEY` → should get 500 with configuration error
- Using invalid API key → should get 503 with API error
- Disconnecting internet → should get 503 with network error

## Troubleshooting

### "OPENROUTER_API_KEY is not set"

**Cause:** The API key is not being loaded from the `.env` file.

**Solutions:**
1. **Ensure `.env` file exists** in the project root (same level as `package.json`)
2. **Verify variable name** is exactly `OPENROUTER_API_KEY` (case-sensitive)
3. **Restart the development server** after adding/changing the key:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```
4. **Check .env format** - no quotes needed:
   ```env
   # Correct
   OPENROUTER_API_KEY=sk-or-v1-xxx...
   
   # Incorrect (will include quotes in the value)
   OPENROUTER_API_KEY="sk-or-v1-xxx..."
   ```
5. **Module-level initialization:** The `openRouterService` is created as a singleton at module level (like `supabaseClient`), which allows it to access `import.meta.env`. This is the correct pattern for Astro.

### "AI service is temporarily unavailable"
- Check your internet connection
- Verify OpenRouter API status at [status.openrouter.ai](https://status.openrouter.ai)
- Check if you've exceeded rate limits

### "Model returned empty content"
- This is rare but can happen with free models under heavy load
- Try again or consider upgrading to a paid model

### Build Errors
- Run `npm run build` to check for TypeScript errors
- Run `npm run lint` to check for code quality issues
- Ensure all imports are correct and server-side only

## Cost Management

### Free Tier
- Google Gemini 2.0 Flash Exp is free with rate limits
- Monitor usage at [OpenRouter Dashboard](https://openrouter.ai/activity)

### Paid Models
- Set spending limits in OpenRouter dashboard
- Monitor costs per request
- Consider caching common plan types

## Future Enhancements

Potential improvements for the AI integration:

1. **Smart Progression**: Use AI to analyze session history and suggest intelligent progressions
2. **Exercise Library**: Integrate with exercise database for better exercise selection
3. **Injury Prevention**: AI analysis of workout patterns to prevent overtraining
4. **Personalization**: Learn from user feedback to improve plan quality
5. **Multi-language**: Support for multiple languages in prompts and responses

## Support

For issues or questions:
- Check the [OpenRouter Documentation](https://openrouter.ai/docs)
- Review error logs in the console
- Contact support at support@openrouter.ai

