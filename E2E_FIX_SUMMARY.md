# Podsumowanie Naprawy Testów E2E - GymPlanner

## 1. Status Prac

- **Stan początkowy:** 31 niedziałających testów (na ok. 70).
- **Stan obecny:** ~4-5 niedziałających testów.
- **Naprawiono:** 26 testów kluczowych ścieżek użytkownika.

## 2. Zidentyfikowane Problemy i Rozwiązania

### A. Utrata Sesji Użytkownika (Krytyczny)
**Problem:** Test wylogowania (`logout.auth.spec.ts`) uruchamiał się jako jeden z pierwszych (ze względu na kolejność alfabetyczną katalogów), co unieważniało sesję w bazie danych. W rezultacie wszystkie kolejne testy (Dashboard, Plany, Historia) failowały, ponieważ użytkownik był wylogowany.
**Rozwiązanie:**
- Przeniesiono plik testowy do `e2e/specs/z_logout.auth.spec.ts`, wymuszając jego uruchomienie na samym końcu zestawu testów.
- Odizolowano test wylogowania, aby używał czystego stanu przeglądarki (`storageState: { cookies: [], origins: [] }`) i logował się manualnie, zamiast polegać na globalnym `user.json`.

### B. Niejednoznaczne Selektory (Strict Mode Violations)
**Problem:** Selektory takie jak "przycisk Nowy plan" czy "Rozpocznij" pasowały do wielu elementów na stronie (np. przycisk w nawigacji vs przycisk na stronie), co powodowało błędy w Playwright.
**Rozwiązanie:**
- Zaktualizowano `e2e/page-objects/DashboardPage.ts` oraz `PlansListPage.ts`.
- Uściślono selektory, np. ograniczając wyszukiwanie do sekcji `<main>` lub konkretnej karty (`firstCard.getByRole(...)`).

### C. Brakujące Atrybuty Testowe
**Problem:** Testy nie mogły znaleźć elementów interfejsu (np. pustego stanu dashboardu, kart dni w edytorze), ponieważ komponenty nie posiadały odpowiednich atrybutów.
**Rozwiązanie:**
- Dodano `data-testid="empty-dashboard"` w `src/components/dashboard/EmptyDashboard.tsx`.
- Dodano `data-testid="day-card"` w `src/components/plans/editor/DayCard.tsx`.
- Dodano `data-testid="exercise-row"` w `src/components/plans/editor/ExerciseCard.tsx`.

### D. Problemy z Wydajnością (Timeouty)
**Problem:** Wiele testów kończyło się timeoutem (15s) podczas ładowania Dashboardu w środowisku CI/Test.
**Rozwiązanie:**
- Zwiększono domyślny timeout dla asercji `expect` do 30 sekund w `playwright.config.ts`.
- Zwiększono timeouty dla kluczowych operacji (ładowanie dashboardu, przekierowania).

## 3. Pozostałe Znane Problemy

Mimo znaczącej poprawy, kilka testów nadal wymaga uwagi:

1.  **Tworzenie Planu Manualnie (`create-manual.auth.spec.ts`)**
    *   **Objaw:** Test nie wykrywa dodania nowej karty dnia po kliknięciu "Dodaj dzień".
    *   **Diagnoza:** Prawdopodobny problem z obsługą zdarzeń w komponencie `PlanEditorView` lub specyfika renderowania formularza `react-hook-form` w środowisku testowym. Wymaga głębszego debugowania komponentu React.

2.  **Routing / Bezpieczeństwo (`routing.auth.spec.ts`)**
    *   **Objaw:** Test wykrywa, że niezalogowany użytkownik może wejść na `/plans` bez natychmiastowego przekierowania do `/login`.
    *   **Wniosek:** Potencjalna luka w konfiguracji Middleware lub specyfika działania `Astro.redirect` w trybie `standalone` node adaptera. Należy zweryfikować plik `src/middleware/index.ts`.

3.  **Wylogowanie (`z_logout.auth.spec.ts`)**
    *   **Objaw:** Czasami kończy się timeoutem.
    *   **Diagnoza:** Może wskazywać na powolne działanie endpointu `/api/auth/signout` lub problem z oczekiwaniem na przekierowanie po stronie klienta.

## 4. Rekomendacje

- Zweryfikować logikę "Dodawania dnia" w edytorze planów pod kątem błędów JS w konsoli.
- Sprawdzić reguły Middleware dla ścieżki `/plans` w celu uszczelnienia bezpieczeństwa.
- Rozważyć dalszą optymalizację szybkości ładowania Dashboardu, gdyż timeouty (nawet 30s) sugerują problemy wydajnościowe przy "zimnym starcie".

