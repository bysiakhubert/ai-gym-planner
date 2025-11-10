# API Endpoint Implementation Plan: Generate AI Plan (Preview)

## 1. Przegląd punktu końcowego

Ten punkt końcowy generuje podgląd planu treningowego przy użyciu zewnętrznego dostawcy AI (OpenRouter) na podstawie preferencji użytkownika. Wygenerowany plan jest zwracany do klienta w celu weryfikacji i nie jest automatycznie zapisywany w bazie danych. Służy on jako pierwszy krok w procesie tworzenia planu wspomaganego przez AI.

## 2. Szczegóły żądania

- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/plans/generate`
- **Request Body:**

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

- **Parametry:**
  - **Wymagane:**
    - `preferences.goal` (string)
    - `preferences.system` (string)
    - `preferences.available_days` (string[])
    - `preferences.session_duration_minutes` (number)
    - `preferences.cycle_duration_weeks` (number)
  - **Opcjonalne:**
    - `preferences.notes` (string)

## 3. Wykorzystywane typy

- **Command Model (Request):** `GeneratePlanRequest` zawierający obiekt `UserPreferences`.
- **Response DTO:** `GeneratePlanResponse` dla pomyślnych odpowiedzi.
- **Error DTO:** `ApiError` dla odpowiedzi o błędach.

Wszystkie typy pochodzą z `src/types.ts`.

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (200 OK):** Zwraca obiekt zawierający wygenerowany plan, powtórzone preferencje i metadane generowania.

```json
{
  "plan": {
    "name": "6-Week PPL Hypertrophy Program",
    "effective_from": "2025-11-06T00:00:00Z",
    "effective_to": "2025-12-18T23:59:59Z",
    "schedule": { ... }
  },
  "preferences": { ... },
  "metadata": {
    "model": "anthropic/claude-3.5-sonnet",
    "generation_time_ms": 3500
  }
}
```

- **Odpowiedzi o błędach:**
  - `400 Bad Request`: Błędy walidacji danych wejściowych.
  - `401 Unauthorized`: Brak lub nieprawidłowy token uwierzytelniania.
  - `429 Too Many Requests`: Przekroczono limit szybkości żądań.
  - `500 Internal Server Error`: Błąd po stronie serwera, np. błąd generowania AI.

## 5. Przepływ danych

1.  Klient wysyła żądanie `POST` do `/api/plans/generate` z preferencjami użytkownika.
2.  Middleware Astro (`src/middleware/index.ts`) weryfikuje token JWT Supabase i dołącza sesję użytkownika do `context.locals`.
3.  Handler trasy API (`src/pages/api/plans/generate.ts`) otrzymuje żądanie.
4.  Handler waliduje ciało żądania przy użyciu schematu Zod. W przypadku niepowodzenia zwraca błąd `400`.
5.  Handler wywołuje `AuditLogService`, aby zapisać zdarzenie `ai_generation_requested` w tabeli `audit_events`.
6.  Handler wywołuje `AiPlannerService` z zatwierdzonymi preferencjami.
7.  `AiPlannerService` konstruuje prompt i wysyła żądanie do zewnętrznego API OpenRouter.
8.  `AiPlannerService` parsuje odpowiedź AI, waliduje jej strukturę i oblicza daty `effective_from` / `effective_to`.
9.  W przypadku sukcesu, `AiPlannerService` zwraca sformatowany obiekt planu do handlera. W przypadku błędu zgłasza wyjątek.
10. Handler przechwytuje odpowiedź (lub błąd) z serwisu.
11. Handler wywołuje `AuditLogService`, aby zapisać zdarzenie `ai_generation_completed` lub `ai_generation_failed`.
12. Handler wysyła odpowiedź `200 OK` z podglądem planu lub odpowiedni kod błędu (`429`, `500`).

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie:** Wszystkie żądania muszą zawierać prawidłowy token JWT Supabase. Middleware musi odrzucić żądania bez uwierzytelnienia.
- **Autoryzacja:** Logika jest specyficzna dla uwierzytelnionego użytkownika; nie ma dostępu do danych innych użytkowników.
- **Walidacja danych wejściowych:** Użycie Zod do ścisłej walidacji ciała żądania, aby zapobiec nieoczekiwanym danym. Należy zastosować limity długości dla pola `notes`, aby zminimalizować ryzyko prompt injection.
- **Rate Limiting:** Zaimplementować mechanizm ograniczania szybkości (10 żądań/godzinę/użytkownika), aby zapobiec nadużyciom i kontrolować koszty API.
- **Zarządzanie sekretami:** Klucz API OpenRouter musi być bezpiecznie przechowywany jako zmienna środowiskowa (`OPENROUTER_API_KEY`) i dostępny tylko po stronie serwera.

## 7. Obsługa błędów

- **Błędy walidacji (400):** Zwracane z szczegółowym obiektem `details` zawierającym błędy dla poszczególnych pól.
- **Błędy AI (500):**
  - Niepowodzenie połączenia z API OpenRouter.
  - Timeout żądania (30 sekund).
  - Odpowiedź API zawierająca nieprawidłowy JSON lub nieoczekiwaną strukturę.
  - Zostanie zarejestrowane zdarzenie `ai_generation_failed`. Klient otrzyma ogólny komunikat o błędzie.
- **Błędy serwera (500):** Wszelkie inne nieoczekiwane błędy (np. błąd zapisu w `audit_events`) powinny być przechwytywane i zwracać ogólną odpowiedź o błędzie, jednocześnie logując szczegółowe informacje po stronie serwera.

## 8. Rozważania dotyczące wydajności

- **Czas odpowiedzi:** Głównym czynnikiem wpływającym na wydajność jest czas odpowiedzi zewnętrznego API AI. Należy zaimplementować rozsądny timeout (np. 30 sekund).
- **Operacje asynchroniczne:** Wszystkie operacje I/O (wywołania API, zapis do bazy danych) muszą być asynchroniczne, aby nie blokować pętli zdarzeń Node.js.

## 9. Etapy wdrożenia

1.  **Konfiguracja Zod Schema:**
    - Utwórz schemat Zod w `src/lib/schemas/plans.ts` do walidacji obiektu `UserPreferences` zgodnie z regułami z `api-plan.md`.

2.  **Utworzenie `AuditLogService`:**
    - Stwórz serwis w `src/lib/services/auditLogService.ts`.
    - Zaimplementuj metodę `logEvent(userId, eventType, payload)` do wstawiania rekordów do tabeli `audit_events` przy użyciu klienta Supabase z `context.locals`.

3.  **Utworzenie `AiPlannerService`:**
    - Stwórz serwis w `src/lib/services/aiPlannerService.ts`.
    - Zaimplementuj metodę `generatePlanPreview(preferences: UserPreferences)`.
    - W tej metodzie:
      - Zbuduj szczegółowy prompt dla modelu AI.
      - Wykonaj wywołanie `fetch` do API OpenRouter, używając `import.meta.env.OPENROUTER_API_KEY`. Jednak na tym etapie na razie chcemy skoystać z mocka, a nie wykonywać rzeczywistego requestu do AI.
      - Sparsuj i zwaliduj odpowiedź JSON od AI. Zgłoś błąd, jeśli struktura jest nieprawidłowa.
      - Oblicz daty `effective_from` i `effective_to`.
      - Zwróć obiekt zgodny z DTO `GeneratePlanResponse`.

4.  **Implementacja handlera trasy API:**
    - Utwórz plik `src/pages/api/plans/generate.ts`.
    - Zaimplementuj handler `POST`.
    - Sprawdź, czy użytkownik jest uwierzytelniony (`context.locals.user`). Jeśli nie, zwróć `401`.
    - Zaimplementuj logikę rate limitingu.
    - Użyj schematu Zod do walidacji `Astro.request.json()`. W przypadku błędu zwróć `400`.
    - Zawiń logikę biznesową w blok `try...catch`.
    - W bloku `try`:
      - Zaloguj `ai_generation_requested`.
      - Wywołaj `aiPlannerService.generatePlanPreview`.
      - Zaloguj `ai_generation_completed`.
      - Zwróć odpowiedź `200 OK` z danymi.
    - W bloku `catch`:
      - Zaloguj `ai_generation_failed`.
      - Zwróć odpowiednią odpowiedź o błędzie (`500`).

5.  **Dodanie zmiennych środowiskowych:**
    - Dodaj `OPENROUTER_API_KEY` do pliku `.env` i upewnij się, że jest on dostępny w `src/env.d.ts`.
