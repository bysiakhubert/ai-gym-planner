# Plan implementacji widoku Sesja Treningowa (Active Session)

## 1. Przegląd

Widok "Sesja Treningowa" jest sercem aplikacji GymPlanner, umożliwiającym użytkownikowi realizację treningu w czasie rzeczywistym. Widok ten służy jako interaktywny "dziennik", w którym użytkownik widzi zaplanowane ćwiczenia, wprowadza rzeczywiste wyniki (ciężar, powtórzenia), odznacza wykonane serie oraz zarządza czasem przerw za pomocą wbudowanego minutnika. Kluczowym aspektem jest zapewnienie ciągłości danych (zapis w LocalStorage i autosave) oraz wysokiej ergonomii na urządzeniach mobilnych.

## 2. Routing widoku

- **Ścieżka:** `/session/active`
- **Mechanizm:** Strona Astro, która po stronie serwera sprawdza, czy użytkownik ma aktywną (niezakończoną) sesję.
  - Jeśli tak: renderuje widok sesji.
  - Jeśli nie: przekierowuje do Dashboardu lub widoku wyboru planu (zależnie od logiki biznesowej, MVP zakłada przekierowanie do `/` z komunikatem).
- **Parametry:** ID sesji jest pobierane dynamicznie z bazy na podstawie aktywnego statusu użytkownika lub przekazywane jako query param w razie potrzeby bezpośredniego linkowania.

## 3. Struktura komponentów

```text
src/pages/session/active.astro (Page Wrapper & Auth/Data Fetching)
└── ActiveSessionView (React Container - client:only)
    ├── SessionHeader (Informacje o planie, dniu i dacie)
    ├── WorkoutTimer (Sticky/Fixed Component - Global Timer State)
    ├── ExerciseList (Scrollable Area)
    │   └── ExerciseCard (Mapowane dla każdego ćwiczenia)
    │       ├── CardHeader (Nazwa ćwiczenia)
    │       └── SetList
    │           └── SetRow (Mapowane dla każdej serii)
    │               ├── SetIndicator (Numer serii)
    │               ├── DataInputs (Planned vs Actual values)
    │               ├── RestButton (Trigger dla minutnika)
    │               └── CompletionCheckbox
    ├── SessionFooter
    │   ├── CancelButton
    │   └── FinishWorkoutButton
    ├── CompletionDialog (Modal potwierdzenia zakończenia)
    └── ExitAlert (Logika beforeunload)
```

## 4. Szczegóły komponentów

### `ActiveSessionView` (Container)
- **Opis:** Główny kontener zarządzający stanem całej sesji. Inicjalizuje stan z danych serwera lub LocalStorage (w przypadku odświeżenia). Koordynuje komunikację z API (autosave, complete).
- **Główne elementy:** `div` layoutu, Context Providers (dla Timera i Danych).
- **Obsługiwane interakcje:** Inicjalizacja sesji, obsługa globalnego zapisu, obsługa błędów API.
- **Typy:** `SessionResponse` (init data).
- **Propsy:** `initialSession: SessionResponse`.

### `ExerciseCard`
- **Opis:** Karta grupująca serie dla danego ćwiczenia.
- **Główne elementy:** `Card` (Shadcn), `Table` lub Grid layout dla serii.
- **Typy:** `SessionExercise` (z `src/types.ts`).
- **Propsy:** `exercise: SessionExercise`, `exerciseIndex: number`, `onUpdate: function`.

### `SetRow`
- **Opis:** Wiersz reprezentujący pojedynczą serię. To tutaj zachodzi większość interakcji.
- **Główne elementy:** Inputy numeryczne (Shadcn `Input`), `Checkbox`, `Button` (ikonka zegara).
- **Obsługiwane interakcje:**
  - `onChange` inputów: aktualizacja stanu lokalnego `actual_reps`/`actual_weight`.
  - `onCheck`: oznaczenie serii jako wykonanej. **Logika UX:** Jeśli inputy są puste w momencie odhaczenia, automatycznie kopiuje wartości z `planned_*` do `actual_*`.
  - `onRestClick`: uruchamia minutnik z czasem zdefiniowanym w `rest_seconds`.
- **Obsługiwana walidacja:** Inputy akceptują tylko wartości nieujemne.
- **Typy:** `SessionSet`.
- **Propsy:** `set: SessionSet`, `setIndex: number`, `onUpdate: (field, value) => void`, `onStartRest: (seconds) => void`.

### `WorkoutTimer`
- **Opis:** Komponent "przyklejony" do dołu ekranu (lub floating action button rozwijany do panelu). Pokazuje pozostały czas przerwy.
- **Główne elementy:** Wyświetlacz czasu (MM:SS), przyciski kontrolne (Start/+30s/Stop/Skip).
- **Obsługiwane interakcje:** Zarządzanie odliczaniem w Web Workerze (aby działało w tle na mobile), odtwarzanie dźwięku po zakończeniu.
- **Propsy:** Korzysta z `TimerContext`.

### `SessionFooter`
- **Opis:** Belka nawigacyjna na dole strony.
- **Główne elementy:** Przycisk "Zakończ trening" (Primary), "Anuluj" (Ghost/Destructive).
- **Obsługiwane interakcje:** Kliknięcie otwiera `CompletionDialog`.

## 5. Typy

Większość typów jest już zdefiniowana w `@src/types.ts`. Będziemy korzystać bezpośrednio z:
- `SessionStructure` - główny stan.
- `SessionExercise`
- `SessionSet`

Dodatkowe typy lokalne (ViewModel):
```typescript
// Stan timera
interface TimerState {
  isRunning: boolean;
  timeLeft: number; // w sekundach
  initialTime: number;
  activeSetId: string | null; // opcjonalnie, by wiedzieć której serii dotyczy
}

// Stan formularza sesji
interface SessionState {
  data: SessionStructure;
  isDirty: boolean; // czy są niezapisane zmiany
  isSaving: boolean;
  lastSavedAt: Date | null;
}
```

## 6. Zarządzanie stanem

Zostanie wykorzystany **Custom Hook `useActiveSession`**:
1. **Inicjalizacja:** Ładuje dane z propsów. Sprawdza `localStorage` pod kluczem `active_session_${id}`. Jeśli w LocalStorage jest nowsza wersja (timestamp), pyta użytkownika lub ładuje ją automatycznie.
2. **Aktualizacje:**
   - Funkcja `updateSet(exerciseIdx, setIdx, field, value)`: aktualizuje stan Reacta natychmiastowo.
   - **Debounce:** Używa `useDebounce` lub podobnego mechanizmu, aby wysyłać żądanie `PATCH` do API nie częściej niż np. co 5 sekund lub przy kluczowych zdarzeniach (zakończenie serii).
   - **LocalStorage:** Każda zmiana stanu jest synchronicznie zapisywana w `localStorage` jako backup.
3. **Zakończenie:** Funkcja `completeSession` wysyła ostateczny stan do endpointu `complete`, czyści `localStorage` i przekierowuje.

**Custom Hook `useWorkoutTimer`:**
- Zarządza czasem.
- Obsługuje logikę "background throttling" (korzystając z `Date.now()` do obliczania delty czasu, a nie polegając tylko na `setInterval`).
- Obsługuje API wibracji (`navigator.vibrate`) i audio HTML5.

## 7. Integracja API

Integracja z istniejącymi endpointami w `src/pages/api/sessions`.

1. **Pobranie sesji (Server-side):**
   - GET `/api/sessions?completed=false&limit=1` (potrzebujemy logiki backendowej lub helpera `sessionService` bezpośrednio w `.astro`).
   - Alternatywnie: Jeśli ID jest znane, `GET /api/sessions/[id]`.

2. **Aktualizacja (Autosave):**
   - **Metoda:** `PATCH`
   - **URL:** `/api/sessions/[id]`
   - **Body:** `{ session: SessionStructure }` (zgodnie z `UpdateSessionRequestSchema`)
   - **Strategia:** Optimistic UI. Nie czekamy na odpowiedź, chyba że wystąpi błąd (wtedy Toast + retry).

3. **Zakończenie:**
   - **Metoda:** `POST`
   - **URL:** `/api/sessions/[id]/complete`
   - **Body:** `{ session: SessionStructure }` (Opcjonalnie wysyłamy ostatni stan dla pewności).
   - **Odpowiedź:** `SessionResponse` (zawiera `ended_at`).

## 8. Interakcje użytkownika

1. **Start:** Użytkownik wchodzi na stronę. Dane się ładują.
2. **Wykonywanie serii:**
   - Użytkownik wykonuje ćwiczenie.
   - Wpisuje np. "10" w pole powtórzeń i "80" w ciężar.
   - Klika Checkbox.
   - (Opcjonalnie) Timer startuje automatycznie (jeśli włączone w opcjach - MVP: start ręczny).
3. **Odpoczynek:**
   - Użytkownik klika ikonę zegara przy serii.
   - Timer wysuwa się z dołu. Odlicza czas.
   - Koniec czasu -> Dźwięk "Ding" + wibracja.
4. **Zakończenie:**
   - Klika "Zakończ trening".
   - Modal: "Czy na pewno? Masz 2 nieukończone serie."
   - Potwierdzenie -> API Request -> Redirect do `/history` lub `/dashboard`.

## 9. Warunki i walidacja

- **Inputy numeryczne:** Blokada wpisywania znaków innych niż cyfry (i ewentualnie kropka).
- **Zakończenie:** Możliwe nawet jeśli nie wszystkie serie są zrobione (partial workout), ale wymaga potwierdzenia w modalu.
- **Spójność:** `actual_reps` i `actual_weight` mogą być `null` tylko jeśli seria jest nieukończona. Przy zaznaczaniu `completed=true`, muszą mieć wartość (domyślnie kopiowaną z planu).

## 10. Obsługa błędów

- **Błąd zapisu (PATCH):** Wyświetlenie ikony "Cloud Error" / Toast z informacją "Błąd zapisu. Próbuję ponownie...". Dane są bezpieczne w LocalStorage.
- **Błąd sieci przy Zakończeniu:** Blokada przekierowania, komunikat błędu. Przycisk "Spróbuj ponownie".
- **Przypadkowe zamknięcie karty:** `window.onbeforeunload` wyświetla natywny alert przeglądarki "Masz niezapisany trening".

## 11. Kroki implementacji

1. **Backend Integration (Astro):** Stworzenie strony `src/pages/session/active.astro` i logiki pobierania aktywnej sesji użytkownika.
2. **UI Skeleton:** Stworzenie komponentów `ActiveSessionView`, `ExerciseCard`, `SetRow` z mockowanymi danymi.
3. **State Management Logic:** Implementacja hooka `useActiveSession` (inicjalizacja, update struktury JSON).
4. **Interakcje formularza:** Podpięcie inputów i checkboxów pod stan. Implementacja logiki "Smart Copy" (przepisywanie planned -> actual).
5. **API connection:** Podpięcie `PATCH` (autosave) i `POST` (complete) przy użyciu fetchera.
6. **Timer Implementation:** Stworzenie komponentu `WorkoutTimer` i hooka `useWorkoutTimer` z obsługą Web Audio API.
7. **Persistence:** Dodanie warstwy `localStorage` i odzyskiwania sesji.
8. **Final Polish:** Stylowanie (Shadcn/Tailwind), modale potwierdzeń, obsługa błędów i testy manualne na mobile.

