# E2E Tests - Database Cleanup

## Przegląd

Testy E2E używają dedykowanej bazy danych i automatycznie czyszczą dane testowe po każdym teście, aby zapewnić izolację testów.

## Konfiguracja

### 1. Zmienne środowiskowe

Upewnij się, że plik `.env.test` zawiera wszystkie wymagane zmienne:

```env
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Test User Credentials
E2E_USERNAME_ID=e62b80a7-f379-4a2d-ad89-7ebb3b21b438
E2E_USERNAME=bysiu111@interia.pl
E2E_PASSWORD=your-password-here
```

**Ważne:** `SUPABASE_SERVICE_ROLE_KEY` jest wymagany do operacji czyszczenia bazy danych.

### 2. Uruchomienie testów

```bash
# Uruchom wszystkie testy
npx playwright test

# Uruchom testy w trybie UI
npx playwright test --ui

# Uruchom konkretny test
npx playwright test specs/auth/login.unauth.spec.ts

# Uruchom testy z raportem
npx playwright test --reporter=html
```

## Mechanizm czyszczenia

### Jak działa?

1. **Automatyczne czyszczenie**: Po każdym teście, dane testowe użytkownika są automatycznie usuwane z bazy danych
2. **Zachowanie użytkownika**: Użytkownik testowy (z `seed.sql`) jest zachowywany, usuwane są tylko jego dane (plany, sesje, ćwiczenia)
3. **Kolejność usuwania**: Dane są usuwane w odpowiedniej kolejności, aby respektować ograniczenia kluczy obcych:
   - `workout_exercise_sets`
   - `workout_exercises`
   - `workout_sessions`
   - `day_exercises`
   - `plan_days`
   - `training_plans`

### Pliki

- `e2e/helpers/database-cleanup.ts` - Helper do czyszczenia bazy danych
- `e2e/fixtures/base.ts` - Rozszerzone fixtures z automatycznym czyszczeniem
- `e2e/global-setup.ts` - Weryfikacja połączenia z bazą danych przed testami

## Korzyści

✅ **Izolacja testów**: Każdy test zaczyna się z czystym stanem bazy danych  
✅ **Brak race conditions**: Testy nie wpływają na siebie nawzajem  
✅ **Równoległe wykonywanie**: Testy mogą być uruchamiane równolegle bez konfliktów  
✅ **Deterministyczne wyniki**: Testy zawsze dają te same wyniki  

## Rozwiązywanie problemów

### Test nie może połączyć się z bazą danych

Sprawdź czy:
- Supabase jest uruchomiony: `npx supabase status`
- `SUPABASE_SERVICE_ROLE_KEY` jest ustawiony w `.env.test`
- URL bazy danych jest poprawny

### Czyszczenie nie działa

Sprawdź logi w konsoli:
- `✅ Database cleanup completed` - czyszczenie udane
- `⚠️ E2E_USERNAME_ID not set` - brak ID użytkownika testowego
- `❌ Database cleanup failed` - błąd połączenia lub uprawnień

### Testy nadal się konfliktują

Jeśli testy nadal mają problemy, możesz:
1. Zmniejszyć liczbę workerów: `npx playwright test --workers=2`
2. Uruchomić testy sekwencyjnie: `npx playwright test --workers=1`
3. Sprawdzić czy `E2E_USERNAME_ID` jest poprawny

## Debugowanie

```bash
# Uruchom testy z logami
DEBUG=pw:api npx playwright test

# Uruchom testy w trybie headed (widoczna przeglądarka)
npx playwright test --headed

# Uruchom testy z trace
npx playwright test --trace on
```

