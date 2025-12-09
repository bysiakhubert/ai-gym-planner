# Plan implementacji widoku Edytora Planów Treningowych

## 1. Przegląd

Widok Edytora Planów Treningowych umożliwia użytkownikom manualne tworzenie nowych planów treningowych od zera oraz edycję istniejących planów. Widok zapewnia intuicyjny interfejs formularza z dynamicznymi polami pozwalającymi na definiowanie dni treningowych, ćwiczeń, serii, powtórzeń i czasów przerw. Wykorzystuje react-hook-form do zarządzania stanem formularza i walidacji, zapewniając płynne doświadczenie użytkownika z natychmiastowym feedbackiem walidacyjnym.

## 2. Routing widoku

Widok jest dostępny pod dwiema ścieżkami:

- **`/plans/new`** - Tworzenie nowego planu treningowego (tryb create)
- **`/plans/:id/edit`** - Edycja istniejącego planu treningowego (tryb edit)

Routing obsługiwany jest przez Astro, z głównym komponentem React montowanym jako interaktywny element strony.

## 3. Struktura komponentów

```
src/pages/plans/new.astro (Astro page)
src/pages/plans/[id]/edit.astro (Astro page)
└── PlanEditorView (React) - główny kontener widoku
    ├── Card (Shadcn/ui) - wrapper formularza
    │   └── PlanEditorForm (React) - formularz react-hook-form
    │       ├── PlanMetadataSection
    │       │   ├── Input (nazwa planu)
    │       │   ├── DatePicker (data rozpoczęcia)
    │       │   └── Input (długość cyklu w tygodniach)
    │       ├── ScheduleSection
    │       │   ├── Button (dodaj dzień treningowy)
    │       │   └── WorkoutDayCard[] (dla każdego dnia)
    │       │       ├── Input (nazwa dnia)
    │       │       ├── Button (usuń dzień)
    │       │       ├── Button (dodaj ćwiczenie)
    │       │       └── ExerciseCard[] (dla każdego ćwiczenia)
    │       │           ├── Input (nazwa ćwiczenia)
    │       │           ├── Button (usuń ćwiczenie)
    │       │           ├── Button (dodaj serię)
    │       │           └── SetRow[] (dla każdej serii)
    │       │               ├── Input (powtórzenia)
    │       │               ├── Input (ciężar)
    │       │               ├── Input (przerwa w sekundach)
    │       │               └── Button (usuń serię)
    │       └── FormActions
    │           ├── Button (Zapisz)
    │           └── Button (Anuluj)
```

## 4. Szczegóły komponentów

### 4.1. PlanEditorView

**Opis:** Główny kontener widoku odpowiedzialny za określenie trybu (tworzenie/edycja), pobieranie danych planu w trybie edycji oraz obsługę nawigacji po zapisie lub anulowaniu.

**Główne elementy:**
- Layout wrapper z nagłówkiem strony
- Komponent Card z Shadcn/ui jako container wizualny
- PlanEditorForm jako główny element interaktywny
- Loading state podczas pobierania danych w trybie edycji
- Error state w przypadku błędu pobierania danych

**Obsługiwane interakcje:**
- Inicjalizacja formularza (pusty lub z danymi istniejącego planu)
- Nawigacja po udanym zapisie do `/plans`
- Nawigacja po anulowaniu do `/plans`

**Obsługiwana walidacja:**
- Brak (delegowana do PlanEditorForm)

**Typy:**
- `PlanEditorMode: 'create' | 'edit'`
- `PlanResponse` (w trybie edycji)
- `ApiError` (dla obsługi błędów)

**Propsy:**
```typescript
interface PlanEditorViewProps {
  mode: 'create' | 'edit';
  planId?: string; // wymagane w trybie 'edit'
}
```

### 4.2. PlanEditorForm

**Opis:** Główny formularz zarządzający całym stanem danych planu treningowego. Wykorzystuje react-hook-form z Zod schema dla walidacji. Odpowiada za transformację danych formularza do formatu API oraz obsługę submitowania.

**Główne elementy:**
- FormProvider z react-hook-form
- PlanMetadataSection - sekcja z podstawowymi danymi planu
- ScheduleSection - sekcja z harmonogramem treningów
- FormActions - przyciski akcji (Zapisz, Anuluj)

**Obsługiwane interakcje:**
- `onSubmit` - walidacja i wysłanie danych do API
- `onCancel` - anulowanie edycji z potwierdzeniem jeśli są niezapisane zmiany
- Transformacja danych formularza do formatu CreatePlanRequest/UpdatePlanRequest

**Obsługiwana walidacja:**
- Nazwa planu: wymagana, 1-100 znaków
- Data rozpoczęcia: wymagana, prawidłowy format daty
- Długość cyklu: wymagana, liczba całkowita > 0
- Struktura planu: co najmniej jeden dzień treningowy
- Walidacja przez Zod schema przed submitowaniem

**Typy:**
- `PlanFormData` (ViewModel)
- `CreatePlanRequest` | `UpdatePlanRequest` (API)
- `PlanResponse` (odpowiedź API)

**Propsy:**
```typescript
interface PlanEditorFormProps {
  initialData?: PlanResponse; // wypełnione w trybie edycji
  mode: 'create' | 'edit';
  onSuccess: (plan: PlanResponse) => void;
  onCancel: () => void;
}
```

### 4.3. PlanMetadataSection

**Opis:** Sekcja formularza zawierająca podstawowe metadane planu treningowego: nazwę, datę rozpoczęcia i długość cyklu. Data zakończenia jest automatycznie kalkulowana na podstawie daty rozpoczęcia i długości cyklu.

**Główne elementy:**
- Label + Input (Shadcn/ui) dla nazwy planu
- Label + DatePicker (Shadcn/ui Calendar + Popover) dla daty rozpoczęcia
- Label + Input (type="number") dla długości cyklu w tygodniach
- Read-only field pokazujący obliczoną datę zakończenia

**Obsługiwane interakcje:**
- Zmiana nazwy planu
- Wybór daty rozpoczęcia z kalendarza
- Zmiana długości cyklu (automatyczne przeliczenie daty zakończenia)

**Obsługiwana walidacja:**
- Nazwa planu: wymagana, 1-100 znaków, komunikat błędu pod polem
- Data rozpoczęcia: wymagana, nie może być w przeszłości (ostrzeżenie, nie błąd)
- Długość cyklu: wymagana, liczba całkowita od 1 do 52 tygodni
- Data zakończenia: automatycznie walidowana (effective_to > effective_from)

**Typy:**
- `string` (nazwa)
- `Date` | `string` (daty w formacie ISO)
- `number` (długość cyklu)

**Propsy:**
```typescript
interface PlanMetadataSectionProps {
  // Komponent korzysta z useFormContext() z react-hook-form
  // nie wymaga explicite propsów, zarządza stanem przez context
}
```

### 4.4. ScheduleSection

**Opis:** Sekcja zarządzająca harmonogramem dni treningowych. Wyświetla listę dni treningowych i umożliwia dodawanie nowych dni. Obsługuje automatyczne generowanie dat dla dni treningowych na podstawie dostępnych dni w cyklu.

**Główne elementy:**
- Nagłówek sekcji "Harmonogram treningów"
- Button "Dodaj dzień treningowy" (z ikoną Plus)
- Lista WorkoutDayCard dla każdego dnia
- Pusty stan (empty state) gdy brak dni treningowych

**Obsługiwane interakcje:**
- Kliknięcie "Dodaj dzień treningowy" - dodaje nowy pusty dzień z automatycznie przypisaną datą
- Walidacja: co najmniej jeden dzień musi być zdefiniowany

**Obsługiwana walidacja:**
- Co najmniej jeden dzień treningowy wymagany
- Komunikat błędu wyświetlany nad sekcją jeśli brak dni przy próbie zapisu

**Typy:**
- `WorkoutDayForm[]`

**Propsy:**
```typescript
interface ScheduleSectionProps {
  // Komponent korzysta z useFormContext() i useFieldArray()
  // nie wymaga explicite propsów
}
```

### 4.5. WorkoutDayCard

**Opis:** Karta reprezentująca pojedynczy dzień treningowy. Zawiera nazwę dnia, datę i listę ćwiczeń. Umożliwia dodawanie/usuwanie ćwiczeń oraz usunięcie całego dnia.

**Główne elementy:**
- Card (Shadcn/ui) jako wrapper
- CardHeader z nazwą dnia, datą i buttonem usuwania
- Input dla nazwy dnia
- Badge z datą (read-only)
- Button "Dodaj ćwiczenie"
- Lista ExerciseCard dla każdego ćwiczenia
- Button "Usuń dzień" (w headerze)

**Obsługiwane interakcje:**
- Zmiana nazwy dnia
- Kliknięcie "Dodaj ćwiczenie" - dodaje nowe puste ćwiczenie
- Kliknięcie "Usuń dzień" - usuwa cały dzień (z potwierdzeniem jeśli ma ćwiczenia)

**Obsługiwana walidacja:**
- Nazwa dnia: wymagana, max 100 znaków
- Co najmniej jedno ćwiczenie wymagane na dzień
- Komunikat błędu jeśli brak ćwiczeń przy próbie zapisu

**Typy:**
- `WorkoutDayForm`

**Propsy:**
```typescript
interface WorkoutDayCardProps {
  index: number; // index w tablicy dni (dla useFieldArray)
  onRemove: (index: number) => void;
}
```

### 4.6. ExerciseCard

**Opis:** Karta reprezentująca pojedyncze ćwiczenie w ramach dnia treningowego. Zawiera nazwę ćwiczenia i listę serii. Umożliwia dodawanie/usuwanie serii oraz usunięcie całego ćwiczenia.

**Główne elementy:**
- Card (Shadcn/ui) jako wrapper (mniejszy, zagnieżdżony w WorkoutDayCard)
- Input dla nazwy ćwiczenia
- Button "Dodaj serię"
- Tabela/lista SetRow dla każdej serii (nagłówki: Seria, Powtórzenia, Ciężar, Przerwa, Akcje)
- Button "Usuń ćwiczenie" (ikonka X)

**Obsługiwane interakcje:**
- Zmiana nazwy ćwiczenia
- Kliknięcie "Dodaj serię" - dodaje nową pustą serię z domyślnymi wartościami
- Kliknięcie "Usuń ćwiczenie" - usuwa całe ćwiczenie (z potwierdzeniem jeśli ma serie)

**Obsługiwana walidacja:**
- Nazwa ćwiczenia: wymagana, max 200 znaków
- Co najmniej jedna seria wymagana na ćwiczenie
- Komunikat błędu jeśli brak serii przy próbie zapisu

**Typy:**
- `ExerciseForm`

**Propsy:**
```typescript
interface ExerciseCardProps {
  dayIndex: number; // index dnia w tablicy
  exerciseIndex: number; // index ćwiczenia w tablicy
  onRemove: (dayIndex: number, exerciseIndex: number) => void;
}
```

### 4.7. SetRow

**Opis:** Pojedynczy wiersz reprezentujący serię w ćwiczeniu. Zawiera pola dla liczby powtórzeń, ciężaru (opcjonalnie) i czasu przerwy w sekundach. Minimalny, kompaktowy design dla czytelności przy wielu seriach.

**Główne elementy:**
- TableRow lub div z grid layout
- Label z numerem serii (read-only, np. "Seria 1")
- Input (type="number") dla powtórzeń
- Input (type="number", opcjonalny) dla ciężaru
- Input (type="number") dla przerwy w sekundach
- Button (ikonka X) dla usunięcia serii

**Obsługiwane interakcje:**
- Zmiana liczby powtórzeń
- Zmiana ciężaru (może być puste)
- Zmiana czasu przerwy
- Kliknięcie "Usuń serię" - usuwa serię

**Obsługiwana walidacja:**
- Powtórzenia: wymagane, liczba całkowita > 0, max 999
- Ciężar: opcjonalny, liczba >= 0 jeśli podana, max 9999
- Przerwa: wymagana, liczba całkowita >= 0, max 3600 (1 godzina)
- Inline komunikaty błędów pod każdym polem

**Typy:**
- `SetForm`

**Propsy:**
```typescript
interface SetRowProps {
  dayIndex: number;
  exerciseIndex: number;
  setIndex: number;
  setNumber: number; // numer wyświetlany (1-based)
  onRemove: (dayIndex: number, exerciseIndex: number, setIndex: number) => void;
}
```

### 4.8. FormActions

**Opis:** Sekcja z przyciskami akcji formularza (Zapisz, Anuluj). Zawiera logikę dla walidacji, submitowania i anulowania edycji.

**Główne elementy:**
- Div z flexbox layout (justify-end, gap)
- Button "Anuluj" (variant="outline")
- Button "Zapisz" (variant="default", z loading state)

**Obsługiwane interakcje:**
- Kliknięcie "Zapisz" - triggeruje walidację i submit formularza
- Kliknięcie "Anuluj" - wywołuje onCancel z potwierdzeniem jeśli są zmiany

**Obsługiwana walidacja:**
- Button "Zapisz" disabled podczas submitowania (loading state)
- Po sukcesie: toast z komunikatem sukcesu
- Po błędzie: toast z komunikatem błędu lub wyświetlenie błędów API w formularzu

**Typy:**
- Brak specyficznych typów

**Propsy:**
```typescript
interface FormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  // onSubmit zarządzane przez formularz
}
```

## 5. Typy

### 5.1. Typy API (istniejące w src/types.ts)

Wykorzystywane bezpośrednio z pliku types:

```typescript
// Request types
CreatePlanRequest: {
  name: string;
  effective_from: string; // ISO 8601 timestamp
  effective_to: string; // ISO 8601 timestamp
  source: "ai" | "manual"; // zawsze "manual" dla tego widoku
  prompt: string | null; // zawsze null dla manual
  preferences: UserPreferences | Record<string, never>; // pusty obiekt dla manual
  plan: PlanStructure;
}

UpdatePlanRequest: CreatePlanRequest; // ten sam interfejs

// Response types
PlanResponse: {
  id: string;
  user_id: string;
  name: string;
  effective_from: string;
  effective_to: string;
  source: string;
  prompt: string | null;
  preferences: UserPreferences | Record<string, never>;
  plan: PlanStructure;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// Structure types
PlanStructure: {
  schedule: Record<string, WorkoutDay>; // klucz: ISO date string (YYYY-MM-DD)
}

WorkoutDay: {
  name: string;
  exercises: Exercise[];
  done: boolean;
}

Exercise: {
  name: string;
  sets: SetPlan[];
}

SetPlan: {
  reps: number;
  weight?: number;
  rest_seconds: number;
}

// Error type
ApiError: {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
}
```

### 5.2. ViewModels (nowe, do utworzenia w src/lib/schemas/plan-editor.ts)

**PlanFormData** - główny model danych formularza:
```typescript
interface PlanFormData {
  // Metadata
  name: string; // 1-100 znaków
  effective_from: string; // ISO date string (YYYY-MM-DD)
  cycle_duration_weeks: number; // 1-52 tygodnie
  
  // Obliczane automatycznie, nie w formularzu
  // effective_to: obliczane z effective_from + cycle_duration_weeks
  
  // Schedule
  workoutDays: WorkoutDayForm[]; // min 1 element
}
```

**WorkoutDayForm** - reprezentacja dnia treningowego w formularzu:
```typescript
interface WorkoutDayForm {
  id: string; // temporary UUID dla React keys
  date: string; // ISO date string (YYYY-MM-DD), przypisywane automatycznie
  name: string; // nazwa dnia, np. "Dzień A - Górna partia"
  exercises: ExerciseForm[]; // min 1 element
}
```

**ExerciseForm** - reprezentacja ćwiczenia w formularzu:
```typescript
interface ExerciseForm {
  id: string; // temporary UUID dla React keys
  name: string; // nazwa ćwiczenia, np. "Wyciskanie sztangi"
  sets: SetForm[]; // min 1 element
}
```

**SetForm** - reprezentacja serii w formularzu:
```typescript
interface SetForm {
  id: string; // temporary UUID dla React keys
  reps: number; // liczba powtórzeń, > 0
  weight: number | null; // ciężar w kg, opcjonalny
  rest_seconds: number; // przerwa w sekundach, >= 0
}
```

**PlanEditorMode** - typ pomocniczy dla trybu edytora:
```typescript
type PlanEditorMode = 'create' | 'edit';
```

### 5.3. Zod Schema (dla walidacji react-hook-form)

Schemat walidacji w pliku `src/lib/schemas/plan-editor.ts`:

```typescript
import { z } from 'zod';

const setFormSchema = z.object({
  id: z.string(),
  reps: z.number().int().min(1, "Minimum 1 powtórzenie").max(999, "Maksimum 999 powtórzeń"),
  weight: z.number().min(0, "Ciężar nie może być ujemny").max(9999, "Maksimum 9999 kg").nullable(),
  rest_seconds: z.number().int().min(0, "Przerwa nie może być ujemna").max(3600, "Maksimum 3600 sekund (1h)"),
});

const exerciseFormSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nazwa ćwiczenia jest wymagana").max(200, "Maksimum 200 znaków"),
  sets: z.array(setFormSchema).min(1, "Dodaj co najmniej jedną serię"),
});

const workoutDayFormSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty"),
  name: z.string().min(1, "Nazwa dnia jest wymagana").max(100, "Maksimum 100 znaków"),
  exercises: z.array(exerciseFormSchema).min(1, "Dodaj co najmniej jedno ćwiczenie"),
});

export const planFormSchema = z.object({
  name: z.string()
    .min(1, "Nazwa planu jest wymagana")
    .max(100, "Maksimum 100 znaków"),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty"),
  cycle_duration_weeks: z.number()
    .int("Długość cyklu musi być liczbą całkowitą")
    .min(1, "Minimum 1 tydzień")
    .max(52, "Maksimum 52 tygodnie"),
  workoutDays: z.array(workoutDayFormSchema).min(1, "Dodaj co najmniej jeden dzień treningowy"),
});

export type PlanFormData = z.infer<typeof planFormSchema>;
export type WorkoutDayForm = z.infer<typeof workoutDayFormSchema>;
export type ExerciseForm = z.infer<typeof exerciseFormSchema>;
export type SetForm = z.infer<typeof setFormSchema>;
```

## 6. Zarządzanie stanem

### 6.1. Custom Hook: usePlanEditor

Hook odpowiedzialny za zarządzanie logiką edytora planu, transformację danych i komunikację z API.

**Lokalizacja:** `src/hooks/usePlanEditor.ts`

**Argumenty:**
```typescript
interface UsePlanEditorOptions {
  mode: 'create' | 'edit';
  planId?: string; // wymagane w trybie 'edit'
  initialData?: PlanResponse; // dane do edycji
}
```

**Zwracane wartości:**
```typescript
interface UsePlanEditorReturn {
  // Form state (delegowane do react-hook-form)
  form: UseFormReturn<PlanFormData>;
  
  // Loading states
  isLoading: boolean; // podczas pobierania danych w trybie edit
  isSubmitting: boolean; // podczas zapisu
  
  // Error states
  error: ApiError | null;
  
  // Actions
  handleSubmit: (data: PlanFormData) => Promise<void>;
  handleCancel: () => void;
  
  // Helper functions
  addWorkoutDay: () => void;
  removeWorkoutDay: (index: number) => void;
  addExercise: (dayIndex: number) => void;
  removeExercise: (dayIndex: number, exerciseIndex: number) => void;
  addSet: (dayIndex: number, exerciseIndex: number) => void;
  removeSet: (dayIndex: number, exerciseIndex: number, setIndex: number) => void;
  
  // Computed values
  effectiveTo: string; // obliczona data zakończenia
}
```

**Główna logika:**

1. **Inicjalizacja formularza:**
   - W trybie 'create': pusty formularz z jednym domyślnym dniem
   - W trybie 'edit': formularz wypełniony danymi z `initialData`
   - Transformacja PlanResponse → PlanFormData (konwersja schedule do workoutDays)

2. **Transformacja danych:**
   - `transformFormDataToApiRequest`: PlanFormData → CreatePlanRequest/UpdatePlanRequest
   - Konwersja workoutDays[] → schedule: Record<string, WorkoutDay>
   - Usunięcie temporary IDs
   - Ustawienie source="manual", prompt=null, preferences={}
   - Kalkulacja effective_to z effective_from + cycle_duration_weeks

3. **Operacje na danych:**
   - Dodawanie elementów: generowanie nowego UUID, domyślne wartości
   - Usuwanie elementów: walidacja (ostrzeżenie jeśli zawiera children)
   - Automatyczne przypisywanie dat dla dni treningowych

4. **Submit flow:**
   - Walidacja przez Zod schema
   - Transformacja do formatu API
   - Wywołanie createPlan lub updatePlan z API
   - Obsługa sukcesu: toast, nawigacja
   - Obsługa błędów: wyświetlenie błędów API

5. **Cancel flow:**
   - Sprawdzenie czy są niezapisane zmiany (isDirty)
   - Jeśli tak: confirmation dialog
   - Nawigacja do /plans

### 6.2. React Hook Form Integration

**Biblioteka:** `react-hook-form` v7+

**Setup w PlanEditorForm:**
```typescript
const form = useForm<PlanFormData>({
  resolver: zodResolver(planFormSchema),
  defaultValues: initialData || getDefaultFormValues(),
  mode: 'onBlur', // walidacja po opuszczeniu pola
});
```

**useFieldArray dla dynamicznych list:**
- `workoutDays`: `useFieldArray({ control: form.control, name: 'workoutDays' })`
- `exercises`: `useFieldArray({ control: form.control, name: `workoutDays.${dayIndex}.exercises` })`
- `sets`: `useFieldArray({ control: form.control, name: `workoutDays.${dayIndex}.exercises.${exerciseIndex}.sets` })`

### 6.3. State management w komponentach

- **Global state:** Brak (nie wymagany dla tego widoku)
- **Form state:** Zarządzany przez react-hook-form via FormProvider context
- **UI state:** Lokalne state w komponentach (np. loading, dialogs)
- **Server state:** Zarządzany przez custom hook (usePlanEditor)

## 7. Integracja API

### 7.1. Endpoints

**Tworzenie nowego planu:**
- **Funkcja:** `createPlan(data: CreatePlanRequest): Promise<PlanResponse>`
- **Endpoint:** `POST /api/plans`
- **Request type:** `CreatePlanRequest`
- **Response type:** `PlanResponse`
- **Używane w:** tryb 'create'

**Aktualizacja istniejącego planu:**
- **Funkcja:** `updatePlan(planId: string, data: UpdatePlanRequest): Promise<PlanResponse>`
- **Endpoint:** `PUT /api/plans/:id`
- **Request type:** `UpdatePlanRequest`
- **Response type:** `PlanResponse`
- **Używane w:** tryb 'edit'

**Pobieranie planu do edycji:**
- **Funkcja:** `fetchPlan(planId: string): Promise<PlanResponse>`
- **Endpoint:** `GET /api/plans/:id`
- **Response type:** `PlanResponse`
- **Używane w:** tryb 'edit' (inicjalizacja)

### 7.2. Request/Response Flow

**Create Flow:**
```
1. User wypełnia formularz
2. User klika "Zapisz"
3. Walidacja Zod schema
4. Transformacja PlanFormData → CreatePlanRequest
5. POST /api/plans z CreatePlanRequest body
6. Otrzymanie PlanResponse
7. Toast sukcesu + nawigacja do /plans
```

**Edit Flow:**
```
1. Montowanie komponentu w trybie 'edit'
2. GET /api/plans/:id
3. Otrzymanie PlanResponse
4. Transformacja PlanResponse → PlanFormData
5. Inicjalizacja formularza z danymi
6. User modyfikuje dane
7. User klika "Zapisz"
8. Walidacja Zod schema
9. Transformacja PlanFormData → UpdatePlanRequest
10. PUT /api/plans/:id z UpdatePlanRequest body
11. Otrzymanie PlanResponse
12. Toast sukcesu + nawigacja do /plans
```

### 7.3. Transformacja danych

**PlanResponse → PlanFormData (dla trybu edit):**
```typescript
function transformPlanResponseToFormData(response: PlanResponse): PlanFormData {
  // Oblicz cycle_duration_weeks z dat
  const effectiveFrom = new Date(response.effective_from);
  const effectiveTo = new Date(response.effective_to);
  const cycleDurationWeeks = Math.ceil(
    (effectiveTo.getTime() - effectiveFrom.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  
  // Konwertuj schedule (Record) do workoutDays (Array)
  const workoutDays: WorkoutDayForm[] = Object.entries(response.plan.schedule)
    .map(([date, day]) => ({
      id: generateUUID(),
      date,
      name: day.name,
      exercises: day.exercises.map(exercise => ({
        id: generateUUID(),
        name: exercise.name,
        sets: exercise.sets.map(set => ({
          id: generateUUID(),
          reps: set.reps,
          weight: set.weight ?? null,
          rest_seconds: set.rest_seconds,
        })),
      })),
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // sortuj po dacie
  
  return {
    name: response.name,
    effective_from: response.effective_from.split('T')[0], // YYYY-MM-DD
    cycle_duration_weeks: cycleDurationWeeks,
    workoutDays,
  };
}
```

**PlanFormData → CreatePlanRequest/UpdatePlanRequest:**
```typescript
function transformFormDataToApiRequest(
  formData: PlanFormData,
  mode: 'create' | 'edit'
): CreatePlanRequest | UpdatePlanRequest {
  // Oblicz effective_to
  const effectiveFrom = new Date(formData.effective_from);
  const effectiveTo = new Date(effectiveFrom);
  effectiveTo.setDate(effectiveTo.getDate() + (formData.cycle_duration_weeks * 7));
  
  // Konwertuj workoutDays (Array) do schedule (Record)
  const schedule: Record<string, WorkoutDay> = {};
  formData.workoutDays.forEach(day => {
    schedule[day.date] = {
      name: day.name,
      done: false,
      exercises: day.exercises.map(exercise => ({
        name: exercise.name,
        sets: exercise.sets.map(set => ({
          reps: set.reps,
          weight: set.weight ?? undefined,
          rest_seconds: set.rest_seconds,
        })),
      })),
    };
  });
  
  return {
    name: formData.name,
    effective_from: `${formData.effective_from}T00:00:00Z`, // ISO 8601
    effective_to: effectiveTo.toISOString(),
    source: 'manual',
    prompt: null,
    preferences: {},
    plan: { schedule },
  };
}
```

## 8. Interakcje użytkownika

### 8.1. Nawigacja do widoku

**Tworzenie nowego planu:**
- User klika przycisk "Utwórz nowy plan" na stronie /plans
- Nawigacja do /plans/new
- Wyświetlenie pustego formularza z jednym domyślnym dniem treningowym

**Edycja istniejącego planu:**
- User klika przycisk "Edytuj" przy planie na stronie /plans lub /plans/:id
- Nawigacja do /plans/:id/edit
- Wyświetlenie loading state
- Pobranie danych planu z API
- Wypełnienie formularza danymi
- Wyświetlenie formularza

### 8.2. Wypełnianie podstawowych danych

**Wprowadzanie nazwy planu:**
- User klika w pole "Nazwa planu"
- User wpisuje nazwę
- Walidacja onBlur: 1-100 znaków
- Wyświetlenie błędu jeśli nieprawidłowa

**Wybór daty rozpoczęcia:**
- User klika pole "Data rozpoczęcia"
- Otwarcie kalendarza (Shadcn/ui Popover + Calendar)
- User wybiera datę
- Zamknięcie kalendarza
- Automatyczne przeliczenie daty zakończenia
- Automatyczne przypisanie dat dla dni treningowych

**Wprowadzanie długości cyklu:**
- User klika pole "Długość cyklu (tygodnie)"
- User wpisuje liczbę (1-52)
- Automatyczne przeliczenie daty zakończenia
- Wyświetlenie obliczonej daty zakończenia (read-only field)

### 8.3. Zarządzanie dniami treningowymi

**Dodawanie dnia:**
- User klika "Dodaj dzień treningowy"
- Nowy WorkoutDayCard pojawia się na liście
- Domyślna nazwa: "Dzień treningowy {numer}"
- Automatycznie przypisana data (następna dostępna w cyklu)
- Jedno puste ćwiczenie domyślnie dodane
- Focus przeniesiony na pole nazwy dnia

**Edycja nazwy dnia:**
- User klika pole nazwy dnia
- User wpisuje/modyfikuje nazwę
- Walidacja onBlur: wymagane, max 100 znaków

**Usuwanie dnia:**
- User klika przycisk "Usuń dzień" (ikonka X w headerze)
- Jeśli dzień ma ćwiczenia: wyświetlenie confirmation dialog
  - "Czy na pewno chcesz usunąć ten dzień? Wszystkie ćwiczenia zostaną usunięte."
  - Przyciski: "Anuluj", "Usuń"
- Po potwierdzeniu: dzień usunięty z listy
- Jeśli był ostatni dzień: wyświetlenie komunikatu błędu (min 1 dzień wymagany)

### 8.4. Zarządzanie ćwiczeniami

**Dodawanie ćwiczenia:**
- User klika "Dodaj ćwiczenie" w ramach WorkoutDayCard
- Nowy ExerciseCard pojawia się w dniu
- Domyślna nazwa: pusta (do wypełnienia)
- Jedna pusta seria domyślnie dodana
- Focus przeniesiony na pole nazwy ćwiczenia

**Edycja nazwy ćwiczenia:**
- User klika pole nazwy ćwiczenia
- User wpisuje/modyfikuje nazwę
- Walidacja onBlur: wymagane, max 200 znaków

**Usuwanie ćwiczenia:**
- User klika przycisk "Usuń ćwiczenie" (ikonka X)
- Jeśli ćwiczenie ma serie: wyświetlenie confirmation dialog
- Po potwierdzeniu: ćwiczenie usunięte
- Jeśli było ostatnie w dniu: wyświetlenie komunikatu błędu (min 1 ćwiczenie wymagane)

### 8.5. Zarządzanie seriami

**Dodawanie serii:**
- User klika "Dodaj serię" w ramach ExerciseCard
- Nowy SetRow pojawia się w tabeli
- Domyślne wartości: reps=8, weight=null, rest_seconds=90
- Focus przeniesiony na pole powtórzeń

**Edycja serii:**
- User klika pole powtórzeń/ciężaru/przerwy
- User wpisuje wartość
- Walidacja onBlur:
  - Powtórzenia: integer > 0, max 999
  - Ciężar: number >= 0 lub puste, max 9999
  - Przerwa: integer >= 0, max 3600
- Wyświetlenie błędu inline jeśli nieprawidłowa

**Usuwanie serii:**
- User klika przycisk "Usuń serię" (ikonka X)
- Jeśli jest więcej niż jedna seria: natychmiastowe usunięcie
- Jeśli jest ostatnia seria: wyświetlenie komunikatu błędu (min 1 seria wymagana)

### 8.6. Zapisywanie planu

**Kliknięcie "Zapisz":**
- Walidacja całego formularza (Zod schema)
- Jeśli błędy walidacji:
  - Wyświetlenie błędów inline przy każdym polu
  - Scroll do pierwszego błędu
  - Focus na pierwszym błędnym polu
  - Button "Zapisz" pozostaje aktywny
- Jeśli walidacja OK:
  - Button "Zapisz" zmienia się na loading state (spinner + disabled)
  - Transformacja danych do formatu API
  - Wywołanie createPlan lub updatePlan
  - Jeśli sukces:
    - Toast: "Plan został zapisany pomyślnie"
    - Nawigacja do /plans
  - Jeśli błąd API:
    - Toast z komunikatem błędu z API
    - Jeśli błąd walidacji (400): wyświetlenie szczegółowych błędów w formularzu
    - Button "Zapisz" wraca do stanu aktywnego

### 8.7. Anulowanie edycji

**Kliknięcie "Anuluj":**
- Sprawdzenie czy formularz ma niezapisane zmiany (isDirty)
- Jeśli tak: wyświetlenie confirmation dialog
  - "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?"
  - Przyciski: "Pozostań", "Opuść bez zapisywania"
- Po potwierdzeniu lub jeśli brak zmian:
  - Nawigacja do /plans

## 9. Warunki i walidacja

### 9.1. Walidacja pól formularza

**Poziom pola (inline, onBlur):**

1. **Nazwa planu (PlanMetadataSection):**
   - Wymagane: "Nazwa planu jest wymagana"
   - Min 1 znak: "Nazwa planu jest wymagana"
   - Max 100 znaków: "Maksimum 100 znaków"
   - Wyświetlenie: komunikat błędu pod polem, pole z czerwoną obwódką

2. **Data rozpoczęcia (PlanMetadataSection):**
   - Wymagane: "Data rozpoczęcia jest wymagana"
   - Format: YYYY-MM-DD (walidowane przez DatePicker)
   - Ostrzeżenie (nie błąd) jeśli data w przeszłości
   - Wyświetlenie: komunikat pod polem

3. **Długość cyklu (PlanMetadataSection):**
   - Wymagane: "Długość cyklu jest wymagana"
   - Integer: "Musi być liczbą całkowitą"
   - Min 1: "Minimum 1 tydzień"
   - Max 52: "Maksimum 52 tygodnie"
   - Wyświetlenie: komunikat błędu pod polem

4. **Nazwa dnia (WorkoutDayCard):**
   - Wymagane: "Nazwa dnia jest wymagana"
   - Max 100 znaków: "Maksimum 100 znaków"
   - Wyświetlenie: komunikat błędu pod polem

5. **Nazwa ćwiczenia (ExerciseCard):**
   - Wymagane: "Nazwa ćwiczenia jest wymagana"
   - Max 200 znaków: "Maksimum 200 znaków"
   - Wyświetlenie: komunikat błędu pod polem

6. **Powtórzenia (SetRow):**
   - Wymagane: "Powtórzenia są wymagane"
   - Integer: "Musi być liczbą całkowitą"
   - Min 1: "Minimum 1 powtórzenie"
   - Max 999: "Maksimum 999 powtórzeń"
   - Wyświetlenie: komunikat błędu pod polem, małą czcionką

7. **Ciężar (SetRow):**
   - Opcjonalne: może być puste
   - Jeśli wypełnione:
     - Number: "Musi być liczbą"
     - Min 0: "Ciężar nie może być ujemny"
     - Max 9999: "Maksimum 9999 kg"
   - Wyświetlenie: komunikat błędu pod polem

8. **Przerwa (SetRow):**
   - Wymagane: "Przerwa jest wymagana"
   - Integer: "Musi być liczbą całkowitą"
   - Min 0: "Przerwa nie może być ujemna"
   - Max 3600: "Maksimum 3600 sekund (1 godzina)"
   - Wyświetlenie: komunikat błędu pod polem

### 9.2. Walidacja struktury (onSubmit)

**Dni treningowe (ScheduleSection):**
- Condition: workoutDays.length >= 1
- Error: "Dodaj co najmniej jeden dzień treningowy"
- Display: Alert/banner nad sekcją Schedule, scroll do widoku

**Ćwiczenia w dniu (WorkoutDayCard):**
- Condition: exercises.length >= 1 dla każdego dnia
- Error: "Dodaj co najmniej jedno ćwiczenie do dnia '{dayName}'"
- Display: Alert w ramach WorkoutDayCard, scroll do widoku

**Serie w ćwiczeniu (ExerciseCard):**
- Condition: sets.length >= 1 dla każdego ćwiczenia
- Error: "Dodaj co najmniej jedną serię do ćwiczenia '{exerciseName}'"
- Display: Alert w ramach ExerciseCard, scroll do widoku

### 9.3. Walidacja biznesowa (API)

**Data zakończenia > data rozpoczęcia:**
- Walidowana: automatycznie podczas kalkulacji (frontend nie pozwala na błędną konfigurację)
- API validation: effective_to > effective_from
- Error z API: "effective_to must be after effective_from"
- Display: toast z błędem + highlight pola daty

**Nakładające się zakresy dat:**
- Walidowana: tylko przez API (wymaga sprawdzenia innych planów użytkownika)
- Error z API (409): "Date range overlaps with existing plan"
- Display: toast z błędem + sugestia: "Sprawdź istniejące plany lub ustaw inne daty"

**Prawidłowa struktura planu:**
- Walidowana: przez Zod schema (frontend) + API (backend)
- Error z API (400): szczegółowe błędy w details
- Display: mapowanie błędów API do odpowiednich pól formularza

### 9.4. UI states dla walidacji

**Pole prawidłowe:**
- Border: domyślny (szary)
- Background: domyślny (biały)
- Brak komunikatu

**Pole nieprawidłowe:**
- Border: czerwony (ring-red-500)
- Background: lekko czerwony (bg-red-50)
- Komunikat błędu: czerwony tekst pod polem
- Ikona X w polu (opcjonalnie)

**Pole w trakcie edycji:**
- Border: niebieski focus ring
- Background: domyślny

## 10. Obsługa błędów

### 10.1. Błędy walidacji formularza

**Źródło:** Zod schema validation

**Typy błędów:**
- Pole wymagane nie wypełnione
- Wartość poza zakresem (min/max)
- Nieprawidłowy format (np. nie-integer dla int field)
- Brak wymaganych elementów (dni/ćwiczeń/serii)

**Obsługa:**
- Walidacja inline onBlur dla poszczególnych pól
- Walidacja całego formularza onSubmit
- Wyświetlenie błędów przy każdym polu z błędem
- Scroll do pierwszego błędu
- Focus na pierwszym błędnym polu
- Button "Zapisz" pozostaje aktywny (user może naprawić i ponownie submitować)

**Komunikaty:**
- Specyficzne dla każdego pola (patrz sekcja 9.1)
- Język: polski
- Ton: pomocny, konkretny

### 10.2. Błędy API - walidacja (400 Bad Request)

**Źródło:** API endpoint validation

**Przykładowa odpowiedź:**
```json
{
  "error": "ValidationError",
  "message": "Invalid plan data",
  "details": {
    "effective_to": "Must be after effective_from",
    "plan.schedule": "At least one workout day required"
  }
}
```

**Obsługa:**
- Parse details object z błędami
- Mapowanie błędów API do pól formularza (jeśli możliwe)
- Wyświetlenie błędów przy odpowiednich polach
- Jeśli błąd nie może być zmapowany do pola: wyświetlenie w toaście
- Scroll do pierwszego błędu

**Komunikaty:**
- Użyj message z API lub przetłumacz na polski
- Jeśli details zawiera konkretne błędy: użyj ich

### 10.3. Błąd nakładania się dat (409 Conflict)

**Źródło:** API endpoint - business logic validation

**Przykładowa odpowiedź:**
```json
{
  "error": "DateOverlapError",
  "message": "Plan dates overlap with existing plan 'My Previous Plan'",
  "details": {
    "overlapping_plan_id": "uuid",
    "overlapping_plan_name": "My Previous Plan"
  }
}
```

**Obsługa:**
- Wyświetlenie toast z błędem
- Alert w formularzu z sugestią rozwiązania:
  - "Ten zakres dat nakłada się z planem '{name}'. Zmień daty lub archiwizuj poprzedni plan."
  - Link do listy planów
- Highlight pól daty

**Komunikaty:**
- "Zakres dat nakłada się z istniejącym planem"
- Wyświetl nazwę nakładającego się planu z details

### 10.4. Błąd autoryzacji (401 Unauthorized)

**Źródło:** API - sesja użytkownika wygasła

**Obsługa:**
- Wyświetlenie toast: "Sesja wygasła. Zaloguj się ponownie."
- Zapisanie stanu formularza w localStorage (autosave)
- Redirect do strony logowania
- Po zalogowaniu: próba przywrócenia formularza z localStorage

### 10.5. Błąd "nie znaleziono" (404 Not Found) - tryb edit

**Źródło:** API GET /api/plans/:id - plan nie istnieje lub został usunięty

**Obsługa:**
- Wyświetlenie error state w miejsce formularza
- Komunikat: "Plan nie został znaleziony lub został usunięty"
- Button: "Wróć do listy planów" → redirect /plans

### 10.6. Błąd sieciowy

**Źródło:** Network failure, timeout, CORS issue

**Obsługa:**
- Wyświetlenie toast: "Błąd połączenia. Sprawdź internet i spróbuj ponownie."
- Button "Zapisz" wraca do stanu aktywnego (umożliwia retry)
- Dane formularza zachowane
- Opcja: button "Spróbuj ponownie" w toaście

### 10.7. Błąd serwera (500 Internal Server Error)

**Źródło:** API - unexpected server error

**Obsługa:**
- Wyświetlenie toast: "Wystąpił błąd serwera. Spróbuj ponownie za chwilę."
- Button "Zapisz" wraca do stanu aktywnego
- Dane formularza zachowane
- Logowanie błędu (console.error z request_id jeśli dostępny)

### 10.8. Niezapisane zmiany

**Źródło:** User próbuje opuścić stronę z niezapisanymi zmianami

**Obsługa:**
- Detekcja przez react-hook-form `formState.isDirty`
- Wyświetlenie confirmation dialog:
  - Tytuł: "Niezapisane zmiany"
  - Treść: "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?"
  - Przyciski: "Pozostań" (default), "Opuść bez zapisywania" (destructive)
- Opcjonalnie: implementacja beforeunload event dla ochrony przed zamknięciem karty

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury i typów

1.1. Utwórz plik `src/lib/schemas/plan-editor.ts`:
- Zdefiniuj Zod schemas dla SetForm, ExerciseForm, WorkoutDayForm, PlanFormData
- Wyeksportuj typy: `type PlanFormData = z.infer<typeof planFormSchema>`
- Dodaj helper type: `type PlanEditorMode = 'create' | 'edit'`

1.2. Sprawdź istniejące typy API w `src/types.ts`:
- Upewnij się, że CreatePlanRequest, UpdatePlanRequest, PlanResponse są prawidłowe
- Jeśli potrzeba: dodaj brakujące typy

### Krok 2: Implementacja custom hook

2.1. Utwórz plik `src/hooks/usePlanEditor.ts`:
- Zdefiniuj interfejs `UsePlanEditorOptions` i `UsePlanEditorReturn`
- Implementuj hook `usePlanEditor(options)`

2.2. Implementuj funkcje transformacji:
- `transformPlanResponseToFormData(response: PlanResponse): PlanFormData`
- `transformFormDataToApiRequest(data: PlanFormData): CreatePlanRequest | UpdatePlanRequest`
- Helper: `calculateEffectiveTo(from: string, weeks: number): string`
- Helper: `generateWorkoutDayDates(from: string, weeks: number, count: number): string[]`

2.3. Implementuj logikę hooka:
- Inicjalizacja formularza z react-hook-form
- Fetch planu w trybie edit (useEffect)
- handleSubmit: walidacja → transformacja → API call → nawigacja
- handleCancel: sprawdzenie isDirty → confirmation → nawigacja
- Helper functions: addWorkoutDay, removeWorkoutDay, etc.

### Krok 3: Implementacja komponentów atomowych (od najmniejszych)

3.1. Utwórz `src/components/plans/editor/SetRow.tsx`:
- Implementuj interfejs propsów
- Renderuj pola: reps, weight, rest_seconds
- Użyj Controller z react-hook-form
- Dodaj button usuwania serii
- Wyświetl błędy walidacji inline
- Style: kompaktowy layout, tabela lub grid

3.2. Utwórz `src/components/plans/editor/ExerciseCard.tsx`:
- Implementuj interfejs propsów
- Renderuj Input dla nazwy ćwiczenia
- Renderuj listę SetRow (useFieldArray)
- Button "Dodaj serię"
- Button "Usuń ćwiczenie"
- Wyświetl błędy walidacji
- Style: Card z Shadcn/ui, mniejszy niż WorkoutDayCard

3.3. Utwórz `src/components/plans/editor/WorkoutDayCard.tsx`:
- Implementuj interfejs propsów
- Renderuj Card header z nazwą, datą, buttonem usuwania
- Input dla nazwy dnia
- Renderuj listę ExerciseCard (useFieldArray)
- Button "Dodaj ćwiczenie"
- Wyświetl błędy walidacji
- Style: Card z Shadcn/ui, wyraźny kontrast z ExerciseCard

### Krok 4: Implementacja komponentów sekcji

4.1. Utwórz `src/components/plans/editor/PlanMetadataSection.tsx`:
- Użyj useFormContext() dla dostępu do formularza
- Renderuj Input dla nazwy planu
- Renderuj DatePicker dla daty rozpoczęcia (Shadcn Calendar + Popover)
- Renderuj Input dla długości cyklu
- Wyświetl obliczoną datę zakończenia (read-only)
- Obsłuż zmiany: auto-update effective_to
- Wyświetl błędy walidacji inline

4.2. Utwórz `src/components/plans/editor/ScheduleSection.tsx`:
- Użyj useFormContext() i useFieldArray()
- Renderuj nagłówek sekcji
- Button "Dodaj dzień treningowy" (z ikoną Plus)
- Renderuj listę WorkoutDayCard
- Empty state jeśli brak dni
- Wyświetl błąd walidacji jeśli brak dni

4.3. Utwórz `src/components/plans/editor/FormActions.tsx`:
- Renderuj Button "Anuluj" (outline)
- Renderuj Button "Zapisz" (default, z loading state)
- Obsłuż onCancel z propsów
- onSubmit zarządzane przez formularz

### Krok 5: Implementacja głównego formularza

5.1. Utwórz `src/components/plans/editor/PlanEditorForm.tsx`:
- Implementuj interfejs propsów
- Użyj hooka usePlanEditor
- Setup FormProvider z react-hook-form
- Renderuj PlanMetadataSection
- Renderuj ScheduleSection
- Renderuj FormActions
- Obsłuż onSubmit: usePlanEditor.handleSubmit
- Obsłuż błędy: wyświetl toast dla błędów API
- Style: wrapper z odpowiednimi odstępami

5.2. Dodaj confirmation dialog dla anulowania:
- Użyj AlertDialog z Shadcn/ui
- Wyświetl jeśli isDirty i user klika Anuluj
- Buttons: "Pozostań", "Opuść bez zapisywania"

### Krok 6: Implementacja głównego widoku

6.1. Utwórz `src/components/plans/editor/PlanEditorView.tsx`:
- Implementuj interfejs propsów (mode, planId)
- Loading state podczas fetch w trybie edit
- Error state jeśli fetch failed (404)
- Renderuj PlanEditorForm po załadowaniu
- Obsłuż onSuccess: nawigacja do /plans
- Obsłuż onCancel: nawigacja do /plans
- Style: centrowany layout, max-width

6.2. Utwórz plik index `src/components/plans/editor/index.ts`:
- Eksportuj wszystkie komponenty
- Export default PlanEditorView

### Krok 7: Utworzenie stron Astro

7.1. Utwórz `src/pages/plans/new.astro`:
- Import Layout
- Import PlanEditorView
- Renderuj z mode="create"
- Dodaj nagłówek strony: "Nowy plan treningowy"
- client:load directive dla React component

7.2. Utwórz folder i plik `src/pages/plans/[id]/edit.astro`:
- Import Layout
- Import PlanEditorView
- Pobierz planId z Astro.params
- Renderuj z mode="edit" i planId
- Dodaj nagłówek strony: "Edytuj plan"
- client:load directive dla React component
- Obsłuż brak parametru id (redirect do /plans)

### Krok 8: Styling i polishing

8.1. Dopracuj style komponentów:
- Spójność kolorów z design system
- Responsywność (mobile-first)
- Dostępność (a11y): labels, ARIA attributes
- Focus states dla wszystkich interaktywnych elementów

8.2. Dodaj animacje (opcjonalnie):
- Fade-in dla nowych elementów (dni/ćwiczeń/serii)
- Slide-out dla usuwanych elementów
- Loading spinners dla async operations
- Używaj Tailwind animations lub framer-motion

8.3. Dodaj ikony:
- Plus icon dla buttonów dodawania
- Trash/X icon dla buttonów usuwania
- Calendar icon dla date pickera
- Alert icon dla komunikatów błędów
- Użyj lucide-react (zgodnie z Shadcn/ui)

### Krok 9: Integracja z API

9.1. Sprawdź istniejącą implementację API w `src/lib/api/plans.ts`:
- Upewnij się, że funkcje createPlan, updatePlan, fetchPlan są dostępne
- Sprawdź typy requestów i responsów
- Jeśli potrzeba: dodaj brakujące funkcje

9.2. Przetestuj integrację:
- Test create flow: wypełnij formularz → save → sprawdź w DB
- Test edit flow: załaduj plan → modyfikuj → save → sprawdź zmiany
- Test error handling: błędy walidacji, błędy API

### Krok 10: Testing i debugging

10.1. Testy manualne:
- Create flow: pełny proces tworzenia nowego planu
- Edit flow: pełny proces edycji istniejącego planu
- Validation: sprawdź każdą regułę walidacji
- Error scenarios: symuluj błędy API, network failures
- Edge cases: bardzo długie nazwy, duża liczba serii, etc.

10.2. Sprawdź responsywność:
- Mobile (320px+): wszystkie pola dostępne, scroll działa
- Tablet (768px+): lepsze wykorzystanie przestrzeni
- Desktop (1024px+): optimal layout

10.3. Sprawdź accessibility:
- Keyboard navigation: Tab przez wszystkie pola
- Screen reader: prawidłowe labels i ARIA
- Focus management: prawidłowe focus states
- Color contrast: WCAG AA compliance

### Krok 11: Dokumentacja i finalizacja

11.1. Dodaj komentarze w kodzie:
- JSDoc dla wszystkich publicznych funkcji i komponentów
- Wyjaśnienia dla skomplikowanej logiki
- TODO dla przyszłych ulepszeń

11.2. Update dokumentacji projektu:
- Dodaj opis nowego widoku do README
- Update routing documentation
- Dodaj screenshots (opcjonalnie)

11.3. Code review:
- Self-review: przejdź przez cały kod
- Sprawdź zgodność z coding practices z .ai rules
- Sprawdź linting (uruchom eslint)
- Sprawdź formatting (prettier)

### Krok 12: Deployment

12.1. Build aplikacji:
- Uruchom `npm run build`
- Sprawdź logi: brak błędów
- Sprawdź rozmiar bundle'a: czy nie za duży

12.2. Test produkcyjny:
- Deploy do staging environment
- Pełny test flow w środowisku produkcyjnym
- Sprawdź performance (Lighthouse)

12.3. Release:
- Merge do main branch
- Deploy to production
- Monitor błędów (error tracking)
- Zbierz feedback od użytkowników

---

## Notatki implementacyjne

### Technologie i biblioteki

- **React Hook Form**: v7+ dla zarządzania formularzem
- **Zod**: v3+ dla walidacji schema
- **Shadcn/ui**: komponenty UI (Card, Input, Button, Calendar, Popover, AlertDialog)
- **Lucide React**: ikony
- **date-fns**: operacje na datach (kalkulacja effective_to, formatowanie)
- **uuid**: generowanie temporary IDs dla elementów formularza
- **sonner**: toast notifications (już używane w projekcie)

### Konwencje nazewnictwa

- Komponenty: PascalCase (np. PlanEditorForm)
- Pliki komponentów: PascalCase.tsx (np. PlanEditorForm.tsx)
- Hooki: camelCase z prefixem "use" (np. usePlanEditor)
- Typy: PascalCase (np. PlanFormData)
- Funkcje: camelCase (np. transformFormDataToApiRequest)

### Organizacja plików

```
src/
├── components/
│   └── plans/
│       └── editor/
│           ├── index.ts
│           ├── PlanEditorView.tsx
│           ├── PlanEditorForm.tsx
│           ├── PlanMetadataSection.tsx
│           ├── ScheduleSection.tsx
│           ├── WorkoutDayCard.tsx
│           ├── ExerciseCard.tsx
│           ├── SetRow.tsx
│           └── FormActions.tsx
├── hooks/
│   └── usePlanEditor.ts
├── lib/
│   └── schemas/
│       └── plan-editor.ts
└── pages/
    └── plans/
        ├── new.astro
        └── [id]/
            └── edit.astro
```

### Performance considerations

- Użyj React.memo() dla SetRow i ExerciseCard jeśli lista jest długa
- Debounce dla auto-save (jeśli zaimplementowane)
- Lazy loading dla komponentów jeśli bundle za duży
- Virtualizacja listy jeśli użytkownik ma >50 serii (edge case)

### Bezpieczeństwo

- Wszystkie dane formularza sanitized przed wysłaniem do API
- API walidacja jest źródłem prawdy (frontend validation to UX enhancement)
- Nie przechowuj wrażliwych danych w localStorage
- CSRF protection przez Astro middleware

