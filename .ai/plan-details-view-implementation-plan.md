# Plan implementacji widoku Szczegóły Planu

## 1. Przegląd
Widok szczegółów planu służy do prezentacji pełnej struktury wybranego planu treningowego w trybie "tylko do odczytu". Jest to kluczowy ekran pozwalający użytkownikowi zapoznać się z harmonogramem treningów. Dodatkowo, widok ten pełni funkcję punktu startowego do generowania kolejnego cyklu treningowego po zakończeniu obecnego (zgodnie z US-011), wykorzystując AI do analizy postępów.

## 2. Routing widoku
- **Ścieżka:** `/plans/[id]`
- **Plik Astro:** `src/pages/plans/[id]/index.astro`
- **Dostęp:** Wymaga zalogowanego użytkownika (zabezpieczone przez middleware).

## 3. Struktura komponentów

```text
src/pages/plans/[id]/index.astro (Page Wrapper - Server Side Fetching)
└── PlanDetailsView (Client Component - React)
    ├── SafetyDisclaimer (Komponent istniejący)
    ├── PlanHeader (Nagłówek, daty, przyciski akcji)
    ├── PlanInfo (Siatka z metadanymi: cel, system, czas trwania)
    ├── PlanScheduleList (Lista dni treningowych)
    │   └── WorkoutDayCard (Karta pojedynczego dnia)
    │       └── ExerciseList (Lista ćwiczeń w dniu)
    │           └── ExerciseItem (Wiersz ćwiczenia: serie, powtórzenia, ciężar)
    └── GenerateNextCycleDialog (Modal generowania kolejnego cyklu)
        ├── GenerationForm (Krok 1: Parametry)
        ├── LoadingState (Krok 2: Generowanie)
        └── CyclePreview (Krok 3: Podgląd i akceptacja)
            ├── ProgressionSummary (Lista zmian)
            └── PlanSummaryPreview (Skrócony podgląd struktury)
```

## 4. Szczegóły komponentów

### `PlanDetailsView` (Kontener)
- **Opis:** Główny komponent zarządzający stanem widoku po stronie klienta.
- **Odpowiedzialność:** Inicjalizacja modala generowania, obsługa akcji zapisu nowego planu.
- **Propsy:** `initialPlan: PlanResponse`.

### `PlanHeader`
- **Opis:** Wyświetla nazwę planu, status (Aktywny/Zakończony) oraz przyciski akcji.
- **Elementy:** Tytuł, Badge statusu, Przycisk "Edytuj", Przycisk "Generuj kolejny cykl".
- **Warunki widoczności:**
  - "Generuj kolejny cykl": Widoczny TYLKO, gdy data `effective_to` jest wcześniejsza niż data dzisiejsza (plan zakończony).
- **Interakcje:** Otwarcie modala generowania, przekierowanie do edycji.

### `PlanScheduleList`
- **Opis:** Iteruje po obiekcie `schedule` z planu.
- **Logika:** Musi przekonwertować obiekt `schedule` (mapa dat) na tablicę i posortować ją chronologicznie przed wyrenderowaniem.
- **Elementy:** Lista komponentów `WorkoutDayCard`.

### `GenerateNextCycleDialog`
- **Opis:** Kreator generowania nowego cyklu oparty na komponencie `Dialog` z Shadcn/ui.
- **Stany (Wizard):**
  1.  **Formularz:** Inputy dla `cycle_duration_weeks` (domyślnie tyle co poprzedni) i `notes`.
  2.  **Loading:** Spinner i komunikat o analizie historii przez AI.
  3.  **Preview:** Wyświetlenie `GenerateNextCycleResponse`. Sekcja `progression_summary` (lista zmian w punktach) oraz przycisk "Zapisz i rozpocznij nowy cykl".
- **Walidacja:** `cycle_duration_weeks` musi być liczbą całkowitą z zakresu 1-12.

## 5. Typy

Wykorzystujemy typy zdefiniowane w `src/types.ts`.

**Dla `PlanScheduleList`:**
```typescript
type SortedDay = {
  date: string; // YYYY-MM-DD
  day: WorkoutDay;
};
```

**Stan modala generowania:**
```typescript
type GenerationStep = 'input' | 'generating' | 'preview';

interface GenerationFormValues {
  cycle_duration_weeks: number;
  notes: string;
}
```

## 6. Zarządzanie stanem

Stan jest lokalny w komponencie `PlanDetailsView` (lub wydzielony do hooka `useGenerateNextCycle`):

- `isGenerateModalOpen`: boolean - czy modal jest otwarty.
- `generationStep`: GenerationStep - aktualny krok w modalu.
- `previewData`: GenerateNextCycleResponse | null - dane zwrócone przez API.
- `isSaving`: boolean - czy trwa zapisywanie zaakceptowanego planu.

## 7. Integracja API

1.  **Generowanie podglądu (Krok 2 w modalu):**
    -   **Endpoint:** `POST /api/plans/:id/generate-next`
    -   **Payload:** `{ cycle_duration_weeks: number, notes?: string }`
    -   **Response:** `GenerateNextCycleResponse`

2.  **Zapisywanie nowego planu (Krok 3 w modalu - Akceptacja):**
    -   **Endpoint:** `POST /api/plans` (Standardowe tworzenie planu)
    -   **Payload:** `CreatePlanRequest` skonstruowany na podstawie danych z `previewData`.
        -   `name`: `previewData.plan.name`
        -   `effective_from`: `previewData.plan.effective_from`
        -   `effective_to`: `previewData.plan.effective_to`
        -   `plan`: `{ schedule: previewData.plan.schedule }`
        -   `source`: `"ai"`
        -   `preferences`: Obiekt preferences z obecnego planu (zaktualizowany o nową długość cyklu).

## 8. Interakcje użytkownika

1.  **Przegląd planu:** Użytkownik przewija listę dni.
2.  **Generowanie kolejnego cyklu:**
    -   Użytkownik klika "Generuj kolejny cykl" (dostępne tylko po zakończeniu planu).
    -   Wypełnia formularz (np. zmieniając długość cyklu na 8 tygodni).
    -   Zatwierdza -> Pokazuje się loader.
    -   AI zwraca propozycję -> Użytkownik widzi: "Zwiększono ciężar w wyciskaniu o 2.5kg", "Dodano serię do przysiadów".
    -   Użytkownik klika "Zaakceptuj".
    -   System tworzy nowy plan i przekierowuje użytkownika do listy planów lub szczegółów nowego planu.

## 9. Warunki i walidacja

-   **Dostępność przycisku generowania:** `currentDate > plan.effective_to`.
-   **Walidacja formularza generowania:**
    -   `cycle_duration_weeks`: min 1, max 12.
    -   `notes`: max 500 znaków.
-   **Walidacja API (Generate Next):**
    -   Sprawdzenie czy istnieją sesje treningowe dla danego planu (błąd 400 jeśli brak historii).

## 10. Obsługa błędów

-   **Brak historii treningowej (400 Bad Request przy generowaniu):**
    -   Wyświetlić w modalu jasny komunikat: "Nie można wygenerować progresji, ponieważ nie odnotowano żadnych sesji treningowych dla tego planu. Rozważ ręczne utworzenie nowego planu lub edycję obecnego."
-   **Błąd serwera/AI (500):**
    -   Toast z informacją "Wystąpił problem z generowaniem planu. Spróbuj ponownie później."
-   **Brak planu (404):**
    -   Strona 404 Astro.

## 11. Kroki implementacji

1.  **Setup strony Astro:** Utworzenie/aktualizacja `src/pages/plans/[id]/index.astro` do pobierania danych planu i renderowania głównego komponentu React.
2.  **Komponenty prezentacyjne:** Implementacja `WorkoutDayCard`, `ExerciseList` i `PlanScheduleList` do wyświetlania struktury planu.
3.  **Główny widok:** Implementacja `PlanDetailsView` i `PlanHeader` z logiką wyświetlania przycisków.
4.  **Logika API:** Dodanie funkcji `generateNextCycle` w `src/lib/api/plans.ts` (wrapper na fetch).
5.  **Modal generowania (UI):** Implementacja `GenerateNextCycleDialog` z formularzem i stanami (form, loading, preview).
6.  **Integracja "Generate Next":** Podpięcie formularza pod endpoint API i wyświetlenie wyników (`progression_summary`).
7.  **Zapis nowego planu:** Implementacja logiki konwersji podglądu na `CreatePlanRequest` i wysłanie do API.
8.  **Obsługa błędów i walidacja:** Dodanie obsługi braku sesji (komunikaty błędów) i walidacji formularza.

