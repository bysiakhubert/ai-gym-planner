# Specyfikacja Techniczna Modułu Autentykacji (Auth Spec)

**Status:** Draft
**Data:** 2025-12-29
**Powiązane wymagania:** US-001 (Rejestracja), US-002 (Logowanie), US-003 (Wylogowanie - implicite), US-002 p.8 (Odzyskiwanie hasła)
**Tech Stack:** Astro 5 (SSR), React 19, Supabase Auth, Tailwind 4, Zod.

---

## 1. Architektura Interfejsu Użytkownika (Frontend)

Wdrożenie autentykacji wymaga separacji widoków publicznych (auth) od prywatnych (dashboard). Ze względu na wykorzystanie Astro w trybie SSR, kluczowe jest zarządzanie stanem sesji zarówno po stronie serwera (pliki cookie), jak i klienta (Shadcn/React).

### 1.1. Nowe strony i routing (Astro)

Należy utworzyć dedykowaną ścieżkę dla stron autentykacji, aby oddzielić je logicznie od aplikacji właściwej.

*   **`/login` (`src/pages/login.astro`)**:
    *   Strona logowania.
    *   Sprawdza po stronie serwera, czy użytkownik ma sesję. Jeśli tak -> przekierowanie na `/`.
    *   Renderuje komponent `LoginForm` (React).
*   **`/register` (`src/pages/register.astro`)**:
    *   Strona rejestracji.
    *   Podobnie jak login, blokuje dostęp dla zalogowanych.
    *   Renderuje komponent `RegisterForm` (React).
*   **`/forgot-password` (`src/pages/forgot-password.astro`)**:
    *   Strona inicjująca proces resetowania hasła.
    *   Renderuje `ForgotPasswordForm` (React).
*   **`/auth/callback` (`src/pages/auth/callback.ts`)**:
    *   Endpoint API (nie strona UI) obsługujący powroty z linków magicznych (potwierdzenie emaila, reset hasła) w celu wymiany kodu `code` na sesję.

### 1.2. Layouty (`src/layouts`)

Należy wprowadzić rozróżnienie layoutów:

1.  **`AuthLayout.astro` (Nowy)**:
    *   Uproszczony layout bez paska nawigacyjnego (Sidebar/Navigation) i stopki aplikacji.
    *   Centralnie wyśrodkowany kontener (karta) na formularze.
    *   Logo aplikacji i powrót do strony głównej (jeśli dotyczy).
    *   Cel: Maksymalne skupienie na procesie logowania/rejestracji.
2.  **`Layout.astro` (Istniejący)**:
    *   Modyfikacja: Musi dynamicznie renderować nawigację (`Navigation.astro`) tylko dla zalogowanych użytkowników lub przyjmować prop `isAuthenticated`.
    *   Warunkowe wyświetlanie przycisku "Wyloguj" w nawigacji.

### 1.3. Komponenty React (`src/components/auth/`)

Wszystkie formularze będą komponentami klienckimi (`client:load`), korzystającymi z `react-hook-form` oraz `zod` do walidacji.

*   **`LoginForm.tsx`**:
    *   Pola: Email, Password.
    *   Akcja: `POST` do `/api/auth/signin`.
    *   Obsługa błędów: "Nieprawidłowy email lub hasło".
    *   Link pomocniczy: "Nie masz konta? Zarejestruj się" oraz "Zapomniałeś hasła?".
*   **`RegisterForm.tsx`**:
    *   Pola: Email, Password, Confirm Password.
    *   Walidacja: Zgodność haseł, siła hasła (min. 8 znaków).
    *   Akcja: `POST` do `/api/auth/register`.
    *   Obsługa błędów: "Użytkownik o takim emailu już istnieje".
*   **`ForgotPasswordForm.tsx`**:
    *   Pola: Email.
    *   Akcja: Wywołanie metody Supabase SDK lub endpointu API do wysłania linku resetującego.

### 1.4. Walidacja i Feedback (UX)

*   **Walidacja:** Schematy Zod (`src/lib/schemas/auth.ts`) współdzielone między frontendem a backendem.
*   **Feedback:** Użycie komponentu `sonner` (Toast) do wyświetlania sukcesów (np. "Link wysłany") i błędów krytycznych. Błędy walidacji formularza wyświetlane inline pod polami input (Shadcn `FormMessage`).

---

## 2. Logika Backendowa (Astro + API)

Ze względu na konfigurację `output: 'server'`, autentykacja musi opierać się na plikach Cookie przesyłanych między klientem a serwerem Astro.

### 2.1. Middleware (`src/middleware/index.ts`)

To serce systemu bezpieczeństwa. Middleware zostanie rozbudowane o:

1.  **Inicjalizację klienta Supabase SSR:** Tworzenie klienta z kontekstem requestu i response (do parsowania i ustawiania ciasteczek).
2.  **Odświeżanie sesji:** Wywołanie `getUser` (bezpieczniejsze niż `getSession`) w celu weryfikacji tokena JWT.
3.  **Routing Guard (Ochrona tras):**
    *   Tablica tras chronionych: `['/dashboard', '/plans', '/history', '/session', '/api/plans', '/api/sessions']` (lub prościej: wszystko co nie jest publiczne).
    *   Jeśli brak sesji i próba dostępu do chronionej trasy -> Redirect `302` do `/login`.
    *   Jeśli sesja aktywna i próba dostępu do `/login` lub `/register` -> Redirect `302` do `/` (dashboardu).

### 2.2. Endpointy API (`src/pages/api/auth/`)

Zamiast wykonywać logikę autentykacji w 100% po stronie klienta (co utrudnia SSR), formularze będą wysyłać dane do endpointów API Astro, które następnie komunikują się z Supabase i ustawiają ciasteczka HTTP-only.

*   **`POST /api/auth/register`**:
    *   Odbiera JSON `{ email, password }`.
    *   Wywołuje `supabase.auth.signUp`.
    *   Zwraca 200 OK lub błąd (400/409).
*   **`POST /api/auth/signin`**:
    *   Odbiera JSON `{ email, password }`.
    *   Wywołuje `supabase.auth.signInWithPassword`.
    *   Ważne: Po udanym logowaniu Supabase (via `@supabase/ssr`) automatycznie obsłuży nagłówki `Set-Cookie`.
    *   Zwraca przekierowanie lub JSON informujący o sukcesie.
*   **`POST /api/auth/signout`**:
    *   Wywołuje `supabase.auth.signOut`.
    *   Czyści ciasteczka sesyjne.
    *   Przekierowuje na `/login`.

### 2.3. Modele Danych

*   Brak zmian w schemacie bazy danych (`auth.users` jest zarządzane wewnętrznie przez Supabase).
*   Należy utworzyć plik `src/lib/schemas/auth.ts` zawierający definicje Zod dla payloadów rejestracji i logowania.

---

## 3. System Autentykacji (Supabase Integration)

Wykorzystanie biblioteki `@supabase/ssr` zamiast zwykłego `supabase-js` jest krytyczne dla frameworków typu Astro.

### 3.1. Konfiguracja Klienta (`src/db/supabase.client.ts` - do refaktoryzacji)

Obecny plik `supabase.client.ts` tworzy klienta typu singleton, co jest poprawne dla komponentów React (Client Component), ale **niepoprawne** dla kodu serwerowego Astro. Należy rozdzielić logikę:

1.  **`src/lib/supabase/server.ts`**:
    *   Funkcja tworząca klienta Supabase w oparciu o obiekt `Astro.cookies`. Używana w plikach `.astro`, middleware i endpointach API.
2.  **`src/lib/supabase/client.ts`**:
    *   Klient dla komponentów React (Browser Client). Używany w `LoginForm`, `RegisterForm` itp.

### 3.2. Przepływ danych (Flow)

1.  **Rejestracja:**
    User -> Formularz React -> `POST /api/auth/register` -> Supabase Auth -> Email z potwierdzeniem (opcjonalnie, zależy od ustawień projektu Supabase) -> Auto-login lub redirect do login.
2.  **Logowanie:**
    User -> Formularz React -> `POST /api/auth/signin` -> Supabase Auth -> `Set-Cookie` (access_token, refresh_token) -> Redirect do Dashboard.
3.  **Dostęp do strony chronionej (np. `/plans`):**
    Request -> Astro Middleware (odczyt cookie -> weryfikacja user) -> Jeśli OK: Render strony; Jeśli Błąd: Redirect `/login`.
4.  **Odzyskiwanie hasła:**
    User -> Formularz -> Supabase `resetPasswordForEmail` -> Email z linkiem -> Kliknięcie linku -> Przekierowanie do formularza zmiany hasła (wymaga update sesji).

### 3.3. Bezpieczeństwo

*   Wszystkie mutacje danych (tworzenie planów, edycja) w API (`src/lib/api/*`) muszą weryfikować użytkownika na podstawie kontekstu serwerowego, a nie danych przesłanych z klienta.
*   Wykorzystanie RLS (Row Level Security) w bazie Supabase jest obligatoryjne (polityki `auth.uid() = user_id`).

## 4. Plan Wdrożenia

1.  Instalacja `@supabase/ssr`.
2.  Refaktoryzacja `supabase.client.ts` na wersję server/client.
3.  Implementacja `AuthLayout` i stron `/login`, `/register`.
4.  Implementacja komponentów formularzy z walidacją Zod.
5.  Utworzenie endpointów API `/api/auth/*`.
6.  Aktualizacja Middleware o ochronę tras.
7.  Dostosowanie `Layout.astro` i komponentów nawigacji.





