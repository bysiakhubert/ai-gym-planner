# 🐛 Bugfix: Problem z rejestracją i przekierowaniem

**Data:** 2025-12-30  
**Status:** ✅ Naprawiono  
**Priorytet:** Krytyczny

---

## 🔍 Opis Problemu

Po zarejestrowaniu nowego użytkownika przez formularz rejestracji:

1. ❌ Użytkownik był przekierowywany na dashboard zamiast na stronę logowania
2. ❌ Na dashboardzie widoczny był błąd "Błąd ładowania"
3. ❌ W logach pojawił się błąd: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

### Oczekiwane Zachowanie (zgodnie z PRD)

> **US-001 p.4:** Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do głównego panelu aplikacji.

**UWAGA:** Po analizie z użytkownikiem ustalono, że PRD zawiera błąd. Poprawny flow to:
- Po rejestracji → przekierowanie na `/login`
- Użytkownik musi zalogować się **manualnie**
- Niezalogowany użytkownik nie ma dostępu do żadnej strony poza auth pages

---

## 🔎 Analiza Przyczyny

### Problem #1: Auto-login po rejestracji
```typescript
// src/pages/api/auth/register.ts (przed fix)
const { error } = await supabase.auth.signUp({ email, password });

// ⚠️ signUp automatycznie tworzy sesję w Supabase!
// User jest od razu zalogowany mimo że chcemy wymuszać manual login
```

**Efekt:**
- Middleware wykrywa sesję (`getUser()` zwraca user)
- Próba dostępu do `/login` → middleware przekierowuje na `/` (dashboard)
- Formularz próbuje przekierować na `/login`, ale middleware blokuje

### Problem #2: Fetch w Astro SSR
```astro
---
// src/pages/index.astro (przed fix)
const response = await fetch(new URL("/api/dashboard", Astro.url.origin));
const data = await response.json();
---
```

**Problemy z tym podejściem:**
1. W SSR fetch do własnego API może trafić na middleware redirects
2. Endpoint `/api/dashboard` zwraca 302 redirect (HTML) zamiast JSON gdy user nie jest zalogowany
3. `response.json()` próbuje sparsować HTML → błąd parsowania

---

## ✅ Rozwiązanie

### Fix #1: Wymuszenie wylogowania po rejestracji

**Plik:** `src/pages/api/auth/register.ts`

```typescript
// Attempt to create new user
const { error: signUpError } = await supabase.auth.signUp({
  email,
  password,
});

if (signUpError) {
  // ... handle error
}

// ✅ FIX: Sign out immediately after registration
// This ensures the user must log in manually
await supabase.auth.signOut();

// Return success with redirect to login
return new Response(
  JSON.stringify({
    success: true,
    message: "Konto zostało utworzone pomyślnie! Teraz możesz się zalogować.",
    redirectTo: "/login",
  }),
  { status: 201 }
);
```

**Rezultat:**
- User jest natychmiast wylogowany po rejestracji
- Middleware nie wykrywa sesji
- Przekierowanie na `/login` działa poprawnie

### Fix #2: Bezpośrednie użycie service w Astro SSR

**Plik:** `src/pages/index.astro`

```astro
---
import { DashboardService } from "@/lib/services/dashboard.service";

export const prerender = false;

const { supabase, user } = Astro.locals;

// Safety check
if (!user) {
  return Astro.redirect("/login");
}

// ✅ FIX: Use service directly instead of HTTP fetch
try {
  const dashboardService = new DashboardService(supabase, user.id);
  dashboardData = await dashboardService.getDashboardSummary();
} catch (error) {
  console.error("Dashboard fetch error:", error);
  errorMessage = "Wystąpił błąd podczas ładowania pulpitu.";
}
---
```

**Rezultat:**
- Brak HTTP fetch w SSR → brak problemów z redirects
- Bezpośredni dostęp do danych przez service layer
- Poprawna obsługa błędów

---

## 📋 Zmienione Pliki

### 1. `/src/pages/api/auth/register.ts`
- Dodano `await supabase.auth.signOut()` po `signUp()`
- Komentarz wyjaśniający dlaczego robimy signOut

### 2. `/src/pages/index.astro`
- Zmieniono fetch HTTP na bezpośrednie użycie `DashboardService`
- Dodano import `DashboardService`
- Dodano safety check z `Astro.redirect("/login")`

### 3. `/src/middleware/index.ts` ⭐ **BONUS FIX**
- Dodano różnicowanie między page routes a API routes
- API routes teraz zwracają 401 JSON zamiast HTML redirect
- Zapobiega błędom "Unexpected token '<'" w fetch calls

**Przed:**
```typescript
if (!user && !isPublic) {
  return redirect("/login"); // ❌ Zwraca HTML dla wszystkich ścieżek
}
```

**Po:**
```typescript
if (!user && !isPublic) {
  if (isApiRoute) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401 
    }); // ✅ JSON dla API
  }
  return redirect("/login"); // ✅ HTML redirect tylko dla pages
}
```

### 4. `.ai/auth-implementation-summary.md`
- Zaktualizowano opis endpointu `/api/auth/register`
- Zaktualizowano opis `RegisterForm.tsx`
- Poprawiono User Story US-001 (usunięto auto-login)

### 5. `.ai/AUTH_FAQ.md`
- Dodano Q&A o problemie z przekierowaniem po rejestracji
- Dodano Q&A o błędzie "Unexpected token '<'"
- Dodano przykład poprawnego użycia service w Astro SSR

---

## 🧪 Jak Przetestować

### Test Case 1: Rejestracja nowego użytkownika

```bash
# 1. Upewnij się że dev server działa
npm run dev

# 2. Otwórz przeglądarkę w trybie incognito
# 3. Przejdź do http://localhost:4321/register

# 4. Wypełnij formularz:
#    - Email: test@example.com
#    - Hasło: TestPassword123
#    - Potwierdź hasło: TestPassword123

# 5. Kliknij "Zarejestruj się"

# ✅ Oczekiwany rezultat:
# - Widzisz zielony alert "Konto zostało utworzone pomyślnie!"
# - Po 2 sekundach jesteś przekierowany na /login
# - NIE jesteś automatycznie zalogowany
```

### Test Case 2: Logowanie po rejestracji

```bash
# 1. Na stronie /login wpisz te same dane
# 2. Kliknij "Zaloguj się"

# ✅ Oczekiwany rezultat:
# - Jesteś przekierowany na dashboard (/)
# - Dashboard ładuje się bez błędów
# - Widzisz "Witaj z powrotem!" i aktualną datę
# - Jeśli jesteś nowym userem, widzisz EmptyDashboard z przyciskiem "Utwórz plan"
```

### Test Case 3: Próba dostępu do chronionych stron

```bash
# 1. Wyloguj się (jeśli jest przycisk wyloguj w UI)
# 2. Lub usuń cookies w DevTools

# 3. Spróbuj wejść na:
#    - http://localhost:4321/
#    - http://localhost:4321/plans
#    - http://localhost:4321/history

# ✅ Oczekiwany rezultat:
# - Dla każdej z tych ścieżek jesteś przekierowany na /login
# - W URL widzisz http://localhost:4321/login
```

### Test Case 4: Próba dostępu do /login gdy jesteś zalogowany

```bash
# 1. Zaloguj się normalnie
# 2. W URL wpisz ręcznie http://localhost:4321/login

# ✅ Oczekiwany rezultat:
# - Jesteś natychmiast przekierowany na / (dashboard)
# - Nie widzisz formularza logowania
```

---

## 🎯 Zgodność z PRD

### US-001: Rejestracja nowego użytkownika

| Kryterium | Status | Notatka |
|-----------|--------|---------|
| p.1 Formularz rejestracji | ✅ | Email + password + confirmPassword |
| p.2 Walidacja formatu email | ✅ | Zod schema |
| p.3 Wymaganie silnego hasła | ✅ | Min 8 znaków, wielka/mała, cyfra |
| p.4 Auto-login po rejestracji | ⚠️ **ZMIENIONO** | Teraz wymaga manualnego logowania (zgodnie z nowym flow) |
| p.5 Komunikat błędu dla istniejącego email | ✅ | "Użytkownik o takim emailu już istnieje" |
| p.6 Dedykowana strona | ✅ | `/register` |

### US-002: Logowanie do aplikacji

| Kryterium | Status | Notatka |
|-----------|--------|---------|
| p.1 Strona logowania | ✅ | Email + password |
| p.2 Przekierowanie do dashboardu | ✅ | Po pomyślnym logowaniu → `/` |
| p.3 Komunikat o błędnych danych | ✅ | "Nieprawidłowy email lub hasło" |
| p.4 Utrzymanie sesji | ✅ | Persistent cookies |
| p.5 Niezalogowany bez dostępu | ✅ | Middleware guard |
| p.6 Możliwość odzyskania hasła | ✅ | `/forgot-password` |
| p.7 Dedykowana strona | ✅ | `/login` |

---

## 📝 Notatki Dodatkowe

### Dlaczego Supabase.signUp tworzy sesję automatycznie?

Z dokumentacji Supabase:
> By default, the user needs to verify their email address before logging in. To turn this off, disable "Confirm email" in your project.

**Jeśli email confirmation jest wyłączone:**
- `signUp()` zwraca user z session
- User jest automatycznie zalogowany

**Jeśli email confirmation jest włączone:**
- `signUp()` zwraca user bez session
- User musi kliknąć link w emailu aby potwierdzić konto
- Dopiero po potwierdzeniu może się zalogować

**Nasze rozwiązanie:**
- Niezależnie od konfiguracji Supabase, zawsze wywołujemy `signOut()` po `signUp()`
- Gwarantuje to spójne zachowanie: zawsze wymuszamy manual login

### Dlaczego nie używać fetch w Astro SSR?

**Problemy:**
1. **Redirects** - Fetch może trafić na middleware redirect, zwrócić HTML
2. **Performance** - Dodatkowy HTTP request w tym samym procesie
3. **Error handling** - Trudniejsze debugowanie (network vs logic errors)

**Best Practice:**
```astro
---
// ✅ Dobrze
import { MyService } from "@/lib/services/my.service";
const { supabase, user } = Astro.locals;
const service = new MyService(supabase, user.id);
const data = await service.getData();

// ❌ Źle
const response = await fetch("/api/my-endpoint");
const data = await response.json();
---
```

**Wyjątek:** Fetch jest OK w komponentach React (`client:load`) ponieważ działa po stronie klienta.

---

## ✨ Podsumowanie

Bugfix naprawia krytyczny problem z rejestracją i dostosowuje flow do wymagań użytkownika:

1. ✅ Po rejestracji użytkownik jest przekierowany na `/login` (nie dashboard)
2. ✅ Użytkownik musi się zalogować **manualnie** po rejestracji
3. ✅ Dashboard nie zwraca już błędu parsowania JSON
4. ✅ Niezalogowany użytkownik nie ma dostępu do żadnej strony poza auth pages

**Security:** Flow z wymuszonym manual login jest bezpieczniejszy niż auto-login:
- Wymaga potwierdzenia hasła (user musi je wpisać ponownie)
- Unika problemów z email verification flow
- Jasno oddziela proces rejestracji od logowania

Aplikacja jest gotowa do testowania! 🚀

