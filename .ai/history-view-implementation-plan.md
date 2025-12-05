# Plan implementacji widoku Historia Treningów

## 1. Przegląd

Widok Historii Treningów (`/history`) służy do prezentacji chronologicznej listy zakończonych sesji treningowych użytkownika. Stanowi kluczowy element śledzenia postępów, pozwalając użytkownikowi na wgląd w zrealizowane jednostki treningowe, ich czas trwania oraz skuteczność (liczba wykonanych serii). W wersji MVP widok oferuje listę podsumowań z możliwością paginacji.

## 2. Routing widoku

- **Ścieżka:** `/history`
- **Dostęp:** Wymaga zalogowanego użytkownika (chronione przez middleware/layout).

## 3. Struktura komponentów

Widok zostanie zbudowany przy użyciu Astro (jako kontener strony) oraz React (dla interaktywnej listy i zarządzania stanem).

```text
src/pages/history/
└── index.astro                # Strona główna Astro, layout aplikacji

src/components/history/
├── HistoryView.tsx            # Główny kontener logiczny (Client Component)
├── HistoryList.tsx            # Komponent prezentacyjny listy
├── HistorySessionCard.tsx     # Pojedyncza karta sesji
└── EmptyHistoryState.tsx      # Widok braku historii
```

## 4. Szczegóły komponentów

### 1. `src/pages/history/index.astro`
- **Opis:** Główny punkt wejścia dla routingu. Renderuje `Layout` aplikacji i osadza komponent `HistoryView`.
- **Główne elementy:**
  - `<Layout>` (istniejący layout aplikacji)
  - `<HistoryView client:load />` (hydratacja klienta wymagana do pobierania danych)

### 2. `HistoryView` (`src/components/history/HistoryView.tsx`)
- **Opis:** Komponent typu "Smart Container". Odpowiada za pobieranie danych z API, obsługę stanu ładowania, błędów i paginacji.
- **Główne elementy:**
  - Hook `useHistorySessions` (do implementacji).
  - Warunkowe renderowanie:
    - Loader (Skeletony) podczas pierwszego ładowania.
    - `EmptyHistoryState` gdy brak wyników.
    - `HistoryList` gdy są dane.
    - Przycisk "Załaduj więcej" (Button z shadcn/ui).
- **Obsługiwane zdarzenia:**
  - `onLoadMore`: wywołanie funkcji pobierającej kolejną stronę wyników.

### 3. `HistoryList` (`src/components/history/HistoryList.tsx`)
- **Opis:** Komponent prezentacyjny (Dumb Component). Renderuje listę kart.
- **Props:**
  - `sessions: SessionSummary[]`
- **Główne elementy:**
  - Kontener `flex-col` z odstępami (`gap-4`).
  - Mapowanie po tablicy `sessions` do komponentów `HistorySessionCard`.

### 4. `HistorySessionCard` (`src/components/history/HistorySessionCard.tsx`)
- **Opis:** Karta prezentująca podsumowanie pojedynczej sesji treningowej.
- **Props:**
  - `session: SessionSummary`
- **Główne elementy:**
  - `Card` (shadcn/ui): Kontener.
  - `CardHeader`: Data treningu (sformatowana), Nazwa Dnia (np. "Push Day").
  - `CardContent`:
    - Nazwa Planu.
    - Statystyki: Czas trwania (w minutach), Ukończone serie / Wszystkie serie.
    - Ikony (np. zegar, checkmark) dla lepszego UX.

### 5. `EmptyHistoryState` (`src/components/history/EmptyHistoryState.tsx`)
- **Opis:** Wyświetlany, gdy użytkownik nie ukończył jeszcze żadnego treningu.
- **Główne elementy:**
  - Ikona/Ilustracja (np. `History` z lucide-react).
  - Tekst zachęcający do rozpoczęcia treningu.
  - Przycisk (Link) kierujący do Dashboardu lub rozpoczęcia nowego treningu.

## 5. Typy

Wykorzystamy istniejące typy zdefiniowane w `src/types.ts`. Nie ma potrzeby tworzenia nowych definicji API, ale warto zdefiniować propsy komponentów.

Wymagane importy:
- `SessionSummary` (z `src/types.ts`)
- `PaginatedSessionsResponse` (z `src/types.ts`)
- `ListSessionsQueryParams` (z `src/types.ts`)

## 6. Zarządzanie stanem

Zarządzanie stanem zostanie wyodrębnione do niestandardowego hooka: `useHistorySessions`.

### Hook: `useHistorySessions` (`src/hooks/useHistorySessions.ts`)

**Stan:**
- `sessions`: `SessionSummary[]` - akumulowana lista pobranych sesji.
- `isLoading`: `boolean` - status pierwszego ładowania.
- `isLoadingMore`: `boolean` - status doczytywania kolejnych stron.
- `error`: `string | null` - ewentualny komunikat błędu.
- `pagination`: `PaginationMeta` - metadane paginacji (offset, total, has_more).

**Funkcje:**
- `loadSessions(reset?: boolean)`: Główna funkcja asynchroniczna.
  - Jeśli `reset = true`, czyści listę i pobiera od offsetu 0.
  - Jeśli `reset = false`, pobiera od bieżącego offsetu + limit.
- `loadMore()`: Wrapper na `loadSessions(false)`.

## 7. Integracja API

Integracja nastąpi poprzez istniejący klient API w `src/lib/api/sessions.ts`.

**Endpoint:** `GET /api/sessions`
**Funkcja klienta:** `fetchSessions(params)`

**Parametry zapytania:**
```typescript
const params: ListSessionsQueryParams = {
  completed: true,       // Tylko zakończone sesje
  limit: 20,             // Ilość na stronę
  offset: currentOffset, // Paginacja
  sort: "started_at",    // Data rozpoczęcia
  order: "desc"          // Od najnowszych
};
```

**Typ odpowiedzi:** `Promise<PaginatedSessionsResponse>`

## 8. Interakcje użytkownika

1. **Wejście na widok:** Automatyczne pobranie pierwszej partii danych (ostatnie 20 treningów). Wyświetlenie szkieletów (Skeletons) podczas ładowania.
2. **Przewijanie listy:** Użytkownik przegląda karty z podsumowaniem.
3. **Załadowanie kolejnych:** Jeśli `has_more` jest `true`, na dole listy widoczny jest przycisk "Pokaż starsze treningi". Kliknięcie powoduje zmianę stanu przycisku na "Ładowanie..." i doklejenie nowych wyników do listy.
4. **Brak wyników:** Jeśli lista jest pusta, użytkownik widzi ekran zachęty do działania.

## 9. Warunki i walidacja

- **Status ukończenia:** Interfejs musi wymuszać filtr `completed: true` w zapytaniu do API, aby nie pokazywać sesji w trakcie (aktywnych).
- **Paginacja:** Przycisk "Pokaż starsze" jest widoczny tylko, gdy `pagination.has_more` jest `true`.
- **Formatowanie:** Daty powinny być sformatowane zgodnie z lokalizacją polską (`pl-PL`), np. "15 stycznia 2025".

## 10. Obsługa błędów

- **Błąd pobierania API:** Wyświetlenie komponentu `Alert` (variant destructive) z komunikatem błędu i przyciskiem "Spróbuj ponownie".
- **Błąd krytyczny:** Użycie Error Boundary (opcjonalnie, jeśli wdrożone w projekcie) lub prosty fallback w komponencie `HistoryView`.

## 11. Kroki implementacji

1.  **Przygotowanie hooka:**
    - Utwórz plik `src/hooks/useHistorySessions.ts`.
    - Zaimplementuj logikę pobierania danych przy użyciu `fetchSessions` z odpowiednimi parametrami filtrowania i paginacji.

2.  **Stworzenie komponentów prezentacyjnych:**
    - Utwórz `HistorySessionCard.tsx` - ostylowanie karty z danymi z `SessionSummary`.
    - Utwórz `EmptyHistoryState.tsx` - widok dla pustej listy.
    - Utwórz `HistoryList.tsx` - lista renderująca karty.

3.  **Implementacja głównego widoku:**
    - Utwórz `HistoryView.tsx`.
    - Połącz hooka `useHistorySessions`.
    - Zaimplementuj obsługę stanów (loading, error, data).
    - Dodaj przycisk paginacji.

4.  **Utworzenie strony Astro:**
    - Utwórz `src/pages/history/index.astro`.
    - Dodaj importy i osadź `HistoryView`.

5.  **Weryfikacja:**
    - Sprawdź działanie paginacji (wymagane posiadanie >20 sesji w bazie lub zmniejszenie limitu testowo).
    - Sprawdź wygląd empty state.
    - Zweryfikuj poprawność wyświetlanych danych (czas trwania, liczba serii).
