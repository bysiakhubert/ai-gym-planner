# API Endpoint Implementation Plan: List Plans

## 1. Przegląd punktu końcowego

Punkt końcowy `GET /api/plans` umożliwia pobranie listy aktywnych planów treningowych dla zalogowanego użytkownika. Endpoint wspiera paginację oraz sortowanie wyników. Ze względów wydajnościowych zwraca dane w formacie podsumowania (`PlanSummary`), pomijając ciężkie struktury JSON (szczegóły planu i preferencje).

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/plans`
- **Parametry zapytania (Query Parameters)**:
  - **Opcjonalne**:
    - `limit`: Liczba wyników na stronę (domyślnie: 20, max: 100).
    - `offset`: Przesunięcie paginacji (domyślnie: 0).
    - `sort`: Pole sortowania (domyślnie: "effective_from"). Dozwolone wartości: `effective_from`, `created_at`, `name`.
    - `order`: Kierunek sortowania (domyślnie: "desc"). Dozwolone wartości: `asc`, `desc`.
- **Nagłówki**:
  - `Content-Type`: `application/json`
  - Autoryzacja: Cookie sesyjne (obsługiwane przez middleware Supabase/Astro).

## 3. Wykorzystywane typy

Implementacja będzie korzystać z następujących definicji typów (z `src/types.ts`):

- **DTO**: `ListPlansQueryParams` (parametry wejściowe)
- **Response**: `PaginatedPlansResponse` (struktura wyjściowa)
- **Entity Subset**: `PlanSummary` (model danych dla listy)
- **Validation**: Schemat Zod dla `ListPlansQueryParams` (należy utworzyć).

## 3. Szczegóły odpowiedzi

**Kod sukcesu**: `200 OK`

**Struktura ciała odpowiedzi** (`PaginatedPlansResponse`):

```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "string",
      "effective_from": "ISO8601 string",
      "effective_to": "ISO8601 string",
      "source": "ai | manual",
      "created_at": "ISO8601 string",
      "updated_at": "ISO8601 string"
    }
  ],
  "pagination": {
    "total": number,
    "limit": number,
    "offset": number,
    "has_more": boolean
  }
}
```

## 4. Przepływ danych

1.  **Odebranie żądania**: Handler w `src/pages/api/plans/index.ts` odbiera żądanie GET.
2.  **Autentykacja**: Weryfikacja sesji użytkownika za pomocą `context.locals.user` (zasilane przez middleware). Jeśli brak użytkownika -> `401 Unauthorized`.
3.  **Parsowanie i Walidacja**: Pobranie parametrów URL i walidacja za pomocą schematu Zod (`z.coerce.number()` dla liczb). Jeśli błąd -> `400 Bad Request`.
4.  **Logika biznesowa (Service)**: Wywołanie metody `listPlans` w serwisie `PlansService`.
5.  **Zapytanie do bazy danych (Supabase)**:
    - Wybór kolumn odpowiadających `PlanSummary`.
    - Filtrowanie po `user_id` (automatycznie przez RLS, ale warto dodać explicite dla czytelności).
    - Filtrowanie `archived = false` (tylko aktywne plany).
    - Aplikacja sortowania i paginacji (`range`).
6.  **Transformacja**: Przekształcenie wyniku z bazy danych do struktury `PaginatedPlansResponse` (obliczenie `has_more`).
7.  **Odpowiedź**: Zwrócenie danych w formacie JSON.

## 5. Względy bezpieczeństwa

- **Uwierzytelnianie**: Endpoint dostępny tylko dla zalogowanych użytkowników.
- **Autoryzacja (RLS)**: Polityka Row Level Security w bazie danych (`Users can view own plans`) gwarantuje, że użytkownik otrzyma tylko swoje plany.
- **Walidacja danych**:
  - Parametry `limit` i `offset` muszą być nieujemnymi liczbami całkowitymi. `limit` ograniczony do max 100.
  - Parametry `sort` i `order` są sprawdzane względem dozwolonej listy wartości (whitelist), aby zapobiec SQL Injection w klauzulach `ORDER BY` (chociaż Supabase query builder jest bezpieczny, walidacja zapobiega błędom logicznym).

## 6. Obsługa błędów

| Scenariusz | Kod HTTP | Opis |
| :--- | :--- | :--- |
| Brak sesji użytkownika | 401 | Użytkownik nie jest zalogowany. |
| Nieprawidłowe parametry Query | 400 | Np. `limit` nie jest liczbą, `sort` ma niedozwoloną wartość. Szczegóły błędu z Zod. |
| Błąd połączenia z bazą danych | 500 | Wewnętrzny błąd serwera podczas wykonywania zapytania. |
| Nieoczekiwany błąd serwera | 500 | Catch-all dla nieprzewidzianych wyjątków. |

## 7. Rozważania dotyczące wydajności

- **Paginacja**: Wymuszona paginacja (limit max 100) zapobiega pobraniu zbyt dużej ilości danych na raz.
- **Selekcja kolumn**: Zapytanie pobiera tylko kolumny niezbędne dla `PlanSummary`, pomijając duże kolumny JSONB (`plan`, `preferences`), co znacząco zmniejsza obciążenie sieci i bazy.
- **Indeksy**: Zgodnie z planem bazy danych, po fazie MVP rekomendowane są indeksy na `(user_id)` oraz `(user_id, effective_from, effective_to)`. Na etapie MVP polegamy na domyślnej wydajności Postgresa przy mniejszej skali.

## 8. Etapy wdrożenia

### Krok 1: Schematy Walidacji
Utwórz plik walidacji (np. w `src/lib/validators/plans.ts` lub wewnątrz pliku endpointu), definiując schemat Zod dla `ListPlansQueryParams`.
- Użyj `z.coerce.number()` dla `limit` i `offset`.
- Użyj `z.enum()` dla `sort` i `order`.

### Krok 2: Implementacja PlansService
Utwórz lub zaktualizuj `src/lib/services/plans.service.ts`.
- Dodaj metodę `listPlans(userId: string, params: ListPlansQueryParams)`.
- Zaimplementuj zapytanie do Supabase używając klienta przekazanego z kontekstu lub tworzonego wewnątrz serwisu (zgodnie z `src/db/supabase.client.ts`).
- **Uwaga**: Serwisy w tym projekcie powinny przyjmować klienta Supabase jako zależność lub korzystać z niego w sposób zgodny z architekturą Astro (Server Endpoints mają dostęp do `context.locals.supabase`). Najlepiej przekazać klienta jako argument metody.

### Krok 3: Utworzenie Endpointu API
Utwórz plik `src/pages/api/plans/index.ts`.
- Skonfiguruj `export const prerender = false`.
- Zaimplementuj handler `GET`.
- Wyodrębnij parametry z `request.url`.
- Przeprowadź walidację.
- Wywołaj serwis.
- Zwróć odpowiedź `Response` z JSON.

### Krok 4: Testowanie Manualne
- Sprawdź odpowiedź dla braku parametrów (domyślne wartości).
- Sprawdź poprawność paginacji (limit/offset).
- Sprawdź sortowanie.
- Zweryfikuj obsługę błędów (nieprawidłowe parametry).

