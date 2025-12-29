# Plan Wdrożenia Usługi OpenRouter

Ten dokument opisuje szczegółowy plan implementacji `OpenRouterService` - kluczowego komponentu odpowiedzialnego za komunikację z modelami językowymi (LLM) poprzez API OpenRouter. Usługa ta będzie fundamentem dla funkcjonalności generowania planów treningowych w aplikacji GymPlanner.

## 1. Opis Usługi

`OpenRouterService` to niskopoziomowa usługa infrastrukturalna, której wyłącznym zadaniem jest obsługa komunikacji HTTP z API OpenRouter. Działa ona jako warstwa abstrakcji, ukrywając szczegóły techniczne (autoryzacja, nagłówki, formatowanie żądań) przed resztą aplikacji. Usługa ta powinna być "agnostyczna" domenowo w miarę możliwości, ale zoptymalizowana pod kątem odbierania ustrukturyzowanych danych JSON (Structured Outputs), co jest kluczowe dla generowania planów treningowych.

**Kluczowe cechy:**
- Obsługa autoryzacji (Bearer Token).
- Wymuszanie poprawnych nagłówków wymaganych przez OpenRouter (HTTP-Referer, X-Title).
- Obsługa `response_format` w postaci JSON Schema dla gwarancji struktury danych.
- Obsługa błędów sieciowych i API.
- Śledzenie kosztów (opcjonalnie, logowanie metryk użycia).

## 2. Opis Konstruktora

Konstruktor usługi powinien inicjalizować klienta HTTP oraz ładować niezbędne zmienne środowiskowe. Ze względów bezpieczeństwa, usługa ta **musi** działać wyłącznie po stronie serwera (SSR/API Routes).

```typescript
constructor(config: OpenRouterConfig)
```

**Wymagane parametry konfiguracyjne (zmienne środowiskowe):**
- `apiKey`: Klucz API OpenRouter (z `import.meta.env.OPENROUTER_API_KEY`).
- `siteUrl`: URL aplikacji (dla rankingu OpenRouter, np. `import.meta.env.SITE_URL`).
- `siteName`: Nazwa aplikacji (np. "GymPlanner").

**Logika inicjalizacji:**
1. Sprawdzenie obecności klucza API. Jeśli brak -> rzuć błąd krytyczny (fail fast).
2. Ustawienie domyślnych nagłówków dla wszystkich zapytań (`Authorization`, `HTTP-Referer`, `X-Title`, `Content-Type`).

## 3. Publiczne Metody i Pola

### `complete<T>(request: CompletionRequest): Promise<CompletionResponse<T>>`

Główna metoda do generowania odpowiedzi z modelu. Jest generyczna `<T>`, co pozwala na typowanie zwracanej odpowiedzi zgodnie z oczekiwanym schematem Zod.

**Parametry (`CompletionRequest`):**
- `messages`: Tablica obiektów `{ role: 'system' | 'user', content: string }`.
- `schema`: Schemat Zod (`z.ZodType<T>`), który zostanie przekonwertowany na JSON Schema dla modelu.
- `model`: (Opcjonalnie) Nazwa modelu, domyślnie np. `google/gemini-2.0-flash-exp:free` lub `openai/gpt-4o-mini`.
- `options`: (Opcjonalnie) Dodatkowe parametry jak `temperature`, `max_tokens`.

**Zwraca (`CompletionResponse<T>`):**
- `data`: Sparsowany obiekt typu `T`.
- `usage`: Informacje o zużyciu tokenów (prompt/completion/total).
- `model`: Nazwa użytego modelu.

## 4. Prywatne Metody i Pola

- `client`: Instancja klienta HTTP (np. `fetch` wrapper lub dedykowana klasa).
- `defaultModel`: Domyślny model zdefiniowany w stałych.
- `transformSchemaToFormat(schema: z.ZodType): object`: Metoda pomocnicza konwertująca obiekt Zod na format JSON Schema akceptowany przez OpenRouter (`response_format`).

## 5. Obsługa Błędów

Usługa powinna definiować własne typy błędów, aby ułatwić ich obsługę w warstwach wyższych:

1.  **`OpenRouterConfigurationError`**: Brak klucza API lub złe zmienne środowiskowe.
2.  **`OpenRouterNetworkError`**: Błąd połączenia, timeout.
3.  **`OpenRouterAPIError`**: Błąd zwrócony przez API (4xx, 5xx) - np. brak środków, limit zapytań.
4.  **`OpenRouterParseError`**: Otrzymana odpowiedź nie jest poprawnym JSON-em lub nie pasuje do schematu Zod.

## 6. Kwestie Bezpieczeństwa

1.  **Server-Side Only**: Usługa musi być importowana i używana tylko w plikach `.astro` w sekcji frontmatter (server logic) lub w endpointach API (`src/pages/api/`). Nie może trafić do bundle'a klienckiego.
2.  **API Key Protection**: Klucz API nigdy nie może być eksponowany w kodzie klienckim. Należy używać `import.meta.env.OPENROUTER_API_KEY` (nie `PUBLIC_`).
3.  **Input Validation**: Wszystkie dane wejściowe od użytkownika (np. uwagi do planu) muszą być sanityzowane przed wstawieniem do promptu, aby uniknąć Prompt Injection (choć w przypadku generowania JSON ryzyko jest mniejsze).

## 7. Plan Wdrożenia Krok po Kroku

### Krok 1: Instalacja Zależności

Potrzebujemy `zod` (już jest w projekcie) oraz `zod-to-json-schema` do konwersji typów dla LLM.

```bash
npm install zod-to-json-schema
```

### Krok 2: Definicja Schematów Zod (Typy Domenowe)

W pliku `src/lib/schemas/ai-response.ts` (utwórz nowy plik) zdefiniuj strukturę planu treningowego, której oczekujemy od AI. Musi ona pokrywać się z wymaganiami UI, ale być uproszczona dla modelu.

```typescript
import { z } from "zod";

export const aiSetSchema = z.object({
  reps: z.number().describe("Liczba powtórzeń"),
  weight: z.number().optional().describe("Sugerowany ciężar w kg (opcjonalne)"),
  rest_seconds: z.number().describe("Czas przerwy w sekundach"),
  rir: z.number().optional().describe("Reps In Reserve (sugerowana intensywność)"),
});

export const aiExerciseSchema = z.object({
  name: z.number().describe("Dokładna nazwa ćwiczenia"),
  sets: z.array(aiSetSchema).describe("Lista serii dla tego ćwiczenia"),
  notes: z.string().optional().describe("Wskazówki techniczne"),
});

export const aiWorkoutDaySchema = z.object({
  name: z.string().describe("Nazwa treningu, np. 'Push A'"),
  exercises: z.array(aiExerciseSchema),
});

export const aiPlanSchema = z.object({
  name: z.string().describe("Nazwa całego planu"),
  description: z.string().describe("Krótki opis strategii planu"),
  schedule: z.array(aiWorkoutDaySchema).describe("Lista dni treningowych w cyklu"),
  cycle_duration_weeks: z.number(),
});

export type AiPlanResponse = z.infer<typeof aiPlanSchema>;
```

### Krok 3: Implementacja `OpenRouterService`

Utwórz plik `src/lib/services/openRouterService.ts`.

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Definicje błędów
export class OpenRouterError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "OpenRouterError";
  }
}

interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface Message {
  role: "system" | "user";
  content: string;
}

export class OpenRouterService {
  private apiKey: string;
  private siteUrl: string;
  private siteName: string;
  private baseUrl = "https://openrouter.ai/api/v1";
  // Używamy modelu Google Gemini 2.0 Flash Exp jako default (tani/darmowy i szybki)
  // lub openai/gpt-4o-mini
  private defaultModel = "google/gemini-2.0-flash-exp:free";

  constructor() {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    const siteUrl = import.meta.env.SITE_URL || "http://localhost:4321";
    const siteName = "GymPlanner";

    if (!apiKey) {
      throw new OpenRouterError("OPENROUTER_API_KEY is not set");
    }

    this.apiKey = apiKey;
    this.siteUrl = siteUrl;
    this.siteName = siteName;
  }

  async generateStructuredCompletion<T>(
    messages: Message[],
    schema: z.ZodType<T>,
    options: CompletionOptions = {}
  ): Promise<T> {
    const jsonSchema = zodToJsonSchema(schema, "response");

    // Budowanie payloadu zgodnie z OpenAI API (OpenRouter jest kompatybilny)
    const payload = {
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.2, // Niska temperatura dla lepszej struktury
      max_tokens: options.maxTokens ?? 4000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true, // Wymaga dokładnego dopasowania do schematu
          schema: jsonSchema,
        },
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new OpenRouterError(`API Error: ${response.status} - ${errorBody}`, response.status.toString());
      }

      const data = await response.json();
      
      // Parsowanie odpowiedzi modelu
      const rawContent = data.choices[0]?.message?.content;
      
      if (!rawContent) {
        throw new OpenRouterError("Model returned empty content");
      }

      // Parsowanie JSON i walidacja Zod
      try {
        const parsedJson = JSON.parse(rawContent);
        return schema.parse(parsedJson);
      } catch (e) {
        console.error("Failed to parse model output:", rawContent);
        throw new OpenRouterError("Failed to parse structured output from model");
      }

    } catch (error) {
      if (error instanceof OpenRouterError) throw error;
      throw new OpenRouterError(`Network or unknown error: ${(error as Error).message}`);
    }
  }
}
```

### Krok 4: Konfiguracja Promptów

W serwisie domenowym (`AiPlannerService`) należy przygotować odpowiedni System Message.

**System Message Example:**
> "Jesteś ekspertem trenerem personalnym. Twoim celem jest tworzenie spersonalizowanych, bezpiecznych i efektywnych planów treningowych. Zwracaj dane WYŁĄCZNIE w formacie JSON zgodnym z podanym schematem. Nie dodawaj żadnego tekstu przed ani po JSON."

**User Message Example:**
> "Stwórz plan treningowy dla celu: Budowa masy mięśniowej (Hipertrofia). System: PPL (Push Pull Legs). Dostępne dni: 3. Czas na trening: 60 minut. Poziom: Średniozaawansowany. Uwagi: Mam kontuzję barku, unikaj wyciskania zza karku."

### Krok 5: Aktualizacja `AiPlannerService`

Zmodyfikuj `src/lib/services/aiPlannerService.ts`, aby używał nowej klasy `OpenRouterService`.

```typescript
import { OpenRouterService } from "./openRouterService";
import { aiPlanSchema } from "../schemas/ai-response";

export class AiPlannerService {
  private openRouter: OpenRouterService;

  constructor() {
    this.openRouter = new OpenRouterService();
  }

  async generatePlanPreview(preferences: UserPreferences): Promise<GeneratePlanResponse> {
    // 1. Budowanie promptu na podstawie preferences
    const systemPrompt = "Jesteś ekspertem...";
    const userPrompt = `Cel: ${preferences.goal}...`; // sformatuj ładnie

    // 2. Wywołanie OpenRouter
    const aiResponse = await this.openRouter.generateStructuredCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      aiPlanSchema
    );

    // 3. Mapowanie aiResponse na format domenowy (PlanStructure)
    // ... logika transformacji ...
    
    return finalResponse;
  }
}
```

### Krok 6: Endpoint API

Upewnij się, że endpoint `src/pages/api/plans/generate.ts` (lub podobny) poprawnie instancjonuje serwis i obsługuje błędy, zwracając odpowiednie kody HTTP (500 w przypadku błędu AI).


