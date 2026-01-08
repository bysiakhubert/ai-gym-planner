# ✨ Feature: Wylogowanie użytkownika

**Data:** 2025-12-30  
**Status:** ✅ Zaimplementowano  
**Priorytet:** Wysoki

---

## 📋 Opis Funkcjonalności

Dodano pełną funkcjonalność wylogowania użytkownika, zgodnie z wymaganiami PRD:

### User Story US-003: Wylogowanie (Implicit w PRD)
- Użytkownik może wylogować się z aplikacji za pomocą przycisku "Wyloguj" w nawigacji
- Po wylogowaniu użytkownik jest przekierowany na stronę logowania
- Sesja jest całkowicie usuwana (cookies wyczyszczone)

---

## 🎨 Implementacja UI

### Przycisk "Wyloguj" w Nawigacji

**Umiejscowienie:** Górny pasek nawigacji, po prawej stronie (przeciwnie do logo i menu)

**Wygląd:**
- Ikona: `LogOut` z lucide-react
- Tekst: "Wyloguj" (ukryty na małych ekranach, widoczny na sm+)
- Wariant: `ghost` button (subtelny, nie dominujący)
- Stan loading: Tekst zmienia się na "Wylogowywanie..." podczas procesu

**Responsywność:**
- Mobile (< 640px): Tylko ikona
- Desktop (≥ 640px): Ikona + tekst

**Widoczność:**
- ✅ Widoczny na wszystkich stronach aplikacji (dashboard, plans, history, etc.)
- ❌ **NIE** widoczny na stronach auth (login, register, forgot-password)
  - Strony auth używają `AuthLayout` bez nawigacji
  - Strony app używają `Layout` z nawigacją

---

## 🔧 Implementacja Backend

### Endpoint: POST /api/auth/signout

**Plik:** `src/pages/api/auth/signout.ts` (już istniał, nie wymaga zmian)

**Flow:**
1. Wywołuje `supabase.auth.signOut()`
2. Supabase SSR automatycznie czyści session cookies
3. Zwraca JSON: `{ success: true, redirectTo: "/login" }`

**Error Handling:**
- 500 Internal Server Error - jeśli signOut nie powiedzie się
- Polskie komunikaty błędów

---

## 🎯 Implementacja Frontend

### Komponent: LogoutButton.tsx

**Plik:** `src/components/auth/LogoutButton.tsx` (nowy)

**Funkcjonalności:**
- useState do śledzenia stanu loading
- Wywołanie POST /api/auth/signout
- Toast notification (sukces/błąd) używając `sonner`
- Automatyczne przekierowanie po 500ms (czas na pokazanie toastu)
- Disabled state podczas loading
- Error handling z polskimi komunikatami

**Użyte biblioteki:**
- `sonner` - toast notifications
- `lucide-react` - ikona LogOut
- `@/components/ui/button` - Shadcn button component

### Integracja w Navigation.astro

**Zmiany w `src/components/Navigation.astro`:**

1. **Import komponentu:**
```astro
import { LogoutButton } from "@/components/auth";
```

2. **Zmiana layoutu headera:**
```astro
<!-- Przed: flex items-center -->
<!-- Po: flex items-center justify-between -->
```

3. **Struktura:**
```astro
<div class="flex items-center justify-between">
  <!-- Left: Logo + Nav Links -->
  <div class="flex items-center gap-4">
    <!-- Logo, Links, NewPlanButton -->
  </div>
  
  <!-- Right: Logout -->
  <div class="flex items-center">
    <LogoutButton client:load />
  </div>
</div>
```

---

## 📦 Zmienione/Utworzone Pliki

### Nowe pliki:
1. **`src/components/auth/LogoutButton.tsx`** - Komponent React z logiką wylogowania

### Zmodyfikowane pliki:
1. **`src/components/auth/index.ts`** - Dodano export LogoutButton
2. **`src/components/Navigation.astro`** - Dodano przycisk wyloguj po prawej stronie

### Istniejące pliki (bez zmian):
- `src/pages/api/auth/signout.ts` - Endpoint już istniał i działał poprawnie
- `src/layouts/AuthLayout.astro` - Nie ma nawigacji (OK)
- `src/layouts/Layout.astro` - Renderuje Navigation (OK)

---

## 🧪 Jak Przetestować

### Test Case 1: Wylogowanie z aplikacji

```bash
# 1. Zaloguj się do aplikacji (jeśli nie jesteś)
# 2. Przejdź na dowolną stronę (/, /plans, /history)
# 3. Sprawdź górny pasek nawigacji

# ✅ Oczekiwany rezultat:
# - Po prawej stronie widzisz przycisk "Wyloguj" z ikoną
# - Przycisk ma subtelny styl (ghost variant)
```

### Test Case 2: Kliknięcie przycisku wyloguj

```bash
# 1. Będąc zalogowanym, kliknij przycisk "Wyloguj"

# ✅ Oczekiwany rezultat:
# - Przycisk zmienia tekst na "Wylogowywanie..."
# - Przycisk jest disabled (nie można kliknąć ponownie)
# - Pojawia się zielony toast: "Wylogowano pomyślnie"
# - Po ~0.5s jesteś przekierowany na /login
# - Na /login NIE widzisz przycisku wyloguj (tylko logo w header)
```

### Test Case 3: Próba dostępu po wylogowaniu

```bash
# 1. Po wylogowaniu, wpisz w URL: http://localhost:4321/
# 2. Lub spróbuj: /plans, /history

# ✅ Oczekiwany rezultat:
# - Middleware od razu przekierowuje na /login
# - Nie widzisz zawartości chronionej strony
# - Musisz się zalogować ponownie
```

### Test Case 4: Widoczność przycisku (Mobile)

```bash
# 1. Zaloguj się
# 2. Otwórz DevTools (F12)
# 3. Włącz responsive mode i ustaw mobile viewport (np. iPhone SE, 375px)

# ✅ Oczekiwany rezultat:
# - Przycisk wyloguj jest widoczny (tylko ikona, bez tekstu)
# - Kliknięcie działa poprawnie
```

### Test Case 5: Error handling

```bash
# 1. Zaloguj się
# 2. W DevTools → Network, włącz "Offline" mode
# 3. Kliknij "Wyloguj"

# ✅ Oczekiwany rezultat:
# - Pojawia się czerwony toast: "Wystąpił błąd połączenia. Spróbuj ponownie"
# - Przycisk wraca do stanu aktywnego (nie disabled)
# - Możesz spróbować ponownie
```

---

## 🎯 Zgodność z Wymaganiami

### PRD - Autentykacja
| Wymaganie | Status | Implementacja |
|-----------|--------|--------------|
| Użytkownik może się wylogować | ✅ | Przycisk w nawigacji |
| Sesja jest czyszczona | ✅ | `supabase.auth.signOut()` |
| Przekierowanie do /login | ✅ | `window.location.href = "/login"` |
| Niezalogowany bez dostępu | ✅ | Middleware protection |

### UX Best Practices
| Aspekt | Status | Notatka |
|--------|--------|---------|
| Widoczność akcji | ✅ | Przycisk zawsze widoczny w nav |
| Feedback użytkownikowi | ✅ | Toast notifications |
| Loading state | ✅ | Disabled + zmiana tekstu |
| Error handling | ✅ | Polskie komunikaty błędów |
| Responsywność | ✅ | Ikona + tekst na desktop, tylko ikona na mobile |
| Accessibility | ✅ | `aria-label="Wyloguj się"` |

---

## 💡 Szczegóły Techniczne

### Dlaczego toast + redirect zamiast bezpośredniego redirecta?

**UX Reasons:**
1. **Feedback** - Użytkownik widzi potwierdzenie akcji
2. **Perceived performance** - Toast daje poczucie że coś się dzieje
3. **Debugging** - Łatwiej zobaczyć czy akcja się powiodła

**Delay 500ms:**
- Wystarczająco długi aby zobaczyć toast
- Wystarczająco krótki aby nie irytować
- Standardowy UX pattern

### Dlaczego button variant="ghost"?

**Design Reasons:**
1. **Hierarchy** - Wyloguj to destruktive action, nie powinno być primary
2. **Subtlety** - Nie dominuje w UI (ważniejsze są akcje treningowe)
3. **Consistency** - Inne secondary actions też używają ghost

### Dlaczego LogoutButton jest w `components/auth/`?

**Architecture:**
- Wszystkie komponenty związane z autentykacją w jednym miejscu
- Łatwy import: `import { LogoutButton } from "@/components/auth"`
- Zgodność z `LoginForm`, `RegisterForm`, `ForgotPasswordForm`

---

## 🚀 Dalsze Możliwości (Future Enhancements)

### 1. Confirmation Dialog
**Obecne:** Wylogowanie od razu po kliknięciu  
**Możliwość:** Dodać AlertDialog "Czy na pewno chcesz się wylogować?"  
**Kiedy:** Jeśli użytkownicy będą przypadkowo się wylogowywać

### 2. Dropdown Menu
**Obecne:** Pojedynczy przycisk  
**Możliwość:** Dropdown z opcjami: Profil, Ustawienia, Wyloguj  
**Kiedy:** Gdy dodamy więcej opcji użytkownika

### 3. Session Timeout Warning
**Obecne:** Sesja wygasa cicho  
**Możliwość:** Toast warning 5 min przed wygaśnięciem: "Sesja wygaśnie za 5 minut"  
**Kiedy:** Jeśli będzie problem z utratą niezapisanych danych

### 4. "Logout from all devices"
**Obecne:** Wylogowanie z aktualnego urządzenia  
**Możliwość:** Opcja wylogowania ze wszystkich urządzeń  
**Kiedy:** Security feature dla użytkowników premium

---

## ✨ Podsumowanie

Funkcjonalność wylogowania została **w pełni zaimplementowana** i spełnia wszystkie wymagania:

1. ✅ Przycisk "Wyloguj" widoczny w nawigacji (tylko dla zalogowanych)
2. ✅ Poprawne wywołanie backendu (`/api/auth/signout`)
3. ✅ Czyszczenie sesji i cookies
4. ✅ Przekierowanie na stronę logowania
5. ✅ Toast notifications dla feedbacku
6. ✅ Error handling z polskimi komunikatami
7. ✅ Loading states i disabled podczas procesu
8. ✅ Responsive design (mobile + desktop)
9. ✅ Accessibility (aria-label)

**Ready to test!** 🚀

Użytkownik może teraz swobodnie logować się, korzystać z aplikacji i wylogowywać się w każdej chwili.



