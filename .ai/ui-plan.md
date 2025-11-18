# Architektura UI dla GymPlanner

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla aplikacji GymPlanner została zaprojektowana z myślą o prostocie, szybkości i intuicyjności, aby wspierać kluczowe metryki sukcesu MVP, takie jak `Onboarding Speed Rate` i `Workout Engagement Rate`. Aplikacja podzielona jest na dwie główne strefy: publiczną (dla niezalogowanych użytkowników) oraz prywatną (po zalogowaniu), gdzie znajduje się cała funkcjonalność.

Centralnym punktem aplikacji jest **Pulpit główny (Dashboard)**, który pełni rolę centrum dowodzenia, wskazując użytkownikowi najbliższy zaplanowany trening i minimalizując czas potrzebny do rozpoczęcia działania. Przepływy użytkownika, zwłaszcza te związane z tworzeniem planów (zarówno manualnie, jak i z pomocą AI), zostały zaprojektowane jako procesy krok po kroku, aby prowadzić użytkownika i unikać przeciążenia informacjami.

Zarządzanie stanem opiera się na kontekście React dla danych globalnych (np. sesja użytkownika) oraz stanie lokalnym i `localStorage` dla formularzy i trwającej sesji treningowej, co zapewnia odporność na przypadkowe zamknięcie karty. UI jest w pełni responsywne dzięki wykorzystaniu `Shadcn/ui` i `Tailwind`, a kluczowe interaktywne elementy są projektowane z uwzględnieniem zasad dostępności (WCAG).

## 2. Lista widoków

### Widoki Publiczne

---

#### **Nazwa widoku:** Logowanie
- **Ścieżka:** `/login`
- **Główny cel:** Uwierzytelnienie istniejącego użytkownika.
- **Kluczowe informacje:** Pola na adres e-mail i hasło, link do strony rejestracji.
- **Kluczowe komponenty:** Formularz logowania, komunikaty o błędach (np. "Nieprawidłowe dane logowania").
- **UX, dostępność i względy bezpieczeństwa:** Komunikaty zwrotne dla walidacji pól. Dostępne etykiety dla pól formularza.

#### **Nazwa widoku:** Rejestracja
- **Ścieżka:** `/register`
- **Główny cel:** Umożliwienie nowym użytkownikom założenia konta.
- **Kluczowe informacje:** Pola na e-mail, hasło i jego potwierdzenie. Checkbox do akceptacji klauzuli bezpieczeństwa. Link do strony logowania.
- **Kluczowe komponenty:** Formularz rejestracji, walidacja siły hasła, checkbox.
- **UX, dostępność i względy bezpieczeństwa:** Klauzula bezpieczeństwa (disclaimer) musi być zaakceptowana przed założeniem konta. Walidacja danych w czasie rzeczywistym.

### Widoki Prywatne

---

#### **Nazwa widoku:** Pulpit główny (Dashboard)
- **Ścieżka:** `/`
- **Główny cel:** Zapewnienie szybkiego dostępu do najbliższego treningu i motywowanie do działania.
- **Kluczowe informacje:** Chronologiczna, zagregowana lista nadchodzących treningów ze wszystkich aktywnych planów (data, nazwa dnia, nazwa treningu).
- **Kluczowe komponenty:**
  - Lista nadchodzących treningów z przyciskiem "Rozpocznij trening".
  - **Stan pusty (dla nowych użytkowników):** Komunikat powitalny z przyciskami "Wygeneruj plan z AI" i "Stwórz plan manualnie".
  - **Stan pusty (po ukończeniu planu):** Komunikat informujący o zakończeniu cyklu z opcjami kontynuacji.
- **UX, dostępność i względy bezpieczeństwa:** Najważniejsza akcja (rozpoczęcie treningu) jest wyraźnie widoczna. Stan pusty aktywnie kieruje użytkownika do kolejnych kroków.

#### **Nazwa widoku:** Lista Planów
- **Ścieżka:** `/plans`
- **Główny cel:** Umożliwienie użytkownikowi przeglądania i zarządzania wszystkimi swoimi planami treningowymi.
- **Kluczowe informacje:** Lista planów z nazwą, datami obowiązywania (`effective_from`, `effective_to`) oraz statusem ("Aktywny", "Nadchodzący", "Zakończony").
- **Kluczowe komponenty:** Lista planów, przycisk "Stwórz nowy plan", opcje edycji i archiwizacji (np. w menu kontekstowym), paginacja typu "Załaduj więcej".
- **UX, dostępność i względy bezpieczeństwa:** Czytelne oznaczenie statusu każdego planu. Akcja archiwizacji wymaga potwierdzenia w modalu.

#### **Nazwa widoku:** Szczegóły Planu
- **Ścieżka:** `/plans/:id`
- **Główny cel:** Wyświetlenie pełnej struktury wybranego planu.
- **Kluczowe informacje:** Nazwa planu, daty, pełna lista dni treningowych z ćwiczeniami, seriami, powtórzeniami i przerwami.
- **Kluczowe komponenty:** Widok planu (tylko do odczytu) w formie długiej, przewijanej listy. Przyciski "Wygeneruj kolejny cykl" i "Edytuj plan" na górze strony.
- **UX, dostępność i względy bezpieczeństwa:** Długie plany są prezentowane w sposób czytelny, z wyraźnymi separatorami między dniami.

#### **Nazwa widoku:** Tworzenie / Edycja Planu
- **Ścieżka:** `/plans/new`, `/plans/:id/edit`
- **Główny cel:** Manualne tworzenie lub modyfikacja planu treningowego.
- **Kluczowe informacje:** Formularz z nazwą planu, datami. Interfejs do dynamicznego dodawania/edycji/usuwania dni, ćwiczeń i serii.
- **Kluczowe komponenty:** Formularz (`react-hook-form`), dynamiczne pola formularza, przyciski "Zapisz" i "Anuluj". Komunikaty o błędach walidacji (np. nakładające się daty).
- **UX, dostępność i względy bezpieczeństwa:** Interfejs musi być intuicyjny i łatwy w obsłudze na urządzeniach mobilnych. W przypadku błędu `409 Conflict` wyświetlany jest komunikat z linkiem do planu powodującego konflikt.

#### **Nazwa widoku:** Generator Planu AI (Formularz)
- **Ścieżka:** `/generate`
- **Główny cel:** Zebranie od użytkownika preferencji potrzebnych do wygenerowania planu przez AI.
- **Kluczowe informacje:** Formularz zawierający: cel, system treningowy, dostępne dni, czas trwania sesji, długość cyklu, dodatkowe uwagi.
- **Kluczowe komponenty:** Formularz z polami wyboru, suwakami i polami tekstowymi. Przycisk "Generuj plan".
- **UX, dostępność i względy bezpieczeństwa:** Pola formularza powinny zawierać podpowiedzi lub opisy, aby ułatwić wybór.

#### **Nazwa widoku:** Generator Planu AI (Podgląd)
- **Ścieżka:** `/generate/preview` (stan przechowywany w `localStorage` lub parametrach URL)
- **Główny cel:** Prezentacja wygenerowanego planu i umożliwienie użytkownikowi podjęcia decyzji.
- **Kluczowe informacje:** Podgląd planu (tylko do odczytu). Wyraźnie widoczna klauzula bezpieczeństwa.
- **Kluczowe komponenty:** Widok planu, przyciski "Zaakceptuj i zapisz", "Odrzuć" oraz "Edytuj" (przenosi do widoku edycji z załadowanymi danymi).
- **UX, dostępność i względy bezpieczeństwa:** Stan ładowania podczas generowania planu. Użytkownik ma pełną kontrolę nad wygenerowaną treścią.

#### **Nazwa widoku:** Sesja Treningowa
- **Ścieżka:** `/session/active`
- **Główny cel:** Interaktywne wsparcie użytkownika podczas realizacji treningu.
- **Kluczowe informacje:** Lista ćwiczeń i serii na dany dzień, z planowanymi wartościami (powtórzenia, ciężar).
- **Kluczowe komponenty:**
  - Checkboxy do oznaczania wykonanych serii.
  - Pola do wpisywania faktycznych wyników (powtórzenia, ciężar).
  - **Minutnik:** "Przyklejony" do krawędzi ekranu, zawsze widoczny.
  - Przycisk "Zakończ trening".
  - **Modal potwierdzający:** Pojawia się przy próbie opuszczenia widoku, pytając o zapisanie postępów.
- **UX, dostępność i względy bezpieczeństwa:** Duże, łatwe do kliknięcia elementy interfejsu (przyciski, checkboxy). Minutnik wysyła powiadomienie dźwiękowe/wibracje. Stan sesji jest zapisywany w `localStorage` na wypadek przypadkowego odświeżenia strony. Łate oznaczenie serii (jednym przyciskiem), w której wykonało się dokładnie tylo powtórzeń i takim cięrzarem jak zaplanowano.

#### **Nazwa widoku:** Historia Treningów
- **Ścieżka:** `/history`
- **Główny cel:** Umożliwienie przeglądania historii ukończonych treningów.
- **Kluczowe informacje:** Chronologiczna lista odbytych sesji (data, nazwa planu, nazwa dnia).
- **Kluczowe komponenty:** Lista sesji, komponent "empty state" dla nowych użytkowników, paginacja "Załaduj więcej".
- **UX, dostępność i względy bezpieczeństwa:** Możliwość wejścia w szczegóły danej sesji (post-MVP).

## 3. Mapa podróży użytkownika

Główny przepływ dla nowego użytkownika koncentruje się na jak najszybszym stworzeniu pierwszego planu i rozpoczęciu treningu:

1.  **Rejestracja i Onboarding:**
    - Użytkownik trafia na `/register`, tworzy konto i jest automatycznie logowany.
    - Następuje przekierowanie na `/` (Pulpit główny), który jest w stanie pustym.
2.  **Tworzenie Planu (ścieżka AI):**
    - Użytkownik klika "Wygeneruj plan z AI" na pulpicie i przechodzi do `/generate`.
    - Po wypełnieniu formularza preferencji i kliknięciu "Generuj", aplikacja wyświetla stan ładowania, wysyłając zapytanie do `POST /api/plans/generate`.
    - Po otrzymaniu odpowiedzi, użytkownik widzi `/generate/preview` z wygenerowanym planem.
    - Użytkownik ma trzy opcje:
        - **"Zaakceptuj i zapisz":** Aplikacja wysyła `POST /api/plans` z danymi planu. Po sukcesie użytkownik jest przekierowywany na pulpit (`/`), gdzie widzi już swój pierwszy zaplanowany trening i kolejne.
        - **"Edytuj":** Użytkownik jest przenoszony do `/plans/new` (lub podobnego widoku edycji) z formularzem wypełnionym danymi z AI, gdzie może je dowolnie modyfikować przed zapisaniem.
        - **"Odrzuć":** Użytkownik wraca do pulpitu lub formularza preferencji.
3.  **Rozpoczęcie i Realizacja Treningu:**
    - Na pulpicie użytkownik klika "Rozpocznij trening" przy najbliższym treningu.
    - Aplikacja tworzy sesję (`POST /api/sessions`) i przenosi użytkownika do `/session/active`.
    - Użytkownik wykonuje trening, odznaczając serie i wpisując wyniki. Dane są na bieżąco zapisywane (`PATCH /api/sessions/:id`).
    - Po zakończeniu klika "Zakończ trening", co wysyła `POST /api/sessions/:id/complete`.
    - Aplikacja przekierowuje użytkownika z powrotem na pulpit (`/`), gdzie zakończony trening już się nie wyświetla.
4.  **Kontynuacja Cyklu:**
    - Po odbyciu wszystkich treningów pulpit znów jest pusty, ale z opcją kontynuacji.
    - Alternatywnie, użytkownik wchodzi w `/plans/:id`, klika "Kontynuuj", wybiera opcję (np. "Generuj kontynuację z AI"), co prowadzi do podobnego cyklu jak przy tworzeniu nowego planu.

## 4. Układ i struktura nawigacji

Nawigacja będzie prosta i skoncentrowana na kluczowych zadaniach, składając się z paska nawigacyjnego (lub menu typu "hamburger" na mobile) z następującymi pozycjami:

- **Pulpit główny (`/`):** Domyślny widok po zalogowaniu.
- **Plany (`/plans`):** Dostęp do listy wszystkich planów.
- **Historia (`/history`):** Dostęp do listy ukończonych sesji.
- **Opcje Użytkownika:**
  - **Wyloguj:** Kończy sesję użytkownika.

Przycisk "Wygeneruj plan z AI" lub "Stwórz nowy plan" będzie kontekstowo dostępny na pulpicie (w stanie pustym) oraz na liście planów, aby zawsze był łatwo dostępny.

## 5. Kluczowe komponenty

Poniższe komponenty `Shadcn/ui` (lub niestandardowe) będą reużywalne w całej aplikacji:

- **`PlanCard`:** Komponent wyświetlający podsumowanie planu na liście (`/plans`). Zawiera nazwę, daty, status i menu kontekstowe z akcjami.
- **`WorkoutListItem`:** Komponent używany na pulpicie do wyświetlania pojedynczego nadchodzącego treningu.
- **`SessionExercise`:** Komponent w widoku sesji treningowej, zawierający nazwę ćwiczenia i listę jego serii (`SessionSet`).
- **`SessionSet`:** Komponent reprezentujący pojedynczą serię w trakcie treningu, z polami na input, checkboxem i przyciskiem do uruchomienia minutnika.
- **`Timer`:** Globalny lub kontekstowy komponent minutnika, który może być "przyklejony" do ekranu.
- **`EmptyState`:** Generyczny komponent do wyświetlania na pustych listach (pulpit, historia, plany) z tekstem i opcjonalnym przyciskiem akcji (CTA).
- **`LoadingSkeleton`:** Komponenty szkieletowe do wyświetlania podczas ładowania danych na listach, poprawiające postrzeganą wydajność.
- **`ConfirmationModal`:** Modal używany do potwierdzania krytycznych akcji, takich jak archiwizacja planu czy opuszczenie aktywnej sesji treningowej.
