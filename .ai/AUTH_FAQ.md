# ❓ Auth Implementation - FAQ

## Pytania Ogólne

### Q: Dlaczego używamy `@supabase/ssr` zamiast zwykłego `@supabase/supabase-js`?
**A:** `@supabase/ssr` jest specjalnie zaprojektowany dla frameworków SSR jak Astro. Główne różnice:
- Automatyczne zarządzanie cookies (getAll/setAll)
- Bezpieczne odświeżanie tokenów po stronie serwera
- Unikanie race conditions przy concurrent requests
- Prawidłowe działanie z middleware

### Q: Dlaczego używamy `getUser()` zamiast `getSession()`?
**A:** `getUser()` jest bezpieczniejsze ponieważ:
- Weryfikuje JWT na serwerze Supabase (nie tylko lokalnie)
- Zapobiega atakom z podrobionymi tokenami
- Zawsze zwraca aktualny stan użytkownika
- Recommended by Supabase dla SSR

### Q: Co to jest `DEFAULT_USER_ID` i dlaczego nadal istnieje?
**A:** `DEFAULT_USER_ID` to UUID fallback (`00000000-0000-0000-0000-000000000000`) który:
- Jest eksportowany z `supabase.client.ts` dla backward compatibility
- NIE jest już używany w żadnym endpoincie API
- Można go usunąć jeśli nie jest używany w innych miejscach (np. seed data)
- Został zastąpiony przez `locals.user.id` wszędzie w API

---

## Pytania Techniczne

### Q: Jak działa flow autentykacji od początku do końca?
**A:**
```
1. User wypełnia LoginForm.tsx
2. Form wywołuje POST /api/auth/signin
3. Endpoint waliduje dane z Zod
4. Supabase.auth.signInWithPassword() tworzy sesję
5. Supabase SSR automatycznie ustawia HTTP-only cookies
6. Endpoint zwraca { success: true, redirectTo: "/" }
7. LoginForm.tsx robi window.location.href = "/"
8. Middleware przechwytuje request do "/"
9. Middleware wywołuje supabase.auth.getUser() (czyta cookies)
10. User jest zalogowany, middleware ustawia locals.user
11. Dashboard renderuje się z danymi użytkownika
```

### Q: Jak działa middleware protection?
**A:**
```typescript
// Middleware sprawdza każdy request:

1. Tworzy Supabase SSR client z cookies
2. Wywołuje supabase.auth.getUser()
3. Ustawia locals.user (lub null)
4. Sprawdza czy ścieżka jest publiczna:
   - Publiczna + nie zalogowany → OK, next()
   - Publiczna + zalogowany → redirect("/") (dla /login, /register)
   - Chroniona + zalogowany → OK, next()
   - Chroniona + nie zalogowany → redirect("/login")
```

### Q: Jak dodać nową chronioną trasę?
**A:** Nie musisz nic robić! Domyślnie wszystkie trasy są chronione. 

Jeśli chcesz dodać publiczną trasę, dodaj ją do `PUBLIC_PATHS` w `middleware/index.ts`:
```typescript
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/twoja-nowa-publiczna-sciezka", // <- dodaj tutaj
  // ...
];
```

### Q: Jak uzyskać dostęp do user w Astro page?
**A:**
```astro
---
// src/pages/example.astro
export const prerender = false;

const { user } = Astro.locals;

if (!user) {
  // Middleware powinien już przekierować, ale dla pewności:
  return Astro.redirect("/login");
}

// Teraz masz dostęp do:
// user.id - UUID użytkownika
// user.email - email (może być undefined)
---

<p>Witaj {user.email}!</p>
```

### Q: Jak uzyskać dostęp do user w API endpoint?
**A:**
```typescript
// src/pages/api/example.ts
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  const { user, supabase } = locals;

  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401 }
    );
  }

  // Użyj user.id do query
  const { data } = await supabase
    .from("table")
    .select("*")
    .eq("user_id", user.id);

  return new Response(JSON.stringify(data));
};
```

---

## Pytania o Błędy

### Q: Otrzymuję "Unauthorized" mimo że jestem zalogowany
**A:** Możliwe przyczyny:
1. **Cookies nie są przesyłane:**
   - Sprawdź czy fetch używa `credentials: 'include'` (jeśli cross-origin)
   - Sprawdź DevTools → Application → Cookies → localhost:3000
   
2. **Token wygasł:**
   - Supabase SSR automatycznie odświeża tokeny
   - Sprawdź czy middleware jest uruchamiany (console.log w middleware)
   
3. **CORS:**
   - Upewnij się że API i frontend są na tym samym origin

### Q: Middleware przekierowuje w nieskończoność (loop)
**A:** Sprawdź:
1. Czy `/login` jest w `PUBLIC_PATHS`
2. Czy nie ma błędu w logice `isPublicPath()` lub `isAuthPage()`
3. Sprawdź console - może być błąd w `supabase.auth.getUser()`

### Q: "Invalid session" po każdym odświeżeniu
**A:**
1. Sprawdź czy `SUPABASE_URL` i `SUPABASE_KEY` są poprawne
2. Sprawdź czy Supabase project nie jest paused
3. Wyczyść wszystkie cookies i zaloguj się ponownie
4. Sprawdź Supabase Dashboard → API → JWT Settings

### Q: Email confirmation nie działa lokalnie
**A:**
1. Supabase Dashboard → Authentication → Providers → Email
2. Wyłącz "Confirm email" dla development
3. Lub skonfiguruj email provider (np. SendGrid)
4. Sprawdź czy `SITE_URL` w .env jest ustawiony na `http://localhost:3000`

### Q: Po rejestracji użytkownik jest przekierowany na dashboard zamiast na /login
**A:** Ten problem został naprawiony poprzez:
1. Dodanie `await supabase.auth.signOut()` w `/api/auth/register` zaraz po `signUp()`
2. To wymusza wylogowanie po rejestracji, więc użytkownik musi się zalogować manualnie
3. Dzięki temu middleware nie wykrywa sesji i poprawnie przekierowuje na `/login`

### Q: "Unexpected token '<', "<!DOCTYPE"... is not valid JSON" na dashboardzie
**A:** Ten błąd oznacza że API zwraca HTML zamiast JSON. Możliwe przyczyny:
1. **Fetch do własnego API w Astro SSR** - zamiast `fetch("/api/dashboard")` użyj bezpośrednio service/locals
2. **Middleware przekierowuje request** - upewnij się że user jest zalogowany
3. **Nieprawidłowy URL** - sprawdź czy `Astro.url.origin` jest poprawny

**Rozwiązanie:**
```astro
// ❌ Źle - fetch w Astro SSR może powodować problemy
const response = await fetch(new URL("/api/dashboard", Astro.url.origin));
const data = await response.json();

// ✅ Dobrze - bezpośrednie użycie service
import { DashboardService } from "@/lib/services/dashboard.service";
const { supabase, user } = Astro.locals;
const dashboardService = new DashboardService(supabase, user.id);
const data = await dashboardService.getDashboardSummary();
```

---

## Pytania o Rozszerzenia

### Q: Jak dodać "Remember Me" checkbox?
**A:**
1. W `LoginForm.tsx` dodaj checkbox do stanu
2. Przy wywołaniu API, dodaj parametr:
```typescript
const { data } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    // Remember for 60 days instead of default 7
    refreshToken: rememberMe ? '60 days' : '7 days'
  }
});
```

### Q: Jak dodać OAuth (Google, GitHub)?
**A:**
1. Supabase Dashboard → Authentication → Providers → włącz Google/GitHub
2. Skopiuj Client ID/Secret z Google/GitHub Console
3. W `LoginForm.tsx` dodaj przycisk:
```typescript
const handleOAuth = async (provider: 'google' | 'github') => {
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`
    }
  });
};
```

### Q: Jak dodać Multi-Factor Authentication (MFA)?
**A:** Supabase wspiera MFA out-of-the-box:
1. Włącz w Supabase Dashboard → Authentication → Settings
2. Użyj `supabase.auth.mfa.enroll()` i `supabase.auth.mfa.verify()`
3. Docs: https://supabase.com/docs/guides/auth/auth-mfa

### Q: Jak dodać przycisk "Wyloguj" w UI?
**A:**
```tsx
// src/components/LogoutButton.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });
      const data = await response.json();
      
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  );
}
```

Następnie dodaj do nawigacji lub dashboardu:
```astro
---
import { LogoutButton } from "@/components/LogoutButton";
---

<LogoutButton client:load />
```

---

## Pytania o Performance

### Q: Czy middleware nie spowalnia aplikacji (getUser() przy każdym request)?
**A:** 
- `getUser()` jest bardzo szybkie (< 10ms) ponieważ tylko dekoduje JWT
- Jeśli token jest valid, nie ma external API call
- Supabase SSR cache'uje wyniki w request context
- W production, można dodać Redis cache dla user data

### Q: Jak zoptymalizować auth dla production?
**A:**
1. Włącz CDN dla static assets
2. Użyj Edge Functions dla middleware (Vercel Edge, Cloudflare Workers)
3. Dodaj Redis cache dla user profiles
4. Włącz compression dla API responses
5. Monitoruj auth metrics (login rate, session duration)

---

## Przydatne Linki

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side)
- [Astro Middleware Docs](https://docs.astro.build/en/guides/middleware/)
- [Zod Validation](https://zod.dev/)

---

Masz więcej pytań? Sprawdź:
- `auth-spec.md` - szczegóły techniczne
- `auth-implementation-summary.md` - co zostało zrobione
- `TESTING_AUTH.md` - jak testować

Lub otwórz issue na GitHubie projektu! 🚀



