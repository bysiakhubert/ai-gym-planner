# 🧪 Przewodnik Testowania Autentykacji

## Przed rozpoczęciem testów

### 1. Upewnij się, że Supabase jest skonfigurowany
```bash
# Sprawdź czy zmienne środowiskowe są ustawione w .env
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_KEY=xxx
# SITE_URL=http://localhost:3000
```

### 2. Uruchom dev server
```bash
npm run dev
```

Server powinien być dostępny na `http://localhost:3000`

---

## 🔍 Scenariusze Testowe

### Test 1: Rejestracja Nowego Użytkownika
**Kroki:**
1. Otwórz `http://localhost:3000/register`
2. Wypełnij formularz:
   - Email: `test@example.com`
   - Hasło: `Test1234` (wielka, mała, cyfra, min 8 znaków)
   - Potwierdź hasło: `Test1234`
3. Kliknij "Zarejestruj się"

**Oczekiwany rezultat:**
- ✅ Komunikat sukcesu: "Konto zostało utworzone!"
- ✅ Jeśli email confirmation włączony: "Sprawdź swoją skrzynkę email..."
- ✅ Jeśli email confirmation wyłączony: Przekierowanie do `/` (dashboard) po 2s

**Możliwe błędy do przetestowania:**
- Hasło za krótkie (< 8 znaków) → Walidacja kliencka
- Brak wielkiej litery/cyfry → Walidacja kliencka
- Hasła się nie zgadzają → Walidacja kliencka
- Email już istnieje → "Użytkownik o takim emailu już istnieje"

---

### Test 2: Logowanie Istniejącego Użytkownika
**Kroki:**
1. Otwórz `http://localhost:3000/login`
2. Wypełnij formularz:
   - Email: `test@example.com`
   - Hasło: `Test1234`
3. Kliknij "Zaloguj się"

**Oczekiwany rezultat:**
- ✅ Przekierowanie do `/` (dashboard)
- ✅ Dashboard pokazuje dane użytkownika

**Możliwe błędy do przetestowania:**
- Nieprawidłowe hasło → "Nieprawidłowy email lub hasło"
- Nieistniejący email → "Nieprawidłowy email lub hasło"
- Pusty formularz → Walidacja kliencka

---

### Test 3: Middleware - Ochrona Tras
**Kroki (będąc NIE zalogowanym):**
1. Spróbuj otworzyć `http://localhost:3000/` → Powinno przekierować do `/login`
2. Spróbuj otworzyć `http://localhost:3000/plans` → Powinno przekierować do `/login`
3. Spróbuj otworzyć `http://localhost:3000/history` → Powinno przekierować do `/login`

**Kroki (będąc zalogowanym):**
1. Spróbuj otworzyć `http://localhost:3000/login` → Powinno przekierować do `/`
2. Spróbuj otworzyć `http://localhost:3000/register` → Powinno przekierować do `/`
3. Otwórz `http://localhost:3000/` → Powinno załadować dashboard
4. Otwórz `http://localhost:3000/plans` → Powinno załadować stronę

**Oczekiwany rezultat:**
- ✅ Wszystkie chronione trasy wymagają logowania
- ✅ Auth pages przekierowują zalogowanych użytkowników
- ✅ Brak błędów 401 przy prawidłowym dostępie

---

### Test 4: Resetowanie Hasła
**Kroki:**
1. Otwórz `http://localhost:3000/forgot-password`
2. Wpisz email: `test@example.com`
3. Kliknij "Wyślij link"

**Oczekiwany rezultat:**
- ✅ Komunikat: "Jeśli podany adres email istnieje..."
- ✅ (Jeśli Supabase email skonfigurowany) Email z linkiem do resetu

**Uwaga:** 
Niezależnie czy email istnieje czy nie, zawsze pokazuje sukces (security best practice)

---

### Test 5: Wylogowanie
**Uwaga:** Przycisk wylogowania trzeba jeszcze dodać w UI. Możesz przetestować endpoint bezpośrednio.

**Testowanie przez console browser:**
```javascript
// W console przeglądarki (F12):
fetch('/api/auth/signout', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data));

// Po wykonaniu, odśwież stronę - powinieneś być wylogowany
```

**Oczekiwany rezultat:**
- ✅ Response: `{ success: true, redirectTo: "/login" }`
- ✅ Po odświeżeniu strony → przekierowanie do `/login`
- ✅ Brak dostępu do chronionych tras

---

### Test 6: Persystencja Sesji
**Kroki:**
1. Zaloguj się na konto
2. Zamknij przeglądarkę (całkowicie)
3. Otwórz przeglądarkę ponownie
4. Przejdź do `http://localhost:3000/`

**Oczekiwany rezultat:**
- ✅ Nadal jesteś zalogowany
- ✅ Dashboard się ładuje bez przekierowania do `/login`

---

### Test 7: API Endpoints - User Isolation
**Kroki (zalogowany jako user1):**
1. Utwórz plan treningowy
2. Zanotuj ID planu (z URL lub response)
3. Wyloguj się
4. Zaloguj się jako user2
5. Spróbuj dostać się do planu user1: `GET /api/plans/{user1_plan_id}`

**Oczekiwany rezultat:**
- ✅ 404 Not Found (plan nie należy do user2)
- ✅ User2 NIE widzi planów user1

---

## 🐛 Debugging Tips

### Problem: "Invalid session" lub ciągłe przekierowania
**Rozwiązanie:**
1. Wyczyść cookies przeglądarki dla localhost:3000
2. Sprawdź Supabase Dashboard → Authentication → Users (czy user istnieje)
3. Sprawdź console browser (F12) czy są błędy API

### Problem: Email confirmation nie działa
**Rozwiązanie:**
1. Supabase Dashboard → Authentication → Email Templates
2. Włącz/wyłącz "Confirm email" w Settings
3. Sprawdź czy `SITE_URL` w .env jest poprawny

### Problem: 401 Unauthorized na API endpoints
**Rozwiązanie:**
1. Sprawdź czy jesteś zalogowany (console: `document.cookie`)
2. Sprawdź middleware logs w terminalu (gdzie działa `npm run dev`)
3. Sprawdź czy `locals.user` jest ustawiony w middleware

### Problem: CORS errors
**Rozwiązanie:**
- Upewnij się, że API i frontend są na tym samym origin (localhost:3000)
- Sprawdź Supabase Dashboard → Settings → API → Site URL

---

## ✅ Checklist Testów

Przed uznaniem autentykacji za ukończoną, sprawdź:

- [ ] Rejestracja działa (nowy user + komunikaty błędów)
- [ ] Logowanie działa (existing user + komunikaty błędów)
- [ ] Middleware przekierowuje niezalogowanych z chronionych tras
- [ ] Middleware przekierowuje zalogowanych z /login i /register
- [ ] Reset hasła wysyła email (lub pokazuje sukces)
- [ ] Wylogowanie czyści sesję
- [ ] Sesja persystuje po zamknięciu przeglądarki
- [ ] User isolation działa (user1 nie widzi danych user2)
- [ ] Brak błędów w console (browser i server)
- [ ] Brak błędów lintera (`npm run lint`)

---

## 🚀 Następne Kroki

Po zakończeniu testów:
1. Dodaj przycisk "Wyloguj" w nawigacji/dashboard
2. Dodaj loading states dla formularzy auth
3. Rozważ dodanie "Remember me" checkbox
4. Dodaj RLS policies w Supabase dla training_plans i training_sessions
5. Skonfiguruj email templates w Supabase Dashboard

Powodzenia! 🎉



