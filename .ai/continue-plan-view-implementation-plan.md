# Plan implementacji widoku Kontynuacji Planu (Continue Plan)

## 1. Przegląd

Celem tego wdrożenia jest umożliwienie użytkownikom duplikowania istniejącego planu treningowego na nowy okres czasu bez wprowadzania modyfikacji przez AI (zgodnie z US-011 / F-021). Funkcjonalność ta będzie realizowana poprzez nowy komponent modalny `ContinuePlanDialog`, dostępny zarówno z poziomu listy planów, jak i widoku szczegółów planu.

## 2. Routing widoku

Funkcjonalność nie posiada dedykowanego adresu URL (strony). Jest to akcja dostępna w ramach istniejących widoków:
- `/plans` (Lista planów)
- `/plans/[id]` (Szczegóły planu)

## 3. Struktura komponentów

Nowy komponent zostanie zintegrowany z istniejącą hierarchią:

1.  **`ContinuePlanDialog`** (Nowy komponent) - Modal odpowiedzialny za konfigurację duplikacji.
2.  **`PlanDetailsHeader`** (Modyfikacja) - Dodanie przycisku wywołującego dialog.
3.  **`PlansListContainer`** (Modyfikacja) - Dodanie opcji w menu kontekstowym każdego planu.

## 4. Szczegóły komponentów

### `ContinuePlanDialog`

-   **Opis**: Komponent modalny oparty na `Dialog` z biblioteki Shadcn/ui. Pozwala użytkownikowi zdefiniować datę rozpoczęcia nowego cyklu oraz opcjonalnie zmienić nazwę planu.
-   **Główne elementy**:
    -   `Dialog` (kontener).
    -   `Input` (pole tekstowe dla nazwy planu).
    -   `Calendar` / `Popover` (wybór daty rozpoczęcia `effective_from`).
    -   `Button` (Zatwierdź, Anuluj).
-   **Obsługiwane interakcje**:
    -   Wprowadzenie nazwy (domyślnie: "Kopia {stara_nazwa}").
    -   Wybór daty z kalendarza (domyślnie: dzień po zakończeniu obecnego planu lub dzisiaj).
    -   Zatwierdzenie formularza -> wywołanie API.
-   **Obsługiwana walidacja**:
    -   `name`: Wymagane, min. 1 znak, max. 100 znaków.
    -   `effective_from`: Wymagana poprawna data.
-   **Typy (ViewModel)**:
    ```typescript
    interface ContinuePlanFormData {
      name: string;
      effectiveFrom: Date | undefined;
    }
    ```
-   **Propsy**:
    ```typescript
    interface ContinuePlanDialogProps {
      planId: string;
      currentPlanName: string;
      currentPlanEndDate: string; // ISO Date string
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onSuccess?: (newPlanId: string) => void;
    }
    ```

## 5. Typy

Wykorzystanie istniejących typów z `src/types.ts` oraz dodanie definicji odpowiedzi błędu specyficznej dla nakładania się dat.

1.  **`ContinuePlanRequest`** (Istniejący):
    -   `effective_from`: string (YYYY-MM-DD)
    -   `name`: string (opcjonalny)

2.  **`DateOverlapError`** (Obsługa błędu):
    -   Należy przygotować obsługę błędu API, który zwraca informacje o konflikcie dat, aby wyświetlić precyzyjny komunikat w formularzu.

## 6. Zarządzanie stanem

Zarządzanie stanem odbywa się lokalnie w komponencie `ContinuePlanDialog` przy użyciu `useState` lub `React Hook Form`.

-   `isLoading`: boolean - blokuje formularz podczas wysyłania żądania.
-   `error`: string | null - przechowuje komunikaty błędów (np. z API).
-   `formData`: obiekt przechowujący wybraną datę i nazwę.

Komponenty nadrzędne (`PlanDetailsView`, `PlansListContainer`) będą zarządzać stanem widoczności modala (`isOpen`).

## 7. Integracja API

Należy dodać nową funkcję w `src/lib/api/plans.ts` obsługującą endpoint.

-   **Funkcja**: `continuePlan(id: string, data: ContinuePlanRequest): Promise<PlanResponse>`
-   **Metoda**: `POST`
-   **URL**: `/api/plans/[id]/continue`
-   **Request Body**:
    ```json
    {
      "effective_from": "2024-01-01",
      "name": "Plan Treningowy - Cykl 2"
    }
    ```
-   **Response**: Obiekt `PlanResponse` (nowo utworzony plan).

## 8. Interakcje użytkownika

1.  **Inicjacja**: Użytkownik klika "Kontynuuj plan" na liście lub w szczegółach.
2.  **Konfiguracja**: Otwiera się modal. Pole daty jest wstępnie wypełnione (sugerowana data: dzień po zakończeniu źródłowego planu).
3.  **Akcja**: Użytkownik może zmienić nazwę i datę.
4.  **Zatwierdzenie**: Kliknięcie "Utwórz plan".
    -   Pojawia się stan ładowania.
5.  **Sukces**: Modal się zamyka, pojawia się powiadomienie (Toast), następuje przekierowanie do nowego planu LUB odświeżenie listy.

## 9. Warunki i walidacja

-   **Format Daty**: Data musi być przekonwertowana do formatu `YYYY-MM-DD` przed wysłaniem do API, uwzględniając lokalną strefę czasową użytkownika (aby uniknąć przesunięcia o jeden dzień).
-   **Konflikt Dat**: Frontend musi obsłużyć błąd 409/400 oznaczający `DateOverlapError` i wyświetlić go pod polem wyboru daty, zamiast ogólnego błędu.

## 10. Obsługa błędów

-   **Błędy walidacji formularza**: Wyświetlane inline pod polami (np. brak nazwy).
-   **Błąd nakładania się planów**: Specjalny komunikat: "W wybranym okresie istnieje już inny aktywny plan. Zmień datę rozpoczęcia lub zarchiwizuj kolidujący plan."
-   **Błędy serwera**: Ogólny komunikat Toast: "Nie udało się utworzyć kontynuacji planu. Spróbuj ponownie."

## 11. Kroki implementacji

1.  **Aktualizacja warstwy API**:
    -   Dodać funkcję `continuePlan` w `src/lib/api/plans.ts`.

2.  **Stworzenie komponentu `ContinuePlanDialog`**:
    -   Utworzyć plik `src/components/plans/ContinuePlanDialog.tsx`.
    -   Zaimplementować UI przy użyciu komponentów Shadcn (`Dialog`, `Form`, `Calendar`).
    -   Zaimplementować logikę wysyłania formularza i obsługi błędów.

3.  **Integracja w widoku szczegółów (`PlanDetailsView`)**:
    -   Dodać przycisk w nagłówku/sekcji akcji.
    -   Podpiąć stan otwarcia dialogu.
    -   Obsłużyć przekierowanie do nowego planu po sukcesie.

4.  **Integracja w widoku listy (`PlansListContainer` / `PlanCard`)**:
    -   Dodać opcję "Kontynuuj" w menu rozwijanym planu.
    -   Obsłużyć odświeżenie listy po sukcesie.

