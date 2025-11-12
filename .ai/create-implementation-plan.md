# API Endpoint Implementation Plan: Create Plan

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia tworzenie nowych planów treningowych. Na obecnym etapie deweloperskim, w celu ułatwienia testowania, wszystkie operacje są wykonywane w kontekście domyślnego użytkownika, a mechanizmy autoryzacji są pominięte. Obsługuje zarówno plany tworzone ręcznie, jak i te zaakceptowane po wygenerowaniu przez AI. Endpoint przeprowadza walidację danych, w tym kluczową weryfikację, czy okres obowiązywania nowego planu nie koliduje z istniejącymi, aktywnymi planami użytkownika.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/plans`
- **Request Body**: Ciało żądania musi być zgodne z typem `CreatePlanRequest` z `src/types.ts`.
  ```typescript
  export interface CreatePlanRequest {
    name: string;
    effective_from: string; // ISO 8601 timestamp
    effective_to: string; // ISO 8601 timestamp
    source: "ai" | "manual";
    prompt?: string | null;
    preferences: UserPreferences | Record<string, never>;
    plan: PlanStructure;
  }
  ```
- **Nagłówki**:
  - `Content-Type: application/json`
  - `// TODO: Dodać nagłówek Authorization po wdrożeniu autoryzacji`

## 3. Wykorzystywane typy
- **Request DTO**: `CreatePlanRequest`
- **Response DTO**: `PlanResponse`, `ApiError`
- **Modele bazodanowe**: `PlanInsert`, `AuditEventInsert`
- **Struktury JSON**: `PlanStructure`, `UserPreferences`

## 4. Szczegóły odpowiedzi
- **Odpowiedź sukcesu (201 Created)**: Zwraca pełny obiekt nowo utworzonego planu, zgodny z typem `PlanResponse`.
  ```json
  {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "name": "Custom Upper/Lower Split",
    "effective_from": "2025-01-15T00:00:00Z",
    "effective_to": "2025-02-25T23:59:59Z",
    "source": "manual",
    "prompt": null,
    "preferences": {},
    "plan": { /* ... PlanStructure ... */ },
    "archived": false,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
  ```
- **Odpowiedzi błędów**: Zwraca obiekt zgodny z typem `ApiError`.
  - `400 Bad Request` (`ValidationError` lub `DateOverlapError`)
  - `500 Internal Server Error`
  - `// TODO: Dodać obsługę błędu 401 Unauthorized po wdrożeniu autoryzacji`

## 5. Przepływ danych
1.  **Astro Route (`/api/plans`)**: Odbiera żądanie `POST`.
2.  **Handler**: Pobiera `DEFAULT_USER_ID` ze stałej, aby przypisać plan do domyślnego użytkownika testowego. `// TODO: Zastąpić DEFAULT_USER_ID identyfikatorem z context.locals.user po wdrożeniu autoryzacji.`
3.  **Walidacja (Zod)**: Ciało żądania jest parsowane i walidowane za pomocą schematu Zod opartego na `CreatePlanRequest`. W przypadku błędu zwracane jest `400`.
4.  **PlanService (`createPlan`)**: Handler API wywołuje metodę `planService.createPlan`, przekazując zwalidowane dane i `DEFAULT_USER_ID`.
5.  **Logika Biznesowa (w serwisie)**:
    a. Serwis wykonuje zapytanie do bazy danych (Supabase), aby sprawdzić, czy istnieją jakiekolwiek niezarchiwizowane plany dla danego użytkownika, których daty (`effective_from`, `effective_to`) pokrywają się z datami nowego planu. Jeśli tak, zwraca błąd `DateOverlapError`.
    b. Tworzony jest obiekt `PlanInsert`, mapując dane z DTO i ustawiając wartości domyślne (`user_id`, `archived=false`, `has_sessions=false`).
    c. Obiekt jest wstawiany do tabeli `plans` za pomocą klienta Supabase.
6.  **AuditService (`logEvent`)**: Po pomyślnym zapisie planu, `PlanService` wywołuje `auditService.logEvent`, aby utworzyć wpis w tabeli `audit_events`.
    a. Zawsze logowane jest zdarzenie `plan_created`.
    b. Jeśli `source` to "ai", dodatkowo logowane jest zdarzenie `plan_accepted`.
7.  **Odpowiedź**: `PlanService` zwraca nowo utworzony obiekt planu. Handler API formatuje go jako odpowiedź JSON z kodem `201`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: `// TODO: Wdrożyć pełne uwierzytelnianie.` Na obecnym etapie uwierzytelnianie jest pominięte w celu ułatwienia testów. Endpoint jest publicznie dostępny, a wszystkie operacje są przypisywane do domyślnego użytkownika (`DEFAULT_USER_ID`). Jest to tymczasowe i musi zostać zmienione przed wdrożeniem produkcyjnym.
- **Autoryzacja**: Polityki Supabase RLS na tabeli `plans` zapewniają, że użytkownik może tworzyć plany tylko dla samego siebie (`WITH CHECK (user_id = auth.uid())`).
- **Walidacja danych wejściowych**: Użycie Zod do ścisłej walidacji całego ciała żądania chroni przed nieprawidłowymi lub złośliwymi danymi, w tym przed atakami typu Mass Assignment.
- **Dostęp do kluczy**: Klucz `service_role_key` Supabase nie może być eksponowany po stronie klienta. Wszystkie operacje na bazie danych odbywają się po stronie serwera w kontekście sesji użytkownika.

## 7. Obsługa błędów
- **Błędy walidacji (400)**: Zwracane, gdy dane wejściowe nie przejdą walidacji Zod. Odpowiedź zawiera szczegóły dotyczące błędnych pól.
- **Konflikt dat (400)**: Zwracany, gdy daty planu nakładają się na istniejący plan. Odpowiedź będzie miała typ `DateOverlapError`.
- **Brak uwierzytelnienia (401)**: `// TODO: Wdrożyć obsługę błędu 401.` Obecnie nie jest zwracany, ponieważ autoryzacja jest pominięta.
- **Błędy serwera (500)**: W przypadku nieoczekiwanych problemów (np. błąd połączenia z bazą danych) zostanie zwrócony generyczny błąd serwera. Błąd powinien być logowany po stronie serwera w celu dalszej analizy.

## 8. Rozważania dotyczące wydajności
- **Zapytanie o nakładające się daty**: To jedyne dodatkowe zapytanie przed operacją `INSERT`. Należy upewnić się, że tabela `plans` ma odpowiednie indeksy (zgodnie z `db-plan.md`, `idx_plans_effective_dates`) na kolumnach `user_id`, `effective_from`, `effective_to`, aby zapytanie było szybkie, zwłaszcza gdy użytkownik ma wiele planów.
- **Rozmiar JSON**: Pola `plan` i `preferences` mogą przechowywać duże obiekty JSON. Ich przetwarzanie i transfer mogą wpłynąć na wydajność. Na tym etapie nie jest to problemem krytycznym.

## 9. Etapy wdrożenia
1.  **Stworzenie schematu walidacji Zod**: W nowym pliku `src/lib/schemas/plan.schema.ts` zdefiniować schemat dla `CreatePlanRequest`, uwzględniając wszystkie walidacje pól oraz regułę `refine` dla `effective_to > effective_from`.
2.  **Stworzenie `AuditService`**: W pliku `src/lib/services/audit.service.ts` zaimplementować prostą usługę z metodą `logEvent(type, userId, entityType, entityId, payload)` do wstawiania rekordów do tabeli `audit_events`.
3.  **Stworzenie `PlanService`**: W nowym pliku `src/lib/services/plan.service.ts` zaimplementować klasę `PlanService`.
    a. Dodać metodę `createPlan(data: CreatePlanRequest, userId: string)`.
    b. Wewnątrz `createPlan`, zaimplementować logikę sprawdzania nakładania się dat za pomocą zapytania Supabase.
    c. Zaimplementować logikę wstawiania nowego planu do bazy danych.
    d. Wywołać `AuditService` w celu zalogowania odpowiednich zdarzeń po pomyślnym utworzeniu planu.
4.  **Implementacja API Route**: W pliku `src/pages/api/plans/index.ts` (lub go utworzyć):
    a. Dodać `export const prerender = false;`.
    b. Zaimplementować funkcję `export async function POST({ request, locals })`.
    c. Pobranie `userId` z `DEFAULT_USER_ID`. `// TODO: Zastąpić stałą ID użytkownika danymi z sesji (locals.user) po zaimplementowaniu autoryzacji.`
    d. Sparsować i zwalidować ciało żądania przy użyciu schematu Zod. Zwrócić `400` w przypadku błędu.
    e. Wywołać `planService.createPlan` z poprawnymi danymi.
    f. Zaimplementować blok `try...catch` do obsługi błędów z serwisu (np. `DateOverlapError`) i zwracania odpowiednich odpowiedzi `ApiError`.
    g. Zwrócić odpowiedź `201 Created` z danymi planu w przypadku sukcesu.
5.  **Testowanie**: Dodać testy jednostkowe dla `PlanService`, zwłaszcza dla logiki sprawdzania nakładania się dat. Przeprowadzić testy integracyjne punktu końcowego, obejmujące scenariusze sukcesu i wszystkie zdefiniowane scenariusze błędów.
