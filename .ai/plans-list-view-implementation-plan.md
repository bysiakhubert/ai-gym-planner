# Plan implementacji widoku Lista Planów

## 1. Przegląd
Widok "Lista Planów" służy jako centrum zarządzania cyklami treningowymi użytkownika. Pozwala na przeglądanie wszystkich aktywnych (niezarchiwizowanych) planów, ich statusów (aktywny, nadchodzący, zakończony) oraz dat obowiązywania. Umożliwia również szybkie przejście do edycji planu, stworzenie nowego lub zarchiwizowanie starego.

## 2. Routing widoku
- **Ścieżka:** `/plans`
- **Plik Astro:** `src/pages/plans/index.astro`

## 3. Struktura komponentów

```text
src/pages/plans/index.astro (Layout wrap)
└── PlansListContainer (React Client Component)
    ├── PageHeader (Tytuł + Przycisk "Nowy Plan")
    ├── StatusFilter (Opcjonalnie: filtrowanie po statusie - na przyszłość)
    ├── PlansGrid (Siatka kart)
    │   ├── PlanCard (Komponent prezentacyjny)
    │   │   ├── CardHeader (Nazwa, Ikona źródła AI/Manual)
    │   │   ├── CardContent (Daty, Badge Statusu)
    │   │   └── CardActions (DropdownMenu: Edytuj, Archiwizuj)
    │   └── PlanCardSkeleton (Loading state)
    ├── LoadMoreButton (Paginacja)
    ├── EmptyState (Gdy brak planów)
    └── ArchiveConfirmationDialog (Modal potwierdzenia)
```

## 4. Szczegóły komponentów

### `PlansListContainer`
- **Opis:** Główny kontener logiki biznesowej. Zarządza pobieraniem danych, stanem ładowania, paginacją i obsługą akcji archiwizacji.
- **Główne elementy:** `div` (kontener), `PageHeader`, `PlansGrid` lub `EmptyState`.
- **Obsługiwane interakcje:**
  - `onLoadMore`: Pobranie kolejnej strony wyników.
  - `onArchive`: Otwarcie modala potwierdzenia.
  - `onConfirmArchive`: Wywołanie API archiwizacji i odświeżenie listy.
- **Typy:** Zarządza stanem `PlanSummary[]`.

### `PlanCard`
- **Opis:** Karta wyświetlająca podsumowanie pojedynczego planu.
- **Główne elementy:** `Card` (Shadcn), `Badge` (Status), `DropdownMenu` (Akcje).
- **Propsy:**
  - `plan`: `PlanSummary`
  - `onArchive`: `(id: string) => void`
- **Logika:** Oblicza status planu (Active/Upcoming/Completed) na podstawie daty dzisiejszej i `effective_from`/`effective_to`.

### `ArchiveConfirmationDialog`
- **Opis:** Modal z prośbą o potwierdzenie usunięcia/archiwizacji planu.
- **Główne elementy:** `AlertDialog` (Shadcn).
- **Propsy:**
  - `open`: `boolean`
  - `planName`: `string`
  - `onConfirm`: `() => void`
  - `onCancel`: `() => void`
  - `isSubmitting`: `boolean`

### `PageHeader`
- **Opis:** Nagłówek sekcji z tytułem i przyciskiem akcji.
- **Główne elementy:** `h1`, `Button` (link do `/plans/create` lub `/plans/new`).

## 5. Typy

Wymagane będzie wykorzystanie istniejących typów z `src/types.ts` oraz dodanie typów pomocniczych dla widoku.

### Istniejące typy (DTO)
- `PlanSummary`: Podstawowa struktura danych planu.
- `PaginatedPlansResponse`: Odpowiedź z API.
- `PaginationMeta`: Metadane stronicowania.

### Typy ViewModel (Frontend)
```typescript
// Status wyliczany po stronie klienta
export type PlanStatus = 'active' | 'upcoming' | 'completed';

export interface PlanUiModel extends PlanSummary {
  status: PlanStatus;
  isArchiving?: boolean; // Do obsługi stanu ładowania podczas usuwania
}
```

## 6. Zarządzanie stanem

Rekomendowane użycie customowego hooka `usePlansList` wewnątrz `PlansListContainer`.

**Stan hooka:**
- `plans`: `PlanSummary[]` - lista załadowanych planów.
- `pagination`: `PaginationMeta` - stan paginacji (offset, total, has_more).
- `isLoading`: `boolean` - ładowanie początkowe.
- `isLoadingMore`: `boolean` - ładowanie kolejnej strony.
- `error`: `Error | null`.
- `planToArchive`: `PlanSummary | null` - plan wybrany do usunięcia (steruje modalem).

**Metody:**
- `fetchPlans(offset: number)`: Pobieranie danych.
- `loadMore()`: Inkrementacja offsetu i pobranie.
- `archivePlan(id: string)`: Wywołanie API DELETE.

## 7. Integracja API

### Lista Planów
- **Endpoint:** `GET /api/plans`
- **Parametry:**
  - `limit`: 20
  - `offset`: dynamicznie (0, 20, 40...)
  - `sort`: `effective_from`
  - `order`: `desc`
- **Odpowiedź:** `PaginatedPlansResponse`

### Archiwizacja Planu
- **Endpoint:** `DELETE /api/plans/[id]`
- **Odpowiedź:** `ArchivePlanResponse`
- **Zachowanie:** Po sukcesie usunięcie elementu z lokalnego stanu lub ponowne pobranie listy.

## 8. Interakcje użytkownika

1. **Wejście na stronę:** Wyświetlenie skeletonów, pobranie pierwszej strony planów.
2. **Przewijanie/Przegląd:** Użytkownik widzi statusy planów (kolory badge'y: Zielony-Aktywny, Szary-Zakończony, Niebieski-Nadchodzący).
3. **Załaduj więcej:** Kliknięcie przycisku pod listą pobiera kolejne 20 planów i dokleja do listy.
4. **Kliknięcie w kartę/tytuł:** Przekierowanie do widoku szczegółów `/plans/[id]`.
5. **Menu kontekstowe (trzy kropki):**
   - **Edytuj:** Przekierowanie do `/plans/[id]/edit`.
   - **Archiwizuj:** Otwiera modal.
6. **Potwierdzenie archiwizacji:** Wywołuje API, pokazuje spinner na przycisku potwierdzenia, zamyka modal, usuwa plan z listy, pokazuje Toast "Plan zarchiwizowany".

## 9. Warunki i walidacja

- **Obliczanie statusu:**
  - `Today < effective_from` -> **Upcoming**
  - `Today > effective_to` -> **Completed**
  - `effective_from <= Today <= effective_to` -> **Active**
  *Uwaga: Należy użyć biblioteki `date-fns` lub natywnego `Date` z uwzględnieniem strefy czasowej użytkownika (local time), aby uniknąć błędów przesunięcia o jeden dzień.*

## 10. Obsługa błędów

- **Błąd pobierania listy:** Wyświetlenie komunikatu błędu z przyciskiem "Spróbuj ponownie".
- **Błąd archiwizacji:** Toast z informacją o błędzie ("Nie udało się zarchiwizować planu"), modal pozostaje otwarty lub zamyka się (zależnie od UX, bezpieczniej zostawić otwarty).
- **Pusta lista:** Komponent `EmptyState` zachęcający do stworzenia pierwszego planu (duży przycisk CTA).

## 11. Kroki implementacji

1. **Setup:** Stworzenie pliku `src/pages/plans/index.astro` i podstawowej struktury folderów dla komponentów React (`src/components/plans/list/`).
2. **API Client:** Utworzenie funkcji pomocniczych w `src/lib/api/plans.ts` do fetchowania listy i usuwania planu (używając `fetch`).
3. **Hook:** Implementacja `usePlansList` do zarządzania stanem i logiką pobierania.
4. **Komponenty UI - Karta:** Implementacja `PlanCard` z logiką statusów i użyciem komponentów Shadcn (Card, Badge, DropdownMenu).
5. **Komponenty UI - Kontener:** Implementacja `PlansListContainer` składającego całość, dodanie obsługi `Load More`.
6. **Interakcja - Archiwizacja:** Dodanie `AlertDialog` i podpięcie go pod akcję usuwania.
7. **Integracja:** Osadzenie kontenera w stronie Astro.
8. **Stylowanie:** Dopracowanie responsywności (Grid: 1 kolumna mobile, 2 tablet, 3 desktop).

