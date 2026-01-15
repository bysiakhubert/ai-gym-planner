# Generator Planu Treningowego AI - Dokumentacja testdsdsds

## Przegląd

Widok Generatora Planu Treningowego AI umożliwia użytkownikom generowanie spersonalizowanych planów treningowych przy użyciu sztucznej inteligencji. Aplikacja prowadzi użytkownika przez proces od wypełnienia formularza z preferencjami, przez generowanie planu, podgląd, aż do zapisania go w systemie.

## Struktura komponentów

### Główne komponenty

```
/src/pages/generate.astro
  └─ AiPlannerGeneratorView (React)
      ├─ PlannerForm (formularz)
      ├─ LoadingSpinner (ładowanie)
      └─ PlanPreview (podgląd)
          ├─ SafetyDisclaimer
          └─ WorkoutDayCard (dla każdego dnia)
```

### 1. `/src/pages/generate.astro`
Strona Astro, która renderuje główny komponent React.
- **Routing:** `/generate`
- **Prerendering:** Wyłączony (`export const prerender = false`)
- **Hydration:** `client:load`

### 2. `AiPlannerGeneratorView.tsx`
Główny komponent zarządzający stanem całego widoku.

**Stany widoku:**
- `form` - wyświetla formularz
- `loading` - pokazuje wskaźnik ładowania podczas generowania
- `preview` - wyświetla podgląd wygenerowanego planu
- `error` - pokazuje komunikat błędu

### 3. `PlannerForm.tsx`
Formularz zbierający preferencje użytkownika.

**Pola formularza:**
- **Cel treningowy** (select): hypertrofia, siła, wytrzymałość, redukcja
- **System treningowy** (select): PPL, FBW, Upper/Lower, Bro Split
- **Dostępne dni** (checkbox): wybór dni tygodnia
- **Czas trwania sesji** (slider): 30-180 minut
- **Długość cyklu** (slider): 1-12 tygodni
- **Uwagi** (textarea): opcjonalne dodatkowe informacje

**Walidacja:**
- Używa `react-hook-form` + `zod`
- Wszystkie pola oprócz uwag są wymagane
- Co najmniej jeden dzień musi być zaznaczony
- Przycisk submit jest disabled do czasu poprawnego wypełnienia

### 4. `PlanPreview.tsx`
Komponent wyświetlający podgląd wygenerowanego planu.

**Sekcje:**
- Header z nazwą i opisem planu
- Metadane (okres, cel, parametry) w responsywnym grid
- Klauzula bezpieczeństwa (`SafetyDisclaimer`)
- Lista dni treningowych (mapowanie `WorkoutDayCard`)
- Opcjonalne uwagi użytkownika
- Sticky footer z przyciskami akcji

**Przyciski akcji:**
- **Odrzuć** - usuwa dane z localStorage i wraca do formularza
- **Edytuj** - przekierowuje do widoku edycji (stub)
- **Zaakceptuj i zapisz** - zapisuje plan w bazie danych

### 5. `WorkoutDayCard.tsx`
Komponent prezentacyjny dla pojedynczego dnia treningowego.

**Wyświetla:**
- Nazwę dnia treningowego
- Datę (sformatowaną z użyciem `Intl.DateTimeFormat`)
- Listę ćwiczeń
- Dla każdego ćwiczenia: serie, powtórzenia, ciężar, czas przerwy

### 6. `SafetyDisclaimer.tsx`
Alert z ważnymi informacjami bezpieczeństwa.

**Ostrzeżenia:**
- Plan ma charakter informacyjny
- Zalecenie konsultacji z lekarzem
- Instrukcje dotyczące bólu/dyskomfortu
- Przypomnienie o rozgrzewce i stretchingu

## Zarządzanie stanem

### Hook: `useAiPlannerGenerator`

Centralizuje całą logikę biznesową widoku.

**Zmienne stanu:**
```typescript
viewState: 'form' | 'loading' | 'preview' | 'error'
previewData: GeneratePlanResponse | null
error: ApiError | null
isSaving: boolean
```

**Funkcje:**

#### `generatePlan(preferences: UserPreferences)`
- Wysyła request do `POST /api/plans/generate`
- Zapisuje wynik w localStorage
- Wyświetla toast z informacją o sukcesie/błędzie
- Zmienia viewState na 'preview' lub 'error'

#### `acceptPlan()`
- Konstruuje `CreatePlanRequest` z danych podglądu
- Wysyła request do `POST /api/plans`
- Usuwa dane z localStorage po sukcesie
- Przekierowuje do `/plans` po opóźnieniu 1s
- Wyświetla toast z informacją o zapisie

#### `rejectPlan()`
- Usuwa dane z localStorage
- Resetuje stan do 'form'
- Wyświetla info toast

#### `editPlan()`
- Zapisuje dane w localStorage jako 'plan_to_edit'
- Przekierowuje do `/plans/edit` (do implementacji)

**localStorage persistence:**
- Klucz: `ai_planner_preview`
- Przy załadowaniu sprawdza czy są zapisane dane
- Automatycznie przywraca stan podglądu po odświeżeniu

## Integracja API

### Endpoint 1: Generowanie podglądu planu
**URL:** `POST /api/plans/generate`

**Request:**
```typescript
{
  "preferences": {
    "goal": "hypertrophy",
    "system": "PPL",
    "available_days": ["monday", "wednesday", "friday"],
    "session_duration_minutes": 60,
    "cycle_duration_weeks": 4,
    "notes": "Opcjonalne uwagi..."
  }
}
```

**Response (200):**
```typescript
{
  "plan": {
    "name": "Plan PPL - Hipertrofia",
    "effective_from": "2024-01-15T00:00:00Z",
    "effective_to": "2024-02-11T23:59:59Z",
    "schedule": {
      "2024-01-15": {
        "name": "Push Day",
        "exercises": [...],
        "done": false
      },
      ...
    }
  },
  "preferences": {...},
  "metadata": {
    "model": "gpt-4",
    "generation_time_ms": 3542
  }
}
```

**Błędy:**
- `400` - Błąd walidacji
- `429` - Rate limiting (max 10 requestów/godzinę)
- `500` - Błąd generowania AI

### Endpoint 2: Zapisywanie planu
**URL:** `POST /api/plans`

**Request:**
```typescript
{
  "name": "Plan PPL - Hipertrofia",
  "effective_from": "2024-01-15T00:00:00Z",
  "effective_to": "2024-02-11T23:59:59Z",
  "source": "ai",
  "prompt": null,
  "preferences": {...},
  "plan": {
    "schedule": {...}
  }
}
```

**Response (201):**
```typescript
{
  "id": "uuid-here",
  "user_id": "uuid-here",
  "name": "Plan PPL - Hipertrofia",
  // ... wszystkie pola planu
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Błędy:**
- `400` - Błąd walidacji lub konflikty dat
- `500` - Błąd serwera

## Komunikaty Toast

Aplikacja używa `sonner` do wyświetlania komunikatów:

- **Loading toast** - podczas generowania i zapisywania
- **Success toast** - po pomyślnym wygenerowaniu/zapisaniu
- **Error toast** - w przypadku błędów
- **Info toast** - po odrzuceniu planu

Toasty są automatycznie aktualizowane (używają tego samego `id`).

## Accessibility (A11y)

### ARIA attributes
- `role="region"` dla głównych sekcji
- `role="list"` i `role="listitem"` dla list
- `aria-label` i `aria-labelledby` dla opisów
- `aria-hidden="true"` dla ikon dekoracyjnych
- `aria-label` na przyciskach dla kontekstu

### Semantic HTML
- `<section>` dla sekcji treści
- `<time>` dla dat z `dateTime` attribute
- `<h1>`, `<h2>`, `<h4>` dla hierarchii nagłówków

### Keyboard navigation
- Wszystkie interaktywne elementy dostępne z klawiatury
- Poprawne focus states
- Disabled states dla przycisków podczas operacji

## Responsywność

### Breakpointy
- Mobile: < 640px
- Tablet/Desktop: ≥ 640px (sm:)

### Adaptacje
- **Padding**: `p-4 sm:p-6`
- **Grid metadanych**: 1 kolumna → 3 kolumny na desktop
- **Przyciski**: kolumna → rząd na desktop (`flex-col sm:flex-row`)
- **Tytuły**: mniejsze na mobile (`text-2xl sm:text-3xl`)
- **Sticky footer**: dopasowany margin/padding

### Flex wrap
- Serie ćwiczeń używają `flex-wrap` aby zawijać na małych ekranach

## Obsługa błędów i edge case'ów

### Brak dni treningowych
Jeśli `schedule` jest pusty, wyświetlany jest Alert z sugestią ponownego wygenerowania.

### Brak ćwiczeń
WorkoutDayCard sprawdza czy `exercises.length > 0` i wyświetla komunikat jeśli brak.

### Błędy API
- Wyświetlane jako Alert w widoku formularza
- Toast z konkretnym komunikatem błędu
- Użytkownik pozostaje w kontekście (nie traci danych formularza przy błędzie generowania)

### Rate limiting
Backend ogranicza do 10 requestów/godzinę. Toast wyświetla odpowiedni komunikat.

## Pliki w projekcie

```
src/
├── pages/
│   └── generate.astro                 # Strona Astro
├── components/
│   ├── AiPlannerGeneratorView.tsx    # Główny komponent
│   ├── PlannerForm.tsx                # Formularz
│   ├── PlanPreview.tsx                # Podgląd planu
│   ├── WorkoutDayCard.tsx             # Karta dnia treningowego
│   ├── SafetyDisclaimer.tsx           # Klauzula bezpieczeństwa
│   └── ui/                            # Komponenty Shadcn/ui
├── hooks/
│   └── useAiPlannerGenerator.ts       # Hook zarządzający stanem
├── types.ts                           # Typy TypeScript
└── lib/
    └── schemas/
        └── plans.ts                   # Schematy walidacji Zod
```

## Testowanie

### Scenariusze testowe

1. **Happy path:**
   - Wypełnij formularz → Wygeneruj plan → Zaakceptuj → Sprawdź przekierowanie

2. **Walidacja formularza:**
   - Spróbuj wysłać pusty formularz (przycisk disabled)
   - Wypełnij częściowo → sprawdź komunikaty błędów

3. **Odświeżenie strony:**
   - Wygeneruj plan → Odśwież stronę → Sprawdź czy dane są zachowane

4. **Odrzucenie planu:**
   - Wygeneruj plan → Odrzuć → Sprawdź czy formularz jest pusty

5. **Błędy API:**
   - Symuluj błąd 500 → Sprawdź wyświetlenie komunikatu

6. **Responsywność:**
   - Testuj na różnych rozmiarach ekranu (mobile, tablet, desktop)

## Zależności

### Nowe zależności dodane:
- `react-hook-form` - zarządzanie formularzem
- `zod` - walidacja schematów
- `@hookform/resolvers` - integracja zod z react-hook-form
- `sonner` - biblioteka do toastów

### Komponenty Shadcn/ui:
- form, select, checkbox, slider, textarea
- card, alert, button, sonner

## Uwagi implementacyjne

### localStorage
Dane są przechowywane jako JSON string. W przypadku błędu parsowania są automatycznie usuwane.

### Przekierowania
Używamy `window.location.href` zamiast routingu po stronie klienta, ponieważ Astro nie ma built-in client-side routera.

### TypeScript
Wszystkie typy są importowane z `src/types.ts` aby zachować spójność z API.

### Formatowanie dat
Używamy `Intl.DateTimeFormat` z locale 'pl-PL' dla poprawnego formatowania dat w języku polskim.

## Przyszłe usprawnienia

1. **Widok edycji planu** - obecnie tylko stub
2. **Zapisywanie drafts** - możliwość zapisania niedokończonego formularza
3. **Historia wygenerowanych planów** - przed zapisem
4. **Eksport planu** - do PDF lub druku
5. **Porównanie planów** - side-by-side przed wyborem
6. **Animacje przejść** - między stanami widoku
7. **Optymistyczne UI** - natychmiastowa reakcja interfejsu
8. **Offline mode** - obsługa braku połączenia

