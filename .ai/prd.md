# Dokument wymagań produktu (PRD) - GymPlanner

## 1. Przegląd produktu

GymPlanner to aplikacja internetowa w wersji MVP (Minimum Viable Product), zaprojektowana w celu uproszczenia procesu planowania, realizacji i śledzenia treningów siłowych. Aplikacja skierowana jest do średniozaawansowanych użytkowników, którzy posiadają podstawową wiedzę treningową, ale potrzebują narzędzia do systematyzacji swoich działań. Główne funkcjonalności obejmują tworzenie i edycję planów treningowych, interaktywny widok do realizacji treningu "na żywo" z minutnikiem przerw, a także unikalną integrację z AI, która generuje spersonalizowane propozycje planów na podstawie celów i preferencji użytkownika. Projekt wykorzystuje Supabase do autentykacji i przechowywania danych, a jego kluczowym celem jest dostarczenie prostego, ale skutecznego rozwiązania problemu braku ustrukturyzowanych narzędzi do amatorskiego treningu siłowego.

## 2. Problem użytkownika

Planowanie i prowadzenie treningów siłowych często odbywa się w notatnikach lub arkuszach kalkulacyjnych, co utrudnia śledzenie postępów, kontrolę przerw i systematyczność. Brakuje prostego narzędzia, które pozwalałoby zarówno zaplanować trening, jak i realizować go w praktyce – z możliwością zaznaczania wykonanych serii, korzystania z minutnika przerw oraz inteligentnego planowania progresji. Użytkownicy potrzebują jednego, scentralizowanego miejsca do zarządzania całym cyklem treningowym, od planowania po analizę historii.

## 3. Wymagania funkcjonalne

### 3.1. System Użytkowników (Supabase Auth)

- F-001: Użytkownik może założyć nowe konto przy użyciu adresu e-mail i hasła.
- F-002: Użytkownik może zalogować się na swoje konto.
- F-003: Użytkownik może się wylogować ze swojego konta.

### 3.2. Moduł Planów Treningowych

- F-005: Użytkownik może wygenerować plan treningowy przy pomocy AI, wypełniając formularz zawierający: cel (np. hipertrofia, siła), system treningowy (np. PPL, FBW), dostępne dni, ilość czasu jaką moe poświęcic na sesję treningową, długość cyklu (w tygodniach) oraz dodatkowe uwagi.
- F-006: Użytkownik może stworzyć nowy plan treningowy od zera za pomocą prostego formularza, definiując dni, ćwiczenia, liczbę serii, powtórzeń i długość przerw.
- F-007: Użytkownik może przeglądać listę swoich zapisanych planów treningowych.
- F-008: Użytkownik może edytować każdy element zapisanego planu (dni, ćwiczenia, serie, powtórzenia, przerwy).
- F-009: Użytkownik może usunąć zapisany plan treningowy.
- F-010: Każdy plan na liście jest oznaczony datą zakończenia cyklu, wynikającą z zadeklarowanej długości i daty startu.

### 3.3. Moduł Realizacji Treningu ("Trening Dnia")

- F-011: Użytkownik może wybrać i uruchomić trening zaplanowany na dany dzień.
- F-012: W widoku treningu użytkownik widzi listę ćwiczeń i serii z planowanymi wartościami (ciężar, powtórzenia).
- F-013: Użytkownik może odznaczać każdą wykonaną serię.
- F-014: Użytkownik może wpisać faktyczne wartości (ciężar, powtórzenia) osiągnięte w danej serii.
- F-015: Użytkownik może manualnie uruchomić minutnik do mierzenia czasu przerw między seriami.
- F-016: Minutnik działa w tle i wysyła powiadomienie (dźwiękowe lub wibracje) po zakończeniu odliczania.
- F-017: Użytkownik może zakończyć sesję treningową, co powoduje jej automatyczne zapisanie w historii.

### 3.4. Moduł Historii i Progresji

- F-018: Aplikacja automatycznie zapisuje każdą zakończoną sesję treningową w historii.
- F-019: Użytkownik ma dostęp do chronologicznej listy odbytych treningów.
- F-020: Po zakończeniu cyklu treningowego użytkownik ma opcję wygenerowania nowego planu przez AI, która analizuje historię i sugeruje progresję (np. zwiększenie ciężaru).
- F-021: Użytkownik ma alternatywną opcję kontynuowania istniejącego planu na kolejny cykl bez zmian.

### 3.5. Ogólne

- F-022: Aplikacja zawiera klauzulę bezpieczeństwa (disclaimer) informującą, że użytkownik korzysta z planów AI na własną odpowiedzialność i powinien posiadać wiedzę pozwalającą na ich ocenę.

## 4. Granice produktu

Następujące funkcjonalności celowo NIE wchodzą w zakres MVP, aby umożliwić szybkie wdrożenie i zebranie opinii od użytkowników:

- Zaawansowane statystyki i graficzna analiza postępów treningowych.
- Import i eksport planów w różnych formatach (np. PDF, CSV).
- Funkcje społecznościowe, takie jak współdzielenie planów między użytkownikami.
- Dedykowana aplikacja mobilna (MVP będzie dostępne jako responsywna aplikacja internetowa).
- Integracje z zewnętrznymi urządzeniami fitness, zegarkami czy aplikacjami (np. Apple Health, Google Fit).
- Wbudowana baza ćwiczeń z instrukcjami wideo lub opisami (użytkownicy wpisują nazwy ćwiczeń manualnie).

## 5. Historyjki użytkowników

### 5.1. Zarządzanie Kontem

---

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto za pomocą e-maila i hasła, aby bezpiecznie przechowywać moje plany treningowe.
- Kryteria akceptacji:
  1. Formularz rejestracji zawiera pola na adres e-mail i hasło (z potwierdzeniem).
  2. System waliduje poprawność formatu adresu e-mail.
  3. System wymaga hasła o minimalnej sile (np. 8 znaków).
  4. Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do głównego panelu aplikacji.
  5. W przypadku próby rejestracji na istniejący e-mail, otrzymuję stosowny komunikat błędu.
  6. Rejestracja odbywają się na dedykowanj stronie.

---

- ID: US-002
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do moich planów.
- Kryteria akceptacji:
  1. Strona logowania zawiera pola na e-mail i hasło.
  2. Po poprawnym wprowadzeniu danych jestem zalogowany i widzę główny panel.
  3. W przypadku podania błędnych danych, wyświetlany jest komunikat o nieprawidłowym loginie lub haśle.
  4. Sesja użytkownika jest utrzymywana po zamknięciu i ponownym otwarciu przeglądarki.
  5. Niezalogowany uzytkownik nie ma dostepu do zadnych funkcjonalności aplikacji.
  6. Uzytkownik ma mozliwosc odzyskania chasła jeśli go zapomniał. Nowe wygeneroeane chasło będzie wysłane na jego adres e-mail.
  7. Logowanie odbywają się na dedykowanj stronie.

### 5.2. Plany Treningowe

---

- ID: US-004
- Tytuł: Generowanie planu przez AI
- Opis: Jako użytkownik, chcę wypełnić formularz z moimi preferencjami treningowymi, aby AI wygenerowała dla mnie spersonalizowany plan.
- Kryteria akceptacji:
  1. Formularz zawiera pola: cel, system treningowy, dni treningowe, długość pojedyńczego treningu, długość cyklu, uwagi.
  2. Po wysłaniu formularza, AI generuje kompletny plan widoczny na ekranie.
  3. Wygenerowany plan można od razu edytować.
  4. Pod planem znajdują się przyciski "Zaakceptuj i zapisz" oraz "Odrzuć".

---

- ID: US-005
- Tytuł: Tworzenie planu od zera
- Opis: Jako użytkownik, chcę mieć możliwość samodzielnego stworzenia planu treningowego, jeśli nie chcę korzystać z AI.
- Kryteria akceptacji:
  1. Mogę dodać nowy, pusty plan.
  2. W ramach planu mogę definiować dni treningowe (np. Dzień A, Dzień B).
  3. Do każdego dnia mogę dodawać ćwiczenia, podając ich nazwę.
  4. Dla każdego ćwiczenia mogę określić liczbę serii, powtórzeń i czas przerwy.
  5. W każdej chwili mogę zapisać postępy w tworzeniu planu.

---

- ID: US-006
- Tytuł: Przeglądanie i edycja planów
- Opis: Jako użytkownik, chcę widzieć listę moich planów i mieć możliwość ich edycji, aby dostosowywać je do swoich potrzeb.
- Kryteria akceptacji:
  1. Istnieje ekran z listą wszystkich moich zapisanych planów.
  2. Każdy plan na liście ma widoczną nazwę i datę zakończenia cyklu.
  3. Mogę otworzyć dowolny plan w trybie edycji.
  4. W trybie edycji mogę zmieniać wszystkie parametry planu (ćwiczenia, serie, powtórzenia itd.).
  5. Mogę usunąć plan z listy, co wymaga potwierdzenia.

### 5.3. Realizacja Treningu

---

- ID: US-007
- Tytuł: Rozpoczęcie i realizacja treningu
- Opis: Jako użytkownik, chcę wybrać dzisiejszy trening, aby przejść do widoku "na żywo", gdzie będę mógł śledzić swoje postępy.
- Kryteria akceptacji:
  1. Z poziomu panelu głównego mogę rozpocząć trening zaplanowany na dziś.
  2. Widok treningu pokazuje listę ćwiczeń i serii na dany dzień.
  3. Przy każdej serii widzę planowany ciężar i liczbę powtórzeń.
  4. Obok planowanych wartości znajdują się puste pola do wpisania faktycznie osiągniętych wyników.
  5. Przy każdej serii jest checkbox, który mogę zaznaczyć po jej wykonaniu.
  6. Na samym dole znajduje się przycisk "Zakończ trening", którym mogę zakończyć trening w kazdym momencie.

---

- ID: US-008
- Tytuł: Korzystanie z minutnika przerw
- Opis: Jako użytkownik, chcę móc uruchomić minutnik po każdej serii, aby precyzyjnie mierzyć czas odpoczynku.
- Kryteria akceptacji:
  1. W widoku treningu przy każdej serii znajduje się przycisk uruchamiający minutnik.
  2. Czas na minutniku jest ustawiany automatycznie na podstawie wartości z planu.
  3. Po uruchomieniu minutnik odlicza czas w tle.
  4. Po zakończeniu odliczania otrzymuję powiadomienie dźwiękowe i/lub wibrację.

### 5.4. Historia i Progresja

---

- ID: US-009
- Tytuł: Zapisywanie treningu w historii
- Opis: Jako użytkownik, po zakończeniu sesji treningowej chcę, aby została ona automatycznie zapisana w mojej historii.
- Kryteria akceptacji:
  1. Kliknięcie "Zakończ trening" zapisuje sesję.
  2. Zapisana sesja zawiera datę, nazwę planu oraz porównanie wartości planowanych z rzeczywistymi dla każdej serii.
  3. Po zapisaniu jestem przekierowywany do podsumowania lub listy historycznych treningów.

---

- ID: US-010
- Tytuł: Przeglądanie historii treningów
- Opis: Jako użytkownik, chcę mieć dostęp do listy moich przeszłych treningów, aby śledzić swoją aktywność.
- Kryteria akceptacji:
  1. W aplikacji jest sekcja "Historia".
  2. Wyświetla ona chronologiczną listę wszystkich odbytych sesji.
  3. Mogę kliknąć na daną sesję, aby zobaczyć jej szczegóły (wykonane ćwiczenia, serie, ciężary, powtórzenia).

---

- ID: US-011
- Tytuł: Planowanie progresji na kolejny cykl
- Opis: Jako użytkownik, po zakończeniu cyklu treningowego chcę mieć możliwość wygenerowania nowego, trudniejszego planu.
- Kryteria akceptacji:
  1. Po upłynięciu daty końcowej cyklu przy danym planie pojawia się opcja "Generuj na kolejny okres".
  2. Po jej wybraniu AI analizuje moją historię z ostatniego cyklu i proponuje nowy plan z progresją (np. wyższym ciężarem).
  3. Mam również opcję "Kontynuuj ten sam plan", która po prostu rozpoczyna nowy cykl bez zmian.

## 6. Metryki sukcesu

Kluczowe wskaźniki, które zdefiniują sukces MVP i pozwolą na podejmowanie decyzji o dalszym rozwoju produktu:

1. Wskaźnik Szybkości Onboardingu (Onboarding Speed Rate):
   - Metryka: Czas od rejestracji do zapisania pierwszego planu treningowego.
   - Cel: Użytkownik jest w stanie stworzyć lub wygenerować i zapisać kompletny plan treningowy w mniej niż 5 minut.
   - Sposób pomiaru: Analityka zdarzeń w aplikacji (event tracking).

2. Wskaźnik Zaangażowania w Trening (Workout Engagement Rate):
   - Metryka: Procent sesji treningowych, w których użytkownik aktywnie korzysta z funkcji śledzenia (odznaczanie serii, wpisywanie wyników) i minutnika.
   - Cel: Minimum 80% rozpoczętych treningów kończy się z przynajmniej jedną interakcją z funkcjami śledzenia.
   - Sposób pomiaru: Analityka zdarzeń w aplikacji.

3. Wskaźnik Akceptacji AI (AI Adoption Rate):
   - Metryka: Stosunek liczby zaakceptowanych planów wygenerowanych przez AI do całkowitej liczby prób generowania.
   - Cel: Minimum 70% wygenerowanych przez AI planów jest akceptowanych przez użytkowników (poprzez kliknięcie przycisku "Zaakceptuj i zapisz").
   - Sposób pomiaru: Zliczanie zdarzeń kliknięcia przycisków "Zaakceptuj" i "Odrzuć" po generacji planu.
