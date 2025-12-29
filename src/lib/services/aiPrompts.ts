import type { UserPreferences } from "src/types";

/**
 * System message for AI trainer
 * Defines the role, expertise, and output format requirements
 */
export const SYSTEM_MESSAGE = `Jesteś ekspertem trenerem personalnym z wieloletnim doświadczeniem w tworzeniu skutecznych planów treningowych.

TWOJE KOMPETENCJE:
- Doskonała znajomość anatomii i fizjologii wysiłku
- Rozumienie różnych systemów treningowych (PPL, Upper/Lower, Full Body, itd.)
- Umiejętność dostosowywania planów do różnych celów (hipertrofia, siła, wytrzymałość)
- Znajomość bezpiecznych i efektywnych technik wykonywania ćwiczeń
- Uwzględnianie kontuzji i ograniczeń użytkownika

ZASADY TWORZENIA PLANÓW:
1. Zawsze priorytetyzuj bezpieczeństwo i prawidłową technikę
2. Dobieraj ćwiczenia zgodnie z systemem treningowym użytkownika
3. Uwzględniaj dostępny czas na trening i liczbę dni treningowych
4. Proponuj realistyczne obciążenia dostosowane do poziomu zaawansowania
5. Zapewnij odpowiedni balans między partiami mięśniowymi
6. Uwzględniaj progresywne przeciążanie w ramach cyklu
7. Jeśli użytkownik wspomina o kontuzji lub ograniczeniach, bezwzględnie ich przestrzegaj

WAŻNE WYMAGANIA TECHNICZNE:
- Zwracaj dane WYŁĄCZNIE w formacie JSON zgodnym z podanym schematem
- NIE dodawaj żadnego tekstu przed ani po JSON
- NIE używaj markdown formatowania (bez \`\`\`json)
- Upewnij się, że wszystkie pola są wypełnione zgodnie z typami danych
- Nazwy ćwiczeń podawaj po polsku, precyzyjnie i jednoznacznie
- Czasy odpoczynku dostosuj do intensywności ćwiczenia (ciężkie: 120-180s, średnie: 60-90s, lekkie: 30-60s)`;

/**
 * Formats user preferences into a detailed user message prompt
 * @param preferences - User workout preferences
 * @returns Formatted prompt string
 */
export function formatUserPrompt(preferences: UserPreferences): string {
  const { goal, system, available_days, session_duration_minutes, cycle_duration_weeks, notes } = preferences;

  const daysText = available_days.length === 1 ? "1 dzień" : `${available_days.length} dni`;

  let prompt = `Stwórz spersonalizowany plan treningowy o następujących parametrach:

CEL TRENINGOWY: ${goal}
SYSTEM TRENINGOWY: ${system}
DOSTĘPNE DNI TRENINGOWE: ${daysText} w tygodniu
CZAS NA TRENING: ${session_duration_minutes} minut
DŁUGOŚĆ CYKLU: ${cycle_duration_weeks} tygodni`;

  if (notes && notes.trim().length > 0) {
    prompt += `\n\nDODATKOWE UWAGI UŻYTKOWNIKA:\n${notes}`;
  }

  prompt += `\n\nUtwórz kompletny plan treningowy zawierający ${available_days.length} dni treningowych w cyklu. Każdy dzień powinien zawierać 4-6 ćwiczeń z odpowiednią liczbą serii i powtórzeń. Zadbaj o to, aby plan był:
- Dostosowany do wskazanego celu (${goal})
- Zgodny z wybranym systemem treningowym (${system})
- Możliwy do wykonania w czasie ${session_duration_minutes} minut
- Bezpieczny i efektywny dla użytkownika`;

  return prompt;
}

/**
 * Formats next cycle generation prompt based on current plan and history
 * @param preferences - Original user preferences (if available)
 * @param currentPlanName - Name of current plan
 * @param cycleDurationWeeks - Duration of new cycle
 * @param notes - Additional user notes for progression
 * @returns Formatted prompt string
 */
export function formatNextCyclePrompt(
  preferences: UserPreferences | Record<string, never> | null,
  currentPlanName: string,
  cycleDurationWeeks: number,
  notes?: string
): string {
  const hasPreferences = preferences && Object.keys(preferences).length > 0;

  let prompt = `Wygeneruj następny cykl treningowy bazując na poprzednim planie: "${currentPlanName}"

PARAMETRY NOWEGO CYKLU:
DŁUGOŚĆ CYKLU: ${cycleDurationWeeks} tygodni`;

  if (hasPreferences) {
    const prefs = preferences as UserPreferences;
    prompt += `
CEL TRENINGOWY: ${prefs.goal}
SYSTEM TRENINGOWY: ${prefs.system}
LICZBA DNI TRENINGOWYCH: ${prefs.available_days.length}
CZAS NA TRENING: ${prefs.session_duration_minutes} minut`;
  }

  prompt += `

ZADANIE:
Stwórz progresywny plan treningowy na kolejny cykl. Plan powinien:
- Zachować główną strukturę i system treningowy z poprzedniego cyklu
- Wprowadzić progresję (zwiększenie ciężarów, objętości lub intensywności)
- Uwzględnić możliwe warianty ćwiczeń dla urozmaicenia
- Być bezpieczny i dostosowany do dalszego rozwoju`;

  if (notes && notes.trim().length > 0) {
    prompt += `

DODATKOWE UWAGI I FEEDBACK OD UŻYTKOWNIKA:
${notes}`;
  }

  return prompt;
}

/**
 * Validates and sanitizes user input to prevent prompt injection
 * @param input - User-provided text (notes, etc.)
 * @returns Sanitized string safe for AI prompts
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove excessive whitespace
  let sanitized = input.trim().replace(/\s+/g, " ");

  // Limit length to prevent token overflow
  const MAX_LENGTH = 500;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  // Remove potential prompt injection patterns (basic protection)
  // This is not comprehensive but adds a layer of defense
  const dangerousPatterns = [
    /ignore\s+previous\s+instructions/gi,
    /forget\s+everything/gi,
    /you\s+are\s+now/gi,
    /new\s+instructions:/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /user\s*:/gi,
  ];

  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized;
}
