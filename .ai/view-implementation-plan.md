# API Endpoint Implementation Plan: Dashboard Summary

## 1. Przegląd punktu końcowego

Endpoint `GET /api/dashboard` dostarcza zagregowane dane dla głównego dashboardu użytkownika. Jego celem jest szybki dostęp do nadchodzących treningów oraz motywowanie użytkownika do działania poprzez wyświetlenie najbliższego zaplanowanego treningu.

Endpoint zwraca listę nadchodzących treningów ze wszystkich aktywnych planów użytkownika oraz stan użytkownika określający jego sytuację w aplikacji (nowy, aktywny, ukończony cykl).

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/dashboard`
- **Parametry**:
  - **Wymagane**: Brak (tylko uwierzytelnienie)
  - **Opcjonalne**: Brak
- **Request Body**: Brak (endpoint typu GET bez parametrów)
- **Nagłówki**:
  - `Authorization`: Bearer token (obsługiwany przez Supabase middleware)

## 3. Wykorzystywane typy

### Nowe typy do dodania w `src/types.ts`:

```typescript
/**
 * Single upcoming workout item for dashboard
 */
export interface UpcomingWorkout {
  plan_id: string;
  plan_name: string;
  day_name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  is_next: boolean;
}

/**
 * User state for dashboard UI handling
 */
export type DashboardUserState = "new" | "active" | "completed";

/**
 * Response for dashboard summary
 * GET /api/dashboard
 */
export interface DashboardResponse {
  upcoming_workouts: UpcomingWorkout[];
  user_state: DashboardUserState;
}
```

### Wykorzystywane istniejące typy:

- `PlanEntity` - encja planu z bazy danych
- `PlanStructure` - struktura JSON planu z harmonogramem
- `WorkoutDay` - pojedynczy dzień treningowy
- `ApiError` - standardowa odpowiedź błędu

## 4. Szczegóły odpowiedzi

### Sukces: `200 OK`

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

### Błąd autoryzacji: `401 Unauthorized`

```json
{
  "error": "Unauthorized",
  "message": "User must be authenticated to access dashboard"
}
```

### Błąd serwera: `500 Internal Server Error`

```json
{
  "error": "InternalServerError",
  "message": "Failed to retrieve dashboard data"
}
```

## 5. Przepływ danych

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Request    │────▶│   Middleware    │────▶│  API Endpoint    │
│  GET /api/   │     │  (Auth check)   │     │  dashboard/      │
│  dashboard   │     │                 │     │  index.ts        │
└──────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │ DashboardService │
                                             │ getDashboardData │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │    Supabase      │
                                             │  plans table     │
                                             │  (with RLS)      │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │ Process plans:   │
                                             │ 1. Extract       │
                                             │    schedules     │
                                             │ 2. Filter future │
                                             │    dates         │
                                             │ 3. Sort by date  │
                                             │ 4. Mark is_next  │
                                             │ 5. Determine     │
                                             │    user_state    │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │    Response      │
                                             │  DashboardData   │
                                             └──────────────────┘
```

### Szczegółowy przepływ:

1. **Żądanie przychodzi** do `/api/dashboard`
2. **Middleware Astro** sprawdza token autoryzacji i ustawia `context.locals.user` oraz `context.locals.supabase`
3. **Endpoint** weryfikuje czy użytkownik jest zalogowany
4. **DashboardService** jest wywoływany z klientem Supabase
5. **Zapytanie do bazy danych**:
   - Pobierz wszystkie plany użytkownika gdzie `archived = false`
   - RLS automatycznie filtruje po `user_id`
6. **Przetwarzanie danych**:
   - Jeśli brak planów → `user_state = "new"`, pusta lista
   - Iteracja po planach i ich harmonogramach (`plan.plan.schedule`)
   - Filtrowanie: tylko daty >= dzisiejsza data
   - Filtrowanie: tylko treningi gdzie `done = false`
   - Sortowanie rosnąco po dacie
   - Oznaczenie pierwszego elementu jako `is_next = true`
   - Jeśli są plany ale lista pusta → `user_state = "completed"`
   - W przeciwnym razie → `user_state = "active"`
7. **Zwrócenie odpowiedzi** z kodem 200

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Endpoint wymaga uwierzytelnionego użytkownika
- Token JWT jest weryfikowany przez middleware Supabase
- Brak tokenu lub nieprawidłowy token → 401 Unauthorized

### Autoryzacja

- Row Level Security (RLS) na tabeli `plans` zapewnia izolację danych
- Użytkownik widzi tylko swoje plany (policy: `user_id = auth.uid()`)
- Nie ma potrzeby dodatkowej weryfikacji właściciela w kodzie aplikacji

### Walidacja danych

- Brak danych wejściowych do walidacji (GET bez parametrów)
- Defensywna obsługa struktury JSON planów (mogą być niekompletne)
- Walidacja formatu dat w harmonogramie

### Ochrona przed atakami

- Rate limiting na poziomie infrastruktury (do rozważenia w przyszłości)
- Brak możliwości SQL injection (Supabase SDK używa parametryzowanych zapytań)
- Brak możliwości manipulacji danymi (endpoint tylko do odczytu)

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Typ błędu | Komunikat |
|------------|----------|-----------|-----------|
| Brak tokenu autoryzacji | 401 | Unauthorized | "User must be authenticated to access dashboard" |
| Nieprawidłowy token | 401 | Unauthorized | "Invalid or expired authentication token" |
| Błąd zapytania do bazy | 500 | InternalServerError | "Failed to retrieve dashboard data" |
| Nieprawidłowa struktura planu | 500 | InternalServerError | "Failed to process plan data" |
| Timeout bazy danych | 500 | ServiceUnavailable | "Service temporarily unavailable" |

### Logowanie błędów

- Błędy 500 powinny być logowane z pełnym stack trace
- Używać `console.error` z kontekstem (user_id, timestamp)
- Nie logować wrażliwych danych (tokeny, pełne dane użytkownika)

## 8. Rozważania dotyczące wydajności

### Optymalizacje

1. **Selekcja kolumn**: Pobierać tylko niezbędne kolumny z tabeli `plans`:
   - `id`, `name`, `plan` (JSON)
   - Unikać pobierania `preferences`, `prompt` (niepotrzebne dla dashboardu)

2. **Filtrowanie na poziomie bazy**:
   - `WHERE archived = false`
   - Rozważyć dodanie filtra `effective_to >= now()` (opcjonalnie)

3. **Limit wyników**:
   - Ograniczyć liczbę zwracanych treningów (np. max 10 upcoming workouts)
   - Pozwoli to na szybsze przetwarzanie przy wielu planach

4. **Przetwarzanie JSON**:
   - Unikać wielokrotnego parsowania JSON
   - Używać early return gdy znajdziemy wystarczającą liczbę treningów

### Potencjalne wąskie gardła

- Duża liczba planów z obszernymi harmonogramami
- Skomplikowane operacje sortowania na dużych zbiorach dat

### Przyszłe optymalizacje (post-MVP)

- Indeks na `plans(user_id) WHERE NOT archived`
- Cache na poziomie aplikacji (Redis) z TTL np. 5 minut
- Denormalizacja: osobna tabela z nadchodzącymi treningami

## 9. Etapy wdrożenia

### Krok 1: Dodanie typów DTO

**Plik**: `src/types.ts`

Dodać nowe interfejsy na końcu pliku:
- `UpcomingWorkout`
- `DashboardUserState`
- `DashboardResponse`

### Krok 2: Utworzenie serwisu DashboardService

**Plik**: `src/lib/services/dashboard.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { 
  DashboardResponse, 
  UpcomingWorkout, 
  DashboardUserState,
  PlanStructure,
  WorkoutDay 
} from "@/types";

export class DashboardService {
  constructor(private supabase: SupabaseClient) {}

  async getDashboardSummary(): Promise<DashboardResponse> {
    // 1. Pobierz aktywne plany użytkownika
    // 2. Określ user_state na podstawie wyników
    // 3. Wyodrębnij i przefiltruj treningi
    // 4. Posortuj i oznacz is_next
    // 5. Zwróć odpowiedź
  }

  private extractUpcomingWorkouts(
    plans: Array<{ id: string; name: string; plan: PlanStructure }>
  ): UpcomingWorkout[] {
    // Logika ekstrakcji treningów z harmonogramów
  }

  private getTodayDateString(): string {
    // Zwróć dzisiejszą datę w formacie YYYY-MM-DD
  }
}
```

**Metody do zaimplementowania**:

1. `getDashboardSummary()`:
   - Zapytanie do Supabase: `select('id, name, plan').eq('archived', false)`
   - Obsługa przypadku braku planów (user_state: "new")
   - Wywołanie `extractUpcomingWorkouts()`
   - Obsługa przypadku pustej listy (user_state: "completed")
   - Zwrócenie pełnej odpowiedzi (user_state: "active")

2. `extractUpcomingWorkouts()`:
   - Iteracja po planach
   - Dla każdego planu iteracja po `plan.schedule`
   - Filtrowanie: `date >= today` i `workout.done === false`
   - Mapowanie na format `UpcomingWorkout`
   - Sortowanie po dacie (ascending)
   - Oznaczenie pierwszego jako `is_next: true`
   - Limit do rozsądnej liczby (np. 10)

3. `getTodayDateString()`:
   - Użycie `new Date().toISOString().split('T')[0]`

### Krok 3: Utworzenie endpointu API

**Plik**: `src/pages/api/dashboard/index.ts`

```typescript
import type { APIRoute } from "astro";
import { DashboardService } from "@/lib/services/dashboard.service";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // 1. Sprawdź autoryzację
  // 2. Utwórz instancję serwisu
  // 3. Pobierz dane dashboardu
  // 4. Zwróć odpowiedź
};
```

**Implementacja**:

1. Sprawdzenie `locals.user` - jeśli null, zwróć 401
2. Utworzenie `new DashboardService(locals.supabase)`
3. Try-catch wokół wywołania serwisu
4. Obsługa błędów z odpowiednimi kodami HTTP
5. Zwrócenie `Response` z JSON i odpowiednimi nagłówkami

### Krok 4: Testy manualne

1. Test bez autoryzacji → oczekiwany 401
2. Test z nowym użytkownikiem (bez planów) → `user_state: "new"`
3. Test z użytkownikiem z aktywnym planem → `user_state: "active"`, lista treningów
4. Test z użytkownikiem z ukończonym planem → `user_state: "completed"`
5. Weryfikacja sortowania i flagi `is_next`

### Krok 5: Dokumentacja

1. Aktualizacja dokumentacji API (jeśli istnieje)
2. Dodanie przykładów użycia
3. Dokumentacja typów w JSDoc

## 10. Przykładowa implementacja serwisu

```typescript
// src/lib/services/dashboard.service.ts
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  DashboardResponse,
  UpcomingWorkout,
  DashboardUserState,
  PlanStructure,
} from "@/types";

export class DashboardService {
  constructor(private supabase: SupabaseClient) {}

  async getDashboardSummary(): Promise<DashboardResponse> {
    const { data: plans, error } = await this.supabase
      .from("plans")
      .select("id, name, plan")
      .eq("archived", false);

    if (error) {
      throw new Error(`Failed to fetch plans: ${error.message}`);
    }

    // No plans - new user
    if (!plans || plans.length === 0) {
      return {
        upcoming_workouts: [],
        user_state: "new",
      };
    }

    const upcomingWorkouts = this.extractUpcomingWorkouts(
      plans as Array<{ id: string; name: string; plan: PlanStructure }>
    );

    // Plans exist but no future workouts
    if (upcomingWorkouts.length === 0) {
      return {
        upcoming_workouts: [],
        user_state: "completed",
      };
    }

    return {
      upcoming_workouts: upcomingWorkouts,
      user_state: "active",
    };
  }

  private extractUpcomingWorkouts(
    plans: Array<{ id: string; name: string; plan: PlanStructure }>
  ): UpcomingWorkout[] {
    const today = this.getTodayDateString();
    const workouts: UpcomingWorkout[] = [];

    for (const plan of plans) {
      const schedule = plan.plan?.schedule;
      if (!schedule) continue;

      for (const [date, workout] of Object.entries(schedule)) {
        // Skip past dates
        if (date < today) continue;
        
        // Skip completed workouts
        if (workout.done) continue;

        workouts.push({
          plan_id: plan.id,
          plan_name: plan.name,
          day_name: workout.name,
          date: date,
          is_next: false,
        });
      }
    }

    // Sort by date ascending
    workouts.sort((a, b) => a.date.localeCompare(b.date));

    // Mark first as next
    if (workouts.length > 0) {
      workouts[0].is_next = true;
    }

    // Limit results
    return workouts.slice(0, 10);
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split("T")[0];
  }
}
```

## 11. Przykładowa implementacja endpointu

```typescript
// src/pages/api/dashboard/index.ts
import type { APIRoute } from "astro";
import { DashboardService } from "@/lib/services/dashboard.service";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // Check authentication
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "User must be authenticated to access dashboard",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const dashboardService = new DashboardService(locals.supabase);
    const dashboardData = await dashboardService.getDashboardSummary();

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return new Response(
      JSON.stringify({
        error: "InternalServerError",
        message: "Failed to retrieve dashboard data",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

