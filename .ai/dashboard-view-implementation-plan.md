# Plan implementacji widoku Dashboard (Pulpit główny)

## 1. Przegląd
Pulpit główny (Dashboard) jest centralnym punktem aplikacji, widocznym bezpośrednio po zalogowaniu. Jego głównym celem jest prezentacja nadchodzących treningów i motywowanie użytkownika do podjęcia akcji. Widok obsługuje trzy główne stany: dla nowego użytkownika (brak planów), dla aktywnego użytkownika (lista treningów) oraz dla użytkownika, który zakończył cykl treningowy.

## 2. Routing widoku
- **Ścieżka:** `/` (Strona główna)
- **Mechanizm:** Strona Astro (`src/pages/index.astro`) renderująca główny komponent React.
- **Dostęp:** Wymaga autentykacji (chroniona przez middleware/layout).

## 3. Struktura komponentów

```
src/pages/index.astro (Page - Data Fetching)
└── src/components/dashboard/DashboardView.tsx (Main Container - Client Logic)
    ├── src/components/dashboard/DashboardHeader.tsx (Greeting & Date)
    ├── src/components/dashboard/WorkoutList.tsx (List Container)
    │   └── src/components/dashboard/WorkoutCard.tsx (Individual Item)
    └── src/components/dashboard/EmptyDashboard.tsx (Empty States: 'new' | 'completed')
```

## 4. Szczegóły komponentów

### `src/pages/index.astro`
- **Opis:** Strona wejściowa Astro. Odpowiada za pobranie danych z API (SSR) i przekazanie ich do komponentu klienckiego.
- **Główne elementy:** `Layout`, `DashboardView`.
- **Typy:** `DashboardResponse`.
- **Integracja:** Wywołanie serwisu lub fetch do API endpointu w celu pobrania danych początkowych.

### `DashboardView.tsx`
- **Opis:** Główny kontener widoku. Zarządza logiką wyświetlania odpowiedniego stanu (`active`, `new`, `completed`) na podstawie danych.
- **Główne elementy:** `div` (kontener), instrukcje warunkowe renderujące `WorkoutList` lub `EmptyDashboard`.
- **Propsy:**
  - `initialData: DashboardResponse` - dane pobrane przez Astro.
- **Logika:** Sprawdza `user_state` i renderuje odpowiedni sub-komponent.

### `DashboardHeader.tsx`
- **Opis:** Nagłówek wyświetlający powitanie (np. "Witaj z powrotem") oraz aktualną datę.
- **Główne elementy:** `h1`, `p` (data).
- **Propsy:** Brak (może przyjmować nazwę użytkownika, jeśli dostępna w kontekście).

### `WorkoutList.tsx`
- **Opis:** Kontener dla listy nadchodzących treningów.
- **Główne elementy:** `div` (grid/list layout), lista komponentów `WorkoutCard`.
- **Propsy:**
  - `workouts: UpcomingWorkout[]`
- **Logika:** Mapuje tablicę treningów na karty.

### `WorkoutCard.tsx`
- **Opis:** Karta prezentująca pojedynczy trening. Wyróżnia się wizualnie, jeśli jest to trening "następny" (`is_next`).
- **Główne elementy:**
  - `Card` (Shadcn/ui)
  - Informacje: Nazwa planu, Nazwa dnia, Data.
  - Akcja: Przycisk "Rozpocznij trening" (Button z Shadcn/ui) - widoczny i wyróżniony głównie dla treningu oznaczonego jako `is_next`.
- **Propsy:**
  - `workout: UpcomingWorkout`
- **Interakcje:** Kliknięcie przycisku przekierowuje do widoku sesji treningowej.
- **Styl:** Wariant `is_next=true` posiada wyraźniejszy obrys lub tło (np. `border-primary`).

### `EmptyDashboard.tsx`
- **Opis:** Komponent wyświetlany, gdy nie ma aktywnych treningów. Obsługuje dwa warianty treści.
- **Warianty:**
  1. `state === 'new'`: Komunikat powitalny, zachęta do stworzenia pierwszego planu.
  2. `state === 'completed'`: Gratulacje z ukończenia cyklu, zachęta do wygenerowania nowego.
- **Główne elementy:**
  - Ikona/Ilustracja.
  - Tekst nagłówka i opisu.
  - Przyciski akcji: "Wygeneruj plan z AI" (Primary), "Stwórz plan manualnie" (Outline).
- **Propsy:**
  - `state: 'new' | 'completed'`
- **Interakcje:** Przekierowanie do `/plans/generate` lub `/plans/create`.

## 5. Typy

Wykorzystujemy typy zdefiniowane w `src/types.ts`.

```typescript
// Importowane z src/types.ts
import type { DashboardResponse, UpcomingWorkout, DashboardUserState } from '@/types';

// Typy propsów komponentów
export interface DashboardViewProps {
  initialData: DashboardResponse | null;
  error?: string;
}

export interface WorkoutCardProps {
  workout: UpcomingWorkout;
}

export interface EmptyDashboardProps {
  state: 'new' | 'completed';
}
```

## 6. Zarządzanie stanem

- **SSR Data:** Dane są pobierane po stronie serwera w `index.astro` i przekazywane jako propsy. Zapewnia to szybkie pierwsze renderowanie (LCP).
- **Interaktywność:** Komponenty są "wyspami" Reacta (`client:load` nie jest konieczne dla całej strony, ale `DashboardView` może być interaktywny). Ponieważ główną akcją jest nawigacja (linki), skomplikowany stan klienta nie jest wymagany.
- **Formatowanie dat:** Daty przychodzą jako ISO string (`YYYY-MM-DD`). Formatowanie do czytelnej formy (np. "Dziś, 15 Stycznia") odbywa się w komponencie `WorkoutCard` przy użyciu `Intl.DateTimeFormat` lub lekkiej biblioteki (np. `date-fns`), uwzględniając strefę czasową użytkownika.

## 7. Integracja API

- **Endpoint:** `GET /api/dashboard`
- **Sposób pobrania:**
  - W `src/pages/index.astro`: Bezpośrednie wywołanie logiki backendowej (jeśli możliwe) lub `fetch` do lokalnego API.
- **Obsługa odpowiedzi:**
  - Sukces (`200 OK`): Mapowanie JSON do `DashboardResponse`.
  - Błąd (np. 500): Przekazanie flagi błędu do widoku, wyświetlenie komunikatu "Nie udało się załadować pulpitu".

Przykładowa odpowiedź API (zgodna z definicją):
```json
{
  "upcoming_workouts": [
    {
      "plan_id": "uuid...",
      "plan_name": "PPL",
      "day_name": "Push A",
      "date": "2025-11-26",
      "is_next": true
    }
  ],
  "user_state": "active"
}
```

## 8. Interakcje użytkownika

1. **Rozpoczęcie treningu (Główna akcja):**
   - Użytkownik klika "Rozpocznij trening" na karcie z `is_next=true`.
   - **Akcja:** Nawigacja do `/sessions/new?planId={id}&date={date}` (lub dedykowanego widoku startu sesji).
   
2. **Generowanie planu z AI:**
   - Użytkownik klika "Wygeneruj plan z AI" w stanie pustym.
   - **Akcja:** Nawigacja do `/plans/generate`.

3. **Tworzenie manualne:**
   - Użytkownik klika "Stwórz plan manualnie".
   - **Akcja:** Nawigacja do `/plans/create` (lub `/plans/new`).

4. **Przegląd przyszłych treningów:**
   - Użytkownik scrolluje listę treningów. Karty z `is_next=false` mają mniej eksponowany przycisk startu (lub w ogóle, w zależności od decyzji UX - PRD sugeruje uruchomienie treningu na *dany* dzień, więc technicznie można zrobić trening z przyszłości wcześniej).

## 9. Warunki i walidacja

- **Stan `active`:** Wyświetla listę treningów. Jeśli lista jest pusta mimo stanu active (błąd danych), fallback do stanu `completed`.
- **Karta `is_next`:**
  - Musi być wyróżniona (np. inny kolor ramki, cień).
  - Przycisk "Rozpocznij" jest domyślnym przyciskiem (variant="default").
  - Pozostałe karty mogą mieć przycisk w wariancie `secondary` lub `outline`.
- **Sortowanie:** API zwraca posortowane dane, frontend wyświetla je w kolejności otrzymania.

## 10. Obsługa błędów

- **Błąd pobierania danych:** Wyświetlenie komponentu `Alert` (Shadcn/ui) z informacją o problemie z połączeniem i przyciskiem "Spróbuj ponownie" (przeładowanie strony).
- **Brak danych w odpowiedzi:** Jeśli API zwróci pusty obiekt lub null, obsługa jak dla błędu krytycznego.

## 11. Kroki implementacji

1. **Przygotowanie komponentów UI:**
   - Stworzenie `src/components/dashboard/WorkoutCard.tsx` z wykorzystaniem `Card` i `Button` z Shadcn.
   - Stworzenie `src/components/dashboard/EmptyDashboard.tsx` z odpowiednimi komunikatami i linkami.
   
2. **Implementacja logiki widoku:**
   - Stworzenie `src/components/dashboard/DashboardView.tsx`.
   - Zaimplementowanie switcha renderującego na podstawie `user_state`.

3. **Integracja z Astro:**
   - Edycja `src/pages/index.astro`.
   - Dodanie logiki `fetch` do API `/api/dashboard` (używając np. `http://localhost:4321` lub wywołując logikę bezpośrednio, jeśli jest dostępna jako serwis).
   - Przekazanie danych do `<DashboardView client:load />` (lub `client:visible`, chociaż dla Dashboardu `load` jest lepsze).

4. **Stylowanie i dopracowanie:**
   - Dodanie klas Tailwind dla responsywności (Grid dla kart treningowych).
   - Wyróżnienie karty "Next Workout".
   - Weryfikacja formatowania dat.

5. **Weryfikacja:**
   - Sprawdzenie zachowania dla nowego użytkownika (mock data `state: 'new'`).
   - Sprawdzenie zachowania dla aktywnego użytkownika (mock data `state: 'active'`).
   - Sprawdzenie linków nawigacyjnych.

