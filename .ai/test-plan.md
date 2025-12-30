# Plan Testów - GymPlanner AI

## 1. Wprowadzenie i cel testów
GymPlanner to aplikacja webowa wykorzystująca sztuczną inteligencję do generowania spersonalizowanych planów treningowych. Celem niniejszego planu testów jest zapewnienie niezawodności kluczowych funkcji biznesowych, poprawności generowanych danych oraz stabilności interfejsu użytkownika. Ze względu na wykorzystanie zewnętrznych usług AI (OpenRouter) oraz modelu Serverless (Astro + Supabase), testy muszą skupić się na obsłudze błędów i spójności danych.

## 2. Zakres testów

### W zakresie (In-Scope):
*   **Logika biznesowa**: Serwisy w `src/lib/services` (szczególnie `aiPlannerService` i `sessionService`).
*   **API Endpoints**: Endpointy w `src/pages/api` obsługujące generowanie planów i zarządzanie sesjami.
*   **Interfejs użytkownika**: Komponenty React odpowiedzialne za interakcję (Timer, Edytor planu).
*   **Integracja**: Komunikacja aplikacji z API OpenRouter (poprzez mockowanie) i Supabase.
*   **Ścieżki krytyczne**: Rejestracja, Generowanie planu, Przeprowadzenie treningu.

### Poza zakresem (Out-of-Scope):
*   Testowanie wydajności i dostępności samej platformy Supabase.
*   Testowanie jakości modeli AI (oceniamy poprawność formatu odpowiedzi, a nie merytorykę treningową modelu).
*   Testy obciążeniowe (Load Testing) na tym etapie projektu.

## 3. Strategia testowania
Projekt wykorzystuje nowoczesny stack (Astro 5, Vite, React 19), dlatego strategia opiera się na narzędziach natywnych dla tego ekosystemu ("Testing Trophy"). Kluczowe jest rozróżnienie strategii dla komponentów interaktywnych (React) i statycznych/serwerowych (Astro).

### Macierz Strategii Testowania

| Warstwa | Narzędzie | Zakres i podejście |
|---------|-----------|-------------------|
| **Utils & Schemas** | **Vitest** | 100% testów jednostkowych (szybkie, izolowane). Snapshot testing dla schematów Zod. |
| **Services** | **Vitest** + `vi.mock` / `vitest-mock-extended` | Testy jednostkowe i integracyjne z mockowanym klientem Supabase/OpenRouter. |
| **Hooks** | **Vitest** + **RTL** (`renderHook`) | Testowanie logiki stanowej React w izolacji. |
| **Komponenty React** | **Vitest** + **RTL** + `user-event` | Testy komponentów interaktywnych. Symulacja zachowań użytkownika (kliknięcia, formularze). |
| **Komponenty Astro** | **Playwright** | Tylko testy E2E. Vitest nie renderuje natywnie plików `.astro`, więc testujemy je w przeglądarce. |
| **API Endpoints** | **Vitest** + **MSW** | Testy integracyjne endpointów API. Mockowanie warstwy sieciowej. |
| **Ścieżki Krytyczne** | **Playwright** | Pełne scenariusze użytkownika (E2E) w rzeczywistej przeglądarce. |

## 4. Środowisko testowe

Zaktualizowany zestaw narzędzi dostosowany do React 19 i Astro 5:

*   **Runner testów**: **Vitest** (z `vite.config.ts`).
    *   Dodatek: **@vitest/ui** – wizualny dashboard do debugowania testów.
    *   Pokrycie kodu: **@vitest/coverage-v8** (szybki provider V8).
*   **Testowanie Komponentów**:
    *   **React Testing Library** (@testing-library/react `^16.0.0` - wymagane dla React 19).
    *   **@testing-library/user-event** – do realistycznej symulacji interakcji (hover, focus, typing) zamiast prostego `fireEvent`.
    *   **@testing-library/jest-dom** – niestandardowe asercje DOM.
*   **Testy E2E**: **Playwright**
    *   Najlepsze wsparcie dla aplikacji Multi-Page (Astro) i Hydration.
*   **Mockowanie**:
    *   **Vitest Mocks (`vi.mock`)**: Do prostych testów jednostkowych.
    *   **MSW (Mock Service Worker)**: Do testów integracyjnych API i złożonych scenariuszy sieciowych.
    *   **vitest-mock-extended**: Do typowanych mocków TypeScript (przydatne przy Supabase Client).

## 5. Typy testów do przeprowadzenia

### A. Testy Jednostkowe (Unit Tests)
Fokus na izolowanej logice biznesowej.
*   **Cel**: `src/lib/schemas`, `src/lib/utils.ts`, `src/hooks`.
*   **Szczegóły**: Snapshot testing dla walidacji Zod. Testowanie edge-case'ów w utility functions.

### B. Testy Integracyjne (Integration Tests)
Fokus na współpracy serwisu z API i bazą danych (na mockach).
*   **Cel**: `src/pages/api`, `src/lib/services`.
*   **Podejście Hybrydowe**: Użycie MSW do przechwytywania zapytań HTTP wychodzących z serwisów (np. do OpenRouter) oraz mockowanie klienta Supabase.

### C. Testy Komponentów (Component Tests)
Fokus na interaktywnych częściach UI (React Islands).
*   **Cel**: `ActiveSessionView`, `PlannerForm`.
*   **Szczegóły**: Weryfikacja dostępności (a11y) i interakcji z użyciem `user-event`.

### D. Testy E2E (End-to-End)
Weryfikacja pełnych ścieżek użytkownika i renderowania stron Astro.
*   **Cel**: Routing, Hydration, Auth Flow.
*   **Szczegóły**: Scenariusze krytyczne uruchamiane na silnikach Chromium/Webkit.

## 6. Priorytetyzacja obszarów testowania

| Priorytet | Komponent/Moduł | Uzasadnienie | Typ testu |
| :--- | :--- | :--- | :--- |
| **KRYTYCZNY** | `src/lib/services/aiPlannerService.ts` | Błędne parsowanie odpowiedzi AI zepsuje główną funkcjonalność. | Unit/Int (Vitest) |
| **KRYTYCZNY** | `src/components/session/ActiveSessionView.tsx` | Skomplikowany stan (timer, serie). Ryzyko utraty danych treningowych. | Component (RTL) |
| **WYSOKI** | `src/pages/api/plans/generate.ts` | Główny punkt wejścia. Integracja formularza z AI. | Integration (MSW) |
| **WYSOKI** | `src/hooks/useWorkoutTimer.ts` | Logika czasu musi być precyzyjna i odporna na re-render. | Unit (RTL Hook) |
| **ŚREDNI** | Rejestracja i Logowanie | Kluczowe, ale oparte na gotowym SDK. | E2E (Playwright) |

## 7. Kryteria akceptacji

Plan testów uznaje się za zrealizowany, gdy:
1.  Skonfigurowano środowisko testowe z Vitest UI i Playwright.
2.  Zaimplementowano pipeline CI (GitHub Actions) uruchamiający `npm test`.
3.  Osiągnięto **100% pokrycia** dla plików w `src/lib/schemas` i `src/lib/utils.ts`.
4.  Krytyczne ścieżki (Generowanie, Trening) są pokryte przynajmniej jednym testem E2E.
5.  Wszystkie testy przechodzą na środowisku lokalnym i CI.

## 8. Harmonogram i zasoby

*   **Etap 1: Setup (1 dzień)**
    *   Instalacja pakietów (`vitest`, `jsdom`, `rtl`, `msw`, `playwright`).
    *   Konfiguracja `vitest.config.ts`.
*   **Etap 2: Unit & Logic (2 dni)**
    *   Testy utils i serwisów z użyciem `vi.mock`.
*   **Etap 3: React Components (2-3 dni)**
    *   Testy hooków i komponentów UI z `user-event`.
*   **Etap 4: Integration & E2E (3 dni)**
    *   Konfiguracja MSW handlers.
    *   Napisanie scenariuszy Playwright dla stron Astro.

## 9. Ryzyka i założenia

*   **Kompatybilność React 19**: Niektóre biblioteki testowe mogą wymagać najnowszych wersji (alpha/beta) lub flag konfiguracyjnych.
*   **Astro Islands**: Testowanie interakcji między statycznym HTML (Astro) a dynamicznym JS (React) jest możliwe tylko w E2E (Playwright).
*   **Supabase Mocking**: Mockowanie całej biblioteki `@supabase/supabase-js` może być skomplikowane; zalecane użycie `vitest-mock-extended` dla zachowania typów.

---

### Przykładowy konfig (vitest.config.ts reference)

```typescript
/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
    },
    // Wykluczenie testów E2E z runnera unit testów
    exclude: ['**/e2e/**', '**/node_modules/**'],
  },
});
```
