# API Endpoint Implementation Plan: POST /api/plans/:id/continue

## 1. Przegląd punktu końcowego

Punkt końcowy `POST /api/plans/:id/continue` służy do duplikowania istniejącego planu treningowego z jednoczesnym przesunięciem harmonogramu treningów na nowy termin. Pozwala to użytkownikom na łatwe "wznowienie" lub powtórzenie zakończonego cyklu treningowego bez konieczności ponownego generowania go przez AI lub ręcznego wprowadzania danych.

Kluczową funkcjonalnością jest inteligentne przeliczenie dat w strukturze JSON planu, tak aby zachować odstępy między treningami (np. dni regeneracji) względem nowej daty początkowej.

## 2. Szczegóły żądania

- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/plans/:id/continue`
- **Parametry Ścieżki (Path Params):**
  - `id` (Wymagane, UUID): Unikalny identyfikator planu źródłowego, który ma zostać skopiowany.
- **Request Body:** `application/json`

  ```json
  {
    "effective_from": "2025-02-01",
    "name": "PPL Cycle 2" // Opcjonalne
  }
  ```

  - `effective_from` (Wymagane): Data ISO 8601 (YYYY-MM-DD), od której ma się zaczynać nowy plan.
  - `name` (Opcjonalne): Nowa nazwa planu. Jeśli nie podano, system wygeneruje nazwę (np. "Copy of [Stara Nazwa]").

## 3. Wykorzystywane typy

### Nowe typy (do dodania w `src/types.ts`)

Należy zdefiniować `ContinuePlanRequest`, aby zapewnić ścisłe typowanie danych wejściowych.

```typescript
// src/types.ts

/**
 * Request body for continuing/duplicating a plan
 * POST /api/plans/:id/continue
 */
export interface ContinuePlanRequest {
  effective_from: string; // ISO date string (YYYY-MM-DD)
  name?: string;
}
```

### Istniejące typy

- `PlanResponse`: Do zwrócenia utworzonego planu.
- `PlanEntity`: Do interakcji z bazą danych.

## 3. Szczegóły odpowiedzi

- **Kod statusu:** `201 Created`
- **Body:** Obiekt JSON zgodny z interfejsem `PlanResponse`.

```json
{
  "id": "new-uuid-v4",
  "name": "PPL Cycle 2",
  "effective_from": "2025-02-01T00:00:00Z",
  "effective_to": "2025-03-15T23:59:59Z",
  "plan": {
    "schedule": {
      "2025-02-01": { ... }, // Przesunięte daty
      "2025-02-03": { ... }
    }
  },
  "source": "manual", // lub zachowanie źródła oryginału
  "has_sessions": false,
  "archived": false,
  // ... pozostałe pola
}
```

## 4. Przepływ danych

1.  **Odebranie żądania:** Endpoint w `src/pages/api/plans/[id]/continue.ts` odbiera żądanie.
2.  **Walidacja:** Middleware/Handler sprawdza sesję użytkownika. Zod waliduje poprawność UUID oraz formatu daty w body.
3.  **Warstwa Serwisu (`planService`):**
    *   Pobiera plan źródłowy z bazy danych (`plans` table) używając `source_id` i `user_id`.
    *   Oblicza przesunięcie czasowe (Time Delta) między `original_effective_from`, a `new_effective_from`.
    *   Tworzy nowy obiekt planu (Deep Copy).
    *   Iteruje po kluczach obiektu `plan.schedule`, aktualizując daty kluczy oraz daty wewnątrz obiektów `WorkoutDay`.
    *   Oblicza nowe `effective_to` dodając czas trwania planu do nowej daty startu.
4.  **Zapis:** Serwis zapisuje nowy plan w tabeli `plans` przez Supabase Client.
5.  **Audyt:** Serwis loguje zdarzenie `plan_created` w tabeli `audit_events`.
6.  **Odpowiedź:** API zwraca nowy obiekt planu do klienta.

## 5. Względy bezpieczeństwa

-   **Uwierzytelnianie:** Wymagane sprawdzenie `context.locals.user` (Supabase Auth).
-   **Autoryzacja (RLS):** Baza danych posiada polityki RLS, które uniemożliwią pobranie planu innego użytkownika. Serwis powinien dodatkowo sprawdzić, czy pobranie planu źródłowego zwróciło wynik, aby obsłużyć błąd 404.
-   **Sanityzacja:** Walidacja daty wejściowej zapobiega błędom operacji na datach.

## 6. Obsługa błędów

| Kod | Opis błędu | Przyczyna |
| :-- | :--- | :--- |
| `201` | Created | Plan został pomyślnie skopiowany. |
| `400` | Bad Request | Nieprawidłowe ID lub format daty `effective_from`. |
| `401` | Unauthorized | Brak aktywnej sesji użytkownika. |
| `404` | Not Found | Plan źródłowy nie istnieje lub nie należy do użytkownika. |
| `500` | Internal Server Error | Błąd przetwarzania JSON lub błąd bazy danych. |

## 7. Rozważania dotyczące wydajności

-   **Przetwarzanie JSON:** Operacja klonowania i mapowania dat odbywa się w pamięci (Node.js). Dla typowych planów (kilka/kilkanaście tygodni) obiekt JSON jest mały (<100KB), więc operacja będzie szybka.
-   **Transakcje:** Operacja jest atomowa (pojedynczy INSERT), więc nie wymaga skomplikowanych transakcji bazodanowych, chyba że chcemy zagwarantować spójność z logiem audytowym (wtedy RPC lub zaufanie, że logowanie błędów wystarczy).

## 8. Etapy wdrożenia

### Krok 1: Aktualizacja typów
Zaktualizuj plik `src/types.ts` dodając interfejs `ContinuePlanRequest`.

### Krok 2: Implementacja logiki w `planService.ts`
Dodaj metodę `continuePlan`:
-   Implementacja helpera do przesuwania dat w obiekcie `PlanStructure`.
-   Logika pobrania, modyfikacji i zapisu.
-   Integracja z `auditLogService`.

### Krok 3: Utworzenie endpointu API
Utwórz plik `src/pages/api/plans/[id]/continue.ts`:
-   Obsługa metody `POST`.
-   Walidacja parametrów (Zod).
-   Wywołanie serwisu.
-   Obsługa błędów i zwrócenie odpowiedzi JSON.

### Krok 4: Weryfikacja manualna
Przetestuj endpoint używając Bruno/Postman:
-   Wyślij żądanie dla istniejącego planu.
-   Sprawdź, czy zwrócony plan ma poprawnie przesunięte daty w `schedule`.
-   Sprawdź, czy nowy plan pojawił się w bazie danych.

