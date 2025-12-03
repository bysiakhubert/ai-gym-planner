# API Endpoint Implementation Plan: Archive Plan (Soft Delete)

## 1. Przegląd punktu końcowego

Punkt końcowy `DELETE /api/plans/:id` służy do archiwizacji (miękkiego usuwania) planu treningowego. Operacja ta nie usuwa fizycznie rekordu z bazy danych, lecz ustawia flagę `archived` na `true`. Dzięki temu historia treningów (sesje) powiązane z tym planem pozostają dostępne dla użytkownika. Każda operacja archiwizacji jest rejestrowana w dzienniku audytowym.

## 2. Szczegóły żądania

- **Metoda HTTP:** `DELETE`
- **Struktura URL:** `/api/plans/[id]`
- **Parametry:**
  - **Wymagane:**
    - `id` (Path Parameter): UUID planu do zarchiwizowania.
  - **Opcjonalne:** Brak.
- **Request Body:** Brak.

## 3. Wykorzystywane typy

Należy wykorzystać istniejące definicje z `src/types.ts` oraz typy bazodanowe.

- **Response DTO:** `ArchivePlanResponse`
  ```typescript
  export interface ArchivePlanResponse {
    message: string;
    id: string;
  }
  ```
- **Audit Event:** `AuditEventType` ("plan_deleted").
- **Database:** `TablesUpdate<"plans">` (ustawienie `archived: true`).

## 3. Szczegóły odpowiedzi

- **Sukces (200 OK):**
  Zwraca obiekt `ArchivePlanResponse`.
  ```json
  {
    "message": "Plan archived successfully",
    "id": "uuid-planu"
  }
  ```

- **Błędy:**
  - **400 Bad Request:** Nieprawidłowy format UUID.
  - **401 Unauthorized:** Użytkownik nie jest zalogowany.
  - **404 Not Found:** Plan nie istnieje lub nie należy do użytkownika.
  - **500 Internal Server Error:** Błąd serwera lub bazy danych.

## 4. Przepływ danych

1.  **Klient** wysyła żądanie `DELETE` z ID planu.
2.  **API Route (`src/pages/api/plans/[id].ts`)**:
    *   Weryfikuje sesję użytkownika (Supabase Auth).
    *   Waliduje poprawność UUID przy użyciu `zod`.
    *   Przekazuje żądanie do `planService`.
3.  **Service (`src/lib/services/planService.ts`)**:
    *   Wywołuje klienta Supabase, aby zaktualizować plan: `UPDATE plans SET archived = true WHERE id = :id AND user_id = :userId`.
    *   Sprawdza, czy jakikolwiek wiersz został zmodyfikowany. Jeśli nie – rzuca wyjątek oznaczający brak zasobu (który API zamieni na 404).
    *   Wywołuje `auditLogService` w celu zapisania zdarzenia `plan_deleted`.
4.  **Database**:
    *   Wykonuje aktualizację (z uwzględnieniem RLS).
    *   Zapisuje log audytowy.
5.  **API Route**: Zwraca odpowiedź JSON do klienta.

## 5. Względy bezpieczeństwa

-   **Uwierzytelnianie:** Sprawdzenie obecności `locals.user`.
-   **Autoryzacja (RLS):** Baza danych Supabase posiada polityki RLS (`Users can update own plans`), które uniemożliwiają modyfikację planów należących do innych użytkowników.
-   **Walidacja:** Parametr `id` jest walidowany pod kątem bycia poprawnym UUID v4, co zapobiega prostym błędom i potencjalnym atakom typu injection (choć parametryzowane zapytania Supabase to główna linia obrony).

## 6. Obsługa błędów

| Scenariusz | Kod HTTP | Komunikat (przykład) | Działanie |
| :--- | :--- | :--- | :--- |
| Niepoprawne ID (nie UUID) | 400 | "Invalid plan ID" | Zwróć błąd walidacji |
| Brak tokenu sesji | 401 | "Unauthorized" | Przerwij przetwarzanie |
| Plan nie znaleziony (lub brak uprawnień) | 404 | "Plan not found" | Zwróć błąd standardowy |
| Błąd bazy danych | 500 | "Internal Server Error" | Loguj błąd na serwerze, zwróć generyczny komunikat |

## 7. Rozważania dotyczące wydajności

-   Operacja jest prostym `UPDATE` na kluczu głównym (`id`), więc jest bardzo szybka (O(1)).
-   Logowanie audytowe jest operacją zapisu (`INSERT`), która powinna być wykonana w tej samej transakcji lub asynchronicznie, aby nie blokować odpowiedzi (w MVP akceptowalne jest wykonanie sekwencyjne `await`).
-   Endpoint korzysta z `prerender = false` (SSR), co jest wymagane dla dynamicznych operacji API.

## 8. Etapy wdrożenia

### Krok 1: Aktualizacja serwisu planów
Edytuj `src/lib/services/planService.ts`.
-   Dodaj metodę `archivePlan(id: string, userId: string): Promise<void>`.
-   Zaimplementuj logikę aktualizacji pola `archived`.
-   Dodaj obsługę błędu, jeśli plan nie zostanie znaleziony (brak zaktualizowanych wierszy).
-   Zintegruj `auditLogService.logEvent` z typem `plan_deleted`.

### Krok 2: Implementacja endpointu API
Edytuj `src/pages/api/plans/[id].ts`.
-   Dodaj eksportowaną funkcję `DELETE` (handler).
-   Zaimplementuj pobieranie `id` z `params`.
-   Dodaj walidację UUID (np. przy pomocy `z.string().uuid()`).
-   Wywołaj `planService.archivePlan`.
-   Zwróć odpowiedź `ArchivePlanResponse`.
-   Otocz logikę blokiem `try-catch` do obsługi błędów.

### Krok 3: Weryfikacja
-   Sprawdź, czy archiwizacja planu, który istnieje i należy do użytkownika, zwraca 200.
-   Sprawdź, czy archiwizacja planu innego użytkownika zwraca 404 (dzięki RLS).
-   Sprawdź, czy podanie błędnego UUID zwraca 400.
-   Zweryfikuj w bazie danych (tabela `audit_events`), czy zdarzenie zostało zalogowane.

