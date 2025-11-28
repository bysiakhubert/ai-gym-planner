# API Endpoint Implementation Plan: Get Plan Details

## 1. Przegląd punktu końcowego

Punkt końcowy `GET /api/plans/:id` służy do pobierania pełnych szczegółów konkretnego planu treningowego. Umożliwia interfejsowi użytkownika wyświetlenie widoku szczegółowego planu, w tym harmonogramu treningów, preferencji AI oraz metadanych. Dostęp do zasobu jest ograniczony do właściciela planu (zalogowanego użytkownika).

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/plans/[id]`
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter): Prawidłowy identyfikator UUID planu.
  - **Opcjonalne:** Brak.
- **Request Body:** Brak.

## 3. Wykorzystywane typy

Implementacja będzie korzystać z następujących definicji typów z `src/types.ts`:

- **DTO Odpowiedzi:** `PlanResponse` - pełna struktura zwracana do klienta.
- **Encje Bazy Danych:** `PlanEntity` (alias dla `Tables<"plans">`).
- **Obsługa błędów:** `ApiError` - standardowy format błędów.

## 3. Szczegóły odpowiedzi

### Sukces (200 OK)

Zwraca obiekt JSON zgodny z interfejsem `PlanResponse`.

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Plan Name",
  "effective_from": "ISO8601",
  "effective_to": "ISO8601",
  "source": "ai",
  "prompt": "...",
  "preferences": { ... },
  "plan": { "schedule": { ... } },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Błędy

- **400 Bad Request:** Nieprawidłowy format ID (nie jest UUID).
- **401 Unauthorized:** Brak sesji użytkownika (obsługiwane globalnie lub przez sprawdzenie `locals`).
- **404 Not Found:** Plan nie istnieje lub użytkownik nie ma do niego dostępu (RLS).
- **500 Internal Server Error:** Błąd połączenia z bazą danych lub błąd serwera.

## 4. Przepływ danych

1.  **Request:** Astro odbiera żądanie `GET` na ścieżce `/api/plans/[id]`.
2.  **Middleware:** Weryfikuje sesję użytkownika i udostępnia klienta Supabase w `context.locals`.
3.  **Endpoint Handler:**
    *   Pobiera `id` z parametrów ścieżki.
    *   Waliduje format `id` używając Zod.
4.  **Service Layer (`PlansService`):**
    *   Wywołuje metodę `getPlanById`.
    *   Wykonuje zapytanie do Supabase: `from('plans').select('*').eq('id', id).single()`.
5.  **Database (Supabase):**
    *   Sprawdza polityki RLS (czy `user_id` zgadza się z `auth.uid()`).
    *   Zwraca dane planu lub błąd.
6.  **Endpoint Handler:**
    *   Mapuje wynik na `PlanResponse`.
    *   Zwraca odpowiedź JSON.

## 5. Względy bezpieczeństwa

- **Uwierzytelnianie:** Wymagane jest poprawne ciasteczko sesji Supabase. Klient Supabase w `locals` musi być zainicjalizowany z kontekstem użytkownika.
- **Autoryzacja (RLS):** Baza danych wymusza dostęp tylko do własnych rekordów. Próba dostępu do cudzego planu zwróci pusty wynik (traktowany jako 404), co zapobiega enumeracji ID.
- **Walidacja danych:** `id` jest ściśle walidowane jako UUIDv4, aby zapobiec próbom wstrzyknięcia nieprawidłowych danych do zapytań.

## 6. Obsługa błędów

Błędy będą obsługiwane przy użyciu bloku `try-catch` w handlerze endpointu:

- **ZodError:** Mapowany na 400 Bad Request z komunikatem "Invalid plan ID".
- **PGRST116 (Supabase returning 0 rows):** Mapowany na 404 Not Found z komunikatem "Plan not found".
- **Inne błędy:** Logowane na serwerze (`console.error`), zwracane jako 500 Internal Server Error z ogólnym komunikatem.

## 7. Rozważania dotyczące wydajności

- **Indeksowanie:** Tabela `plans` posiada klucz główny na `id`, co zapewnia szybkie wyszukiwanie `O(1)`.
- **Payload:** Pobierane są pełne dane JSON (`plan`, `preferences`). Dla bardzo dużych planów może to generować większy transfer, ale jest to oczekiwane w widoku szczegółowym (w przeciwieństwie do widoku listy).
- **Single Query:** Operacja wymaga tylko jednego zapytania do bazy danych.

## 8. Etapy wdrożenia

### Krok 1: Utworzenie Serwisu Planów
Stwórz plik `src/lib/services/plans.service.ts` (jeśli nie istnieje) i dodaj metodę pobierania.

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types'; // Dostosuj ścieżkę importu
import type { PlanResponse } from '../../types';

export class PlansService {
  static async getPlanById(supabase: SupabaseClient<Database>, id: string): Promise<PlanResponse | null> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found code
      throw error;
    }

    return data as PlanResponse;
  }
}
```

### Krok 2: Utworzenie Endpointu API
Stwórz plik `src/pages/api/plans/[id].ts`.

1.  Skonfiguruj endpoint jako `prerender = false`.
2.  Zaimplementuj handler `GET`.
3.  Dodaj walidację UUID przy pomocy `zod`.
4.  Wywołaj `PlansService`.
5.  Zwróć odpowiednie kody statusu.

```typescript
export const prerender = false;

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { PlansService } from '../../../lib/services/plans.service'; // Dostosuj ścieżkę
import type { ApiError } from '../../../types';

export const GET: APIRoute = async ({ params, locals }) => {
  // 1. Walidacja ID
  const idSchema = z.string().uuid();
  const validation = idSchema.safeParse(params.id);

  if (!validation.success) {
    return new Response(JSON.stringify({
      error: 'ValidationError',
      message: 'Invalid plan ID format'
    } as ApiError), { status: 400 });
  }

  try {
    // 2. Pobranie danych
    const plan = await PlansService.getPlanById(locals.supabase, validation.data);

    if (!plan) {
      return new Response(JSON.stringify({
        error: 'NotFound',
        message: 'Plan not found'
      } as ApiError), { status: 404 });
    }

    // 3. Sukces
    return new Response(JSON.stringify(plan), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching plan:', error);
    return new Response(JSON.stringify({
      error: 'InternalServerError',
      message: 'An unexpected error occurred'
    } as ApiError), { status: 500 });
  }
};
```

### Krok 3: Weryfikacja
1.  Uruchom serwer deweloperski.
2.  Wykonaj żądanie do istniejącego planu (zwróć uwagę na nagłówek autoryzacji/cookie).
3.  Wykonaj żądanie z nieprawidłowym UUID.
4.  Wykonaj żądanie do nieistniejącego ID.

