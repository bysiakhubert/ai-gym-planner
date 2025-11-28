# Plan implementacji widoku Edycji Planu (Plan Editor)

## 1. Przegląd
Widok edycji planu (`PlanEditorView`) jest kluczowym elementem modułu planów treningowych, realizującym wymaganie **F-008**. Umożliwia użytkownikowi pełną modyfikację istniejącego planu treningowego, w tym zmianę metadanych (nazwa, daty) oraz struktury harmonogramu (dodawanie/usuwanie dni, ćwiczeń i serii). Ze względu na strukturę danych API (mapa dat), widok wymaga transformacji danych do formatu przyjaznego dla formularzy (tablica) i z powrotem.

## 2. Routing widoku
- **Ścieżka:** `/plans/[id]/edit`
- **Plik strony:** `src/pages/plans/[id]/edit.astro`

## 3. Struktura komponentów
Drzewo komponentów zaprojektowane z wykorzystaniem `react-hook-form` i `Shadcn/ui`.

```text
src/pages/plans/[id]/edit.astro (Astro Page - SSR Layout)
└── PlanEditorView.tsx (React Container)
    └── FormProvider (RHF Context)
        ├── PageHeader (Tytuł, Akcje: Zapisz/Anuluj)
        ├── PlanGeneralInfo (Sekcja: Nazwa, Daty obowiązywania)
        └── PlanScheduleEditor (Sekcja: Harmonogram)
            └── DayList (FieldArray: days)
                └── DayCard (Komponent dnia)
                    ├── DayHeader (Data, Nazwa dnia, Akcje dnia)
                    └── ExerciseList (FieldArray: exercises)
                        └── ExerciseCard (Komponent ćwiczenia)
                            ├── ExerciseHeader (Nazwa ćwiczenia, Akcje)
                            └── SetList (FieldArray: sets)
                                └── SetRow (Wiersz serii: Reps, Weight, Rest)
```

## 4. Szczegóły komponentów

### `PlanEditorView` (Container)
- **Opis:** Główny kontener odpowiedzialny za pobranie danych (fetch), transformację `Map -> Array`, obsługę formularza i zapis.
- **Główne elementy:** `useForm`, `usePlan` (hook), `<form>`, `Toaster`.
- **Obsługiwane interakcje:** Submit formularza (Zapisz), Reset formularza (Anuluj).
- **Obsługiwana walidacja:** Walidacja `zodResolver` dla całego schematu.
- **Typy:** `PlanResponse` (API), `PlanEditorFormValues` (Form).
- **Propsy:** `planId: string`.

### `PlanGeneralInfo`
- **Opis:** Edycja podstawowych informacji o planie.
- **Główne elementy:**
  - `Input` (Label: "Nazwa planu").
  - `DatePicker` z zakresem lub dwa oddzielne `DatePicker` (Label: "Obowiązuje od", "Obowiązuje do").
- **Typy:** Pola `name`, `effective_from`, `effective_to`.

### `DayCard`
- **Opis:** Reprezentuje jeden dzień treningowy w harmonogramie.
- **Główne elementy:**
  - `Input` (Nazwa dnia, np. "Push A").
  - `DatePicker` (Data konkretnego treningu).
  - Przycisk `Button` (wariant `destructive`, ikona kosza) do usuwania dnia.
- **Obsługiwana walidacja:** Unikalność daty (sprawdzana w kontekście listy dni).
- **Propsy:** `index: number` (indeks w `fields` tablicy dni).

### `ExerciseCard`
- **Opis:** Kontener na ćwiczenie wewnątrz dnia.
- **Główne elementy:**
  - `Input` (Nazwa ćwiczenia).
  - Przycisk "Dodaj serię".
  - Lista komponentów `SetRow`.
- **Propsy:** `dayIndex: number`, `exerciseIndex: number`.

### `SetRow`
- **Opis:** Wiersz definiujący parametry serii.
- **Główne elementy:**
  - `Input` (type="number") dla: Powtórzenia, Ciężar (opcjonalne), Przerwa (sekundy).
  - Przycisk usuwania serii.
- **Obsługiwana walidacja:** `min(1)` dla powtórzeń, `min(0)` dla przerwy.
- **Propsy:** `dayIndex: number`, `exerciseIndex: number`, `setIndex: number`.

## 5. Typy

Należy utworzyć nowy plik ze schematami Zod: `src/lib/schemas/plan-editor.ts`.

### Schemat Formularza (`PlanEditorFormValues`)
Struktura formularza różni się od struktury API (API używa mapy dat, formularz używa tablicy obiektów).

```typescript
// Struktura dla react-hook-form
type PlanEditorFormValues = {
  name: string;
  effective_from: Date | string; // string w formacie ISO date
  effective_to: Date | string;
  days: Array<{
    date: string; // Kluczowa wartość do mapowania z powrotem na API
    name: string;
    exercises: Array<{
      name: string;
      sets: Array<{
        reps: number;
        weight?: number | null;
        rest_seconds: number;
      }>
    }>
  }>
}
```

## 6. Zarządzanie stanem

### `react-hook-form`
Zarządza stanem "brudnym" (dirty), wartościami pól i błędami walidacji. Użycie `useFieldArray` jest krytyczne dla zagnieżdżonych list (Dni -> Ćwiczenia -> Serie).

### Custom Hook: `usePlanEditor`
Hook ten enkapsuluje logikę komunikacji z API i transformacji danych.
- **Stan:** `isLoading`, `isSaving`, `error`.
- **Metody:**
  - `loadPlan(id)`: Pobiera `PlanResponse`.
  - `transformers`:
    - `apiToForm(PlanResponse): PlanEditorFormValues`: Zamienia `schedule` (Record) na posortowaną tablicę `days`.
    - `formToApi(PlanEditorFormValues): UpdatePlanRequest`: Zamienia tablicę `days` z powrotem na `schedule` (Record), używając pola `date` jako klucza.

## 7. Integracja API

### Endpointy
- **Pobieranie:** `GET /api/plans/:id` (Istniejący).
- **Zapis:** `PUT /api/plans/:id` (Należy upewnić się, że jest zaimplementowany lub go dodać).

### Typy (z `src/types.ts`)
- **Request (Zapis):** `UpdatePlanRequest`
  - Wymaga konwersji typów z formularza (np. stringi liczb na number).
- **Response (Odczyt):** `PlanResponse`.

## 8. Interakcje użytkownika

1.  **Inicjalizacja:** Pobranie danych planu. Jeśli plan nie istnieje (404), przekierowanie do listy planów lub wyświetlenie błędu.
2.  **Modyfikacja struktury:**
    - Kliknięcie "Dodaj dzień" -> dodaje nowy obiekt do tablicy `days` (najlepiej z datą = ostatnia data + 1 dzień).
    - Kliknięcie "Dodaj ćwiczenie" -> dodaje pusty obiekt ćwiczenia.
3.  **Zmiana daty dnia:** Użytkownik zmienia datę w `DatePicker` wewnątrz karty dnia. System musi sprawdzić, czy data nie koliduje z innym dniem.
4.  **Zapis:**
    - Kliknięcie "Zapisz".
    - Walidacja formularza.
    - Transformacja danych.
    - Wysłanie `PUT`.
    - Wyświetlenie komunikatu `toast.success("Plan zaktualizowany")`.
    - Przekierowanie do widoku szczegółów planu.

## 9. Warunki i walidacja

Walidacja realizowana przez schemat Zod (`zodResolver`):

1.  **Wymagalność:** Nazwa planu, nazwy dni, nazwy ćwiczeń.
2.  **Unikalność dat:** Tablica `days` nie może zawierać dwóch elementów o tej samej wartości `date`. Jest to sprawdzane przez `.refine()` na poziomie tablicy `days`.
3.  **Logika dat:** `effective_from` <= `effective_to`.
4.  **Wartości liczbowe:** `reps` > 0, `rest_seconds` >= 0.

## 10. Obsługa błędów

1.  **Błędy formularza:** Wyświetlane inline pod polami input (np. "To pole jest wymagane").
2.  **Duplikat daty:** Wyświetlany jako błąd ogólny sekcji dni lub przy konkretnym polu daty.
3.  **Błąd API (Zapis):** Wyświetlany w `Toaster`. Np. "Nie udało się zapisać planu. Spróbuj ponownie."
4.  **Błąd API (Odczyt):** Komponent `ErrorState` zamiast formularza.

## 11. Kroki implementacji

1.  **Backend (Opcjonalnie):** Upewnienie się, że metoda `PUT` w `src/pages/api/plans/[id].ts` jest zaimplementowana i obsługuje `UpdatePlanRequest`.
2.  **Schematy:** Utworzenie `src/lib/schemas/plan-editor.ts`.
3.  **Hook:** Implementacja `usePlanEditor` z logiką transformacji danych.
4.  **Komponenty UI:**
    - Implementacja `SetRow.tsx`.
    - Implementacja `ExerciseCard.tsx`.
    - Implementacja `DayCard.tsx`.
5.  **Widok główny:** Implementacja `PlanEditorView.tsx` łączącego formularz.
6.  **Strona Astro:** Utworzenie `src/pages/plans/[id]/edit.astro` i osadzenie widoku React.
7.  **Integracja:** Podpięcie `planService` do widoku.

