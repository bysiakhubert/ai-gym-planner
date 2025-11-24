# Plan implementacji widoku Generatora Planu AI

## 1. Przegląd

Widok Generatora Planu AI umożliwia użytkownikom generowanie spersonalizowanych planów treningowych przy użyciu sztucznej inteligencji. Składa się z dwóch głównych części: formularza do zbierania preferencji użytkownika oraz ekranu podglądu wygenerowanego planu, na którym użytkownik może go zaakceptować, odrzucić lub przejść do edycji. Celem jest zapewnienie płynnego i intuicyjnego procesu, od zdefiniowania potrzeb po otrzymanie gotowego do zapisu planu.

## 2. Routing widoku

- **Formularz generowania:** Widok będzie dostępny pod ścieżką `/generate`.
- **Podgląd planu:** Stan podglądu będzie zarządzany po stronie klienta. Aplikacja pozostanie na tej samej ścieżce (`/generate`), ale będzie renderować komponent podglądu. Dane planu będą przechowywane w `localStorage`, aby zapewnić ich trwałość między odświeżeniami strony.

## 3. Struktura komponentów

Hierarchia komponentów będzie zorganizowana w następujący sposób, aby zapewnić logiczny podział odpowiedzialności i możliwość ponownego wykorzystania.

```
- /src/pages/generate.astro (Strona Astro)
  - AiPlannerGeneratorView (Komponent React)
    - [Renderowanie warunkowe]
      - IF (stan: 'form' | 'error' na formularzu):
        - PlannerForm
          - Shadcn/ui (Select, Checkbox, Slider, Textarea, Button, Form)
      - IF (stan: 'loading'):
        - LoadingSpinner
      - IF (stan: 'preview' | 'error' na podglądzie):
        - PlanPreview
          - SafetyDisclaimer
          - WorkoutDayCard (mapowany po dniach treningowych)
          - Shadcn/ui (Button x3)
```

## 4. Szczegóły komponentów

### `AiPlannerGeneratorView`

- **Opis komponentu:** Główny komponent React, który zarządza stanem całego widoku (formularz, ładowanie, podgląd, błąd). Odpowiada za komunikację z API i decyduje, który komponent podrzędny (`PlannerForm` czy `PlanPreview`) ma być wyświetlony.
- **Główne elementy:** Kontener `div`, który warunkowo renderuje `PlannerForm`, `PlanPreview`, lub wskaźnik ładowania.
- **Obsługiwane zdarzenia:**
  - `handleGeneratePlan(preferences)`: Uruchamiane po submisji formularza.
  - `handleAcceptPlan()`: Uruchamiane po kliknięciu "Zaakceptuj i zapisz".
  - `handleRejectPlan()`: Uruchamiane po kliknięciu "Odrzuć".
  - `handleEditPlan()`: Uruchamiane po kliknięciu "Edytuj".
- **Warunki walidacji:** Brak, deleguje do `PlannerForm`.
- **Typy:** `GeneratePlanResponse`, `UserPreferences`, `ApiError`.
- **Propsy:** Brak.

### `PlannerForm`

- **Opis komponentu:** Formularz do zbierania preferencji treningowych użytkownika. Zbudowany z użyciem komponentów `Shadcn/ui` i zarządzany przez `react-hook-form` w celu walidacji.
- **Główne elementy:** Komponent `<Form>` z `react-hook-form` zawierający `FormField` dla każdego pola: `Select` (cel, system), `Checkbox` (dni), `Slider` (czas trwania sesji, długość cyklu), `Textarea` (uwagi) i `Button` (submit).
- **Obsługiwane zdarzenia:** `onSubmit(data: UserPreferences)`: Przekazuje zwalidowane dane formularza do komponentu nadrzędnego.
- **Warunki walidacji:**
  - `goal`: Wymagane.
  - `system`: Wymagane.
  - `available_days`: Tablica musi zawierać co najmniej jeden element.
  - `session_duration_minutes`: Wartość liczbowa, wymagana, w zakresie np. 30-180.
  - `cycle_duration_weeks`: Wartość liczbowa, wymagana, w zakresie np. 1-12.
- **Typy:** `UserPreferences`.
- **Propsy:**
  - `isSubmitting: boolean`: Informuje, czy formularz jest w trakcie przetwarzania.
  - `onSubmit: (preferences: UserPreferences) => void`: Funkcja zwrotna wywoływana po pomyślnej walidacji i submisji.

### `PlanPreview`

- **Opis komponentu:** Wyświetla podgląd wygenerowanego przez AI planu treningowego. Dane są tylko do odczytu. Komponent zawiera również przyciski akcji oraz klauzulę bezpieczeństwa.
- **Główne elementy:** Kontener z tytułem planu, datami obowiązywania. Sekcja z komponentem `SafetyDisclaimer`. Mapa renderująca komponenty `WorkoutDayCard` dla każdego dnia w planie. Kontener z przyciskami "Zaakceptuj i zapisz", "Odrzuć", "Edytuj".
- **Obsługiwane zdarzenia:**
  - `onAccept`: Wywoływane po kliknięciu przycisku akceptacji.
  - `onReject`: Wywoływane po kliknięciu przycisku odrzucenia.
  - `onEdit`: Wywoływane po kliknięciu przycisku edycji.
- **Warunki walidacji:** Brak.
- **Typy:** `GeneratePlanResponse`.
- **Propsy:**
  - `previewData: GeneratePlanResponse`: Obiekt zawierający dane planu do wyświetlenia.
  - `isSaving: boolean`: Informuje, czy trwa proces zapisywania planu.
  - `onAccept: () => void`.
  - `onReject: () => void`.
  - `onEdit: () => void`.

### `WorkoutDayCard`

- **Opis komponentu:** Komponent prezentacyjny, który renderuje szczegóły pojedynczego dnia treningowego, w tym nazwę dnia oraz listę ćwiczeń wraz z seriami, powtórzeniami i przerwami.
- **Główne elementy:** Komponent `Card` z `Shadcn/ui` z `CardHeader` (nazwa dnia) i `CardContent` (tabela lub lista ćwiczeń).
- **Obsługiwane zdarzenia:** Brak.
- **Warunki walidacji:** Brak.
- **Typy:** `WorkoutDay`.
- **Propsy:** `workout: WorkoutDay`.

## 5. Typy

Widok będzie korzystał głównie z typów zdefiniowanych w `src/types.ts`. Nie ma potrzeby tworzenia nowych, kluczowych typów DTO, jednak na potrzeby stanu formularza i podglądu zdefiniujemy modele widoku (ViewModel), które będą bazować na istniejących typach.

- **`PlannerFormViewModel`**: Odpowiada typowi `UserPreferences`. Będzie używany do zarządzania stanem formularza.

  ```typescript
  interface UserPreferences {
    goal: string;
    system: string;
    available_days: string[];
    session_duration_minutes: number;
    cycle_duration_weeks: number;
    notes?: string;
  }
  ```

- **`PlanPreviewViewModel`**: Odpowiada typowi `GeneratePlanResponse`. Będzie przechowywać kompletne dane zwrócone z API do wyświetlenia na ekranie podglądu.
  ```typescript
  interface GeneratePlanResponse {
    plan: {
      name: string;
      effective_from: string;
      effective_to: string;
      schedule: PlanStructure["schedule"];
      // ... inne pola z CreatePlanRequest
    };
    preferences: UserPreferences;
    metadata: {
      model: string;
      generation_time_ms: number;
    };
  }
  ```

## 6. Zarządzanie stanem

Zarządzanie stanem zostanie scentralizowane w niestandardowym hooku `useAiPlannerGenerator`, co pozwoli na odizolowanie logiki od komponentów UI.

- **`useAiPlannerGenerator` Hook:**
  - **Cel:** Enkapsulacja całej logiki biznesowej widoku: zarządzanie stanem (formularz, ładowanie, podgląd), obsługa wywołań API, interakcja z `localStorage` oraz obsługa błędów.
  - **Zmienne stanu:**
    - `viewState: 'form' | 'loading' | 'preview' | 'error'`: Określa, który interfejs jest aktualnie wyświetlany.
    - `previewData: GeneratePlanResponse | null`: Przechowuje dane podglądu planu.
    - `error: ApiError | null`: Przechowuje informacje o błędach z API.
  - **Efekty (`useEffect`):**
    - Przy pierwszym renderowaniu hook sprawdzi `localStorage` w poszukiwaniu zapisanego podglądu. Jeśli go znajdzie, ustawi `viewState` na `'preview'` i załaduje dane. W przeciwnym razie ustawi `viewState` na `'form'`.
  - **Funkcje:**
    - `generatePlan(preferences: UserPreferences)`: Obsługuje wywołanie `POST /api/plans/generate`.
    - `acceptPlan()`: Obsługuje wywołanie `POST /api/plans`.
    - `rejectPlan()`: Czyści stan i `localStorage`.

## 7. Integracja API

### Generowanie podglądu planu

- **Endpoint:** `POST /api/plans/generate`
- **Akcja:** Wywoływana przez funkcję `generatePlan` w hooku `useAiPlannerGenerator`.
- **Typ żądania:** `GeneratePlanRequest`
  ```typescript
  // Przykład obiektu żądania
  {
    "preferences": {
      "goal": "hypertrophy",
      "system": "PPL",
      // ... reszta pól z UserPreferences
    }
  }
  ```
- **Typ odpowiedzi:** `GeneratePlanResponse`. Po otrzymaniu odpowiedzi, dane są zapisywane w stanie oraz w `localStorage`, a `viewState` jest zmieniany na `'preview'`.

### Zapisywanie planu

- **Endpoint:** `POST /api/plans`
- **Akcja:** Wywoływana przez funkcję `acceptPlan` w hooku `useAiPlannerGenerator`.
- **Typ żądania:** `CreatePlanRequest`. Obiekt ten jest konstruowany na podstawie danych z `previewData`.
  ```typescript
  // Przykład obiektu żądania
  const { plan, preferences } = previewData;
  const requestBody: CreatePlanRequest = {
    ...plan, // Zawiera name, effective_from, effective_to, schedule
    plan: { schedule: plan.schedule }, // Zgodnie z typem CreatePlanRequest
    source: "ai",
    preferences: preferences,
    prompt: null, // Prompt nie jest obecnie zwracany przez API
  };
  ```
- **Typ odpowiedzi:** `PlanResponse`. Po pomyślnym zapisaniu, `localStorage` jest czyszczony, a użytkownik jest przekierowywany do listy swoich planów.

## 8. Interakcje użytkownika

- **Wypełnienie formularza:** Użytkownik wybiera opcje w formularzu. Przycisk "Generuj plan" jest aktywny tylko wtedy, gdy formularz jest poprawnie wypełniony.
- **Generowanie planu:** Kliknięcie "Generuj plan" blokuje formularz, wyświetla wskaźnik ładowania i inicjuje zapytanie do API.
- **Podgląd - Akceptacja:** Kliknięcie "Zaakceptuj i zapisz" inicjuje zapytanie zapisu planu. W trakcie zapytania przyciski są zablokowane. Po sukcesie następuje przekierowanie.
- **Podgląd - Odrzucenie:** Kliknięcie "Odrzuć" powoduje powrót do widoku pustego formularza, a dane podglądu są usuwane.
- **Podgląd - Edycja:** Kliknięcie "Edytuj" przekierowuje użytkownika do widoku edycji planu, z wstępnie wypełnionymi danymi (implementacja tego widoku jest poza zakresem tego planu).
- **Odświeżenie strony:** Jeśli użytkownik odświeży stronę w stanie podglądu, dane zostaną odtworzone z `localStorage`, a widok podglądu zostanie wyświetlony ponownie.

## 9. Warunki i walidacja

- **Walidacja po stronie klienta (w `PlannerForm`):**
  - **Cel i System:** Pola wymagane.
  - **Dni dostępne:** Użytkownik musi zaznaczyć co najmniej jeden dzień. Interfejs uniemożliwi wysłanie formularza, dopóki warunek nie zostanie spełniony (przycisk "Generuj plan" będzie nieaktywny).
  - **Czas trwania i długość cyklu:** Suwaki będą miały zdefiniowane minimalne, maksymalne i domyślne wartości, co zapobiega wprowadzeniu nieprawidłowych danych.
- **Wpływ na interfejs:**
  - Przycisk "Generuj plan" jest `disabled` do momentu, aż wszystkie warunki walidacji formularza zostaną spełnione.
  - Komunikaty o błędach walidacji będą wyświetlane pod odpowiednimi polami formularza.

## 10. Obsługa błędów

- **Błąd walidacji z API (`400 Bad Request`):** Jeśli API zwróci błąd walidacji, komunikat zostanie wyświetlony użytkownikowi, np. za pomocą komponentu `Toast` lub `Alert` z `Shadcn/ui`. Jeśli błąd dotyczy konkretnych pól, zostaną one podświetlone (jeśli to możliwe).
- **Błąd generowania przez AI (`500 Internal Server Error`):** W przypadku błędu serwera podczas generowania planu, użytkownikowi zostanie wyświetlony ogólny komunikat, np. "Wystąpił błąd podczas generowania planu. Spróbuj ponownie później." Widok pozostanie na etapie formularza.
- **Błąd zapisu planu (`400` lub `500`):** Jeśli zapis planu się nie powiedzie (np. z powodu konfliktu dat), użytkownik pozostanie na ekranie podglądu, a stosowny komunikat błędu (np. "Ten plan koliduje z datami istniejącego planu.") zostanie wyświetlony.

## 11. Kroki implementacji

1. **Utworzenie plików:** Stworzenie pliku strony Astro `/src/pages/generate.astro` oraz plików dla komponentów React: `AiPlannerGeneratorView.tsx`, `PlannerForm.tsx`, `PlanPreview.tsx`, `WorkoutDayCard.tsx` w katalogu `/src/components/`.
2. **Implementacja `PlannerForm`:** Zbudowanie formularza przy użyciu `Shadcn/ui`, `react-hook-form` i `zod` do walidacji schematu `UserPreferences`.
3. **Implementacja `useAiPlannerGenerator`:** Stworzenie hooka z podstawową logiką zarządzania stanem (`viewState`) i interakcją z `localStorage`.
4. **Integracja API - generowanie:** Zaimplementowanie w hooku funkcji `generatePlan`, która będzie wysyłać żądanie `POST /api/plans/generate` i obsługiwać odpowiedź oraz błędy.
5. **Implementacja `PlanPreview`:** Zbudowanie komponentu do wyświetlania danych z `GeneratePlanResponse`, w tym komponentu `WorkoutDayCard`.
6. **Połączenie widoków:** Zaimplementowanie w `AiPlannerGeneratorView` logiki renderowania warunkowego, która będzie przełączać się między `PlannerForm` a `PlanPreview` w zależności od `viewState` z hooka.
7. **Integracja API - zapis:** Zaimplementowanie w hooku funkcji `acceptPlan`, która będzie konstruować `CreatePlanRequest` i wysyłać żądanie `POST /api/plans`.
8. **Finalizacja obsługi interakcji:** Podłączenie funkcji `rejectPlan` i `editPlan` do przycisków w `PlanPreview`.
9. **Styling i UX:** Dopracowanie stylów za pomocą `Tailwind CSS`, dodanie animacji, wskaźników ładowania i komunikatów `Toast` dla lepszego doświadczenia użytkownika.
10. **Testowanie manualne:** Przetestowanie całego przepływu: wypełnianie formularza, obsługa błędów walidacji, generowanie planu, obsługa błędów API, akceptacja, odrzucenie i trwałość stanu po odświeżeniu strony.
