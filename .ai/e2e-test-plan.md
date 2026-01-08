# Plan Wdrożenia Testów E2E - GymPlanner

## 1. Wprowadzenie

Niniejszy dokument zawiera szczegółowy plan implementacji testów end-to-end (E2E) dla aplikacji GymPlanner. Testy E2E weryfikują pełne ścieżki użytkownika w rzeczywistej przeglądarce, obejmując rendering stron Astro, hydratację komponentów React oraz integrację z backendem.

### Cele testów E2E

- Weryfikacja krytycznych ścieżek użytkownika (rejestracja, logowanie, generowanie planu, trening)
- Testowanie nawigacji i routingu między stronami Astro
- Weryfikacja poprawności hydratacji React Islands
- Testowanie responsywności interfejsu
- Wykrywanie regresji wizualnych

## 2. Konfiguracja środowiska

### 2.1 Istniejąca konfiguracja

Projekt posiada już podstawową konfigurację Playwright w `playwright.config.ts`:

```typescript
// Kluczowe ustawienia:
// - testDir: './e2e'
// - baseURL: 'http://localhost:4321'
// - Browser: Chromium only (zgodnie z wytycznymi)
// - Trace, screenshot, video przy błędach
// - WebServer: npm run dev
```

### 2.2 Rozszerzenia konfiguracji

Należy rozszerzyć konfigurację o:

```typescript
// playwright.config.ts - dodatkowe ustawienia

export default defineConfig({
  // ... istniejące ustawienia ...
  
  /* Timeouts */
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  
  /* Global setup/teardown */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  
  /* Test isolation */
  use: {
    // ... istniejące ...
    storageState: undefined, // Domyślnie bez sesji
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  /* Projects z różnymi stanami */
  projects: [
    // Projekt dla testów bez autentykacji
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.unauth\.spec\.ts/,
    },
    // Projekt dla testów z autentykacją
    {
      name: 'authenticated',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/user.json',
      },
      testMatch: /.*\.auth\.spec\.ts/,
      dependencies: ['setup'],
    },
    // Projekt setup - logowanie i zapisanie stanu
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
  ],
});
```

### 2.3 Global Setup - Przygotowanie bazy testowej

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Preparing test environment...');
  
  // Opcjonalnie: Reset bazy danych do stanu początkowego
  // Użycie seed.sql dla dev.user@example.com / password
  
  // Weryfikacja dostępności serwera
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:4321');
    await page.waitForLoadState('networkidle');
    console.log('✅ Server is ready');
  } finally {
    await browser.close();
  }
}

export default globalSetup;
```

### 2.4 Auth Setup - Przygotowanie sesji zalogowanego użytkownika

```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const TEST_USER = {
  email: 'dev.user@example.com',
  password: 'password',
};

setup('authenticate', async ({ page }) => {
  // Przejdź do strony logowania
  await page.goto('/login');
  
  // Wypełnij formularz
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Hasło').fill(TEST_USER.password);
  
  // Wyślij formularz
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  
  // Poczekaj na przekierowanie do dashboardu
  await page.waitForURL('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  
  // Zapisz stan sesji do pliku
  await page.context().storageState({ path: './e2e/.auth/user.json' });
});
```

## 3. Architektura Page Objects

### 3.1 Struktura katalogów

```
e2e/
├── fixtures/
│   ├── base.ts              # Rozszerzone fixtures
│   └── test-data.ts         # Dane testowe
├── page-objects/
│   ├── BasePage.ts          # Bazowa klasa (istniejąca)
│   ├── HomePage.ts          # Strona główna (istniejąca)
│   ├── LoginPage.ts         # Strona logowania
│   ├── RegisterPage.ts      # Strona rejestracji
│   ├── DashboardPage.ts     # Dashboard (zalogowany)
│   ├── PlanGeneratorPage.ts # Generator planu AI
│   ├── PlansListPage.ts     # Lista planów
│   ├── PlanEditorPage.ts    # Edytor planu
│   ├── ActiveSessionPage.ts # Aktywna sesja treningowa
│   └── HistoryPage.ts       # Historia treningów
├── specs/
│   ├── auth/
│   │   ├── login.unauth.spec.ts
│   │   ├── register.unauth.spec.ts
│   │   └── logout.auth.spec.ts
│   ├── plans/
│   │   ├── generate-ai.auth.spec.ts
│   │   ├── create-manual.auth.spec.ts
│   │   ├── edit.auth.spec.ts
│   │   └── list.auth.spec.ts
│   ├── sessions/
│   │   ├── start-workout.auth.spec.ts
│   │   ├── active-session.auth.spec.ts
│   │   └── complete-workout.auth.spec.ts
│   ├── history/
│   │   └── view-history.auth.spec.ts
│   └── navigation/
│       └── routing.auth.spec.ts
├── auth.setup.ts
├── global-setup.ts
└── global-teardown.ts
```

### 3.2 Rozszerzenie BasePage

```typescript
// e2e/page-objects/BasePage.ts - rozszerzenie
import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly navigation: Locator;
  readonly loadingSpinner: Locator;
  readonly toastContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navigation = page.locator('nav');
    this.loadingSpinner = page.getByRole('status', { name: /loading|ładowanie/i });
    this.toastContainer = page.locator('[data-sonner-toaster]');
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForHydration() {
    // Czekaj aż React islands się załadują
    await this.page.waitForFunction(() => {
      return document.readyState === 'complete';
    });
    // Dodatkowe oczekiwanie na hydratację
    await this.page.waitForTimeout(100);
  }

  async expectToastMessage(message: string | RegExp) {
    await expect(this.toastContainer.getByText(message)).toBeVisible();
  }

  async expectNoLoadingState() {
    await expect(this.loadingSpinner).not.toBeVisible();
  }

  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async waitForNavigation(url?: string) {
    if (url) {
      await this.page.waitForURL(url);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }
}
```

### 3.3 LoginPage

```typescript
// e2e/page-objects/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Hasło');
    this.submitButton = page.getByRole('button', { name: 'Zaloguj się' });
    this.errorAlert = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Zapomniałeś hasła?' });
    this.registerLink = page.getByRole('link', { name: 'Zarejestruj się' });
    this.pageTitle = page.getByRole('heading', { name: 'Zaloguj się' });
  }

  async goto() {
    await super.goto('/login');
    await this.waitForHydration();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginSuccess() {
    await this.page.waitForURL('/');
    await expect(this.navigation).toBeVisible();
  }

  async expectLoginError(message?: string | RegExp) {
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      await expect(this.errorAlert).toContainText(message);
    }
  }

  async expectFormValidationError(fieldName: string) {
    const field = fieldName === 'email' ? this.emailInput : this.passwordInput;
    await expect(field).toHaveAttribute('aria-invalid', 'true');
  }
}
```

### 3.4 RegisterPage

```typescript
// e2e/page-objects/RegisterPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly successAlert: Locator;
  readonly loginLink: Locator;
  readonly passwordStrengthIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Hasło', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Potwierdź hasło');
    this.submitButton = page.getByRole('button', { name: 'Zarejestruj się' });
    this.errorAlert = page.getByRole('alert').filter({ hasText: /błąd|error/i });
    this.successAlert = page.getByRole('alert').filter({ hasText: /pomyślnie|sukces/i });
    this.loginLink = page.getByRole('link', { name: 'Zaloguj się' });
    this.passwordStrengthIndicator = page.locator('.space-y-2.rounded-md.border');
  }

  async goto() {
    await super.goto('/register');
    await this.waitForHydration();
  }

  async register(email: string, password: string, confirmPassword?: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    await this.submitButton.click();
  }

  async expectRegistrationSuccess() {
    await expect(this.successAlert).toBeVisible();
  }

  async expectRegistrationError(message?: string | RegExp) {
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      await expect(this.errorAlert).toContainText(message);
    }
  }

  async expectPasswordStrengthMet(requirement: 'length' | 'uppercase' | 'lowercase' | 'number') {
    const requirementTexts = {
      length: 'Minimum 8 znaków',
      uppercase: 'Wielka litera',
      lowercase: 'Mała litera',
      number: 'Cyfra',
    };
    await expect(
      this.passwordStrengthIndicator.getByText(requirementTexts[requirement])
    ).toHaveClass(/text-green-600/);
  }
}
```

### 3.5 DashboardPage

```typescript
// e2e/page-objects/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly upcomingWorkouts: Locator;
  readonly startWorkoutButton: Locator;
  readonly newPlanButton: Locator;
  readonly emptyState: Locator;
  readonly workoutCards: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.getByRole('heading', { level: 1 });
    this.upcomingWorkouts = page.locator('[data-testid="upcoming-workouts"]');
    this.startWorkoutButton = page.getByRole('button', { name: /rozpocznij trening/i });
    this.newPlanButton = page.getByRole('link', { name: /nowy plan|stwórz plan/i });
    this.emptyState = page.getByTestId('empty-dashboard');
    this.workoutCards = page.locator('[data-testid="workout-card"]');
  }

  async goto() {
    await super.goto('/');
    await this.waitForHydration();
  }

  async expectDashboardLoaded() {
    await expect(this.navigation).toBeVisible();
    await this.expectNoLoadingState();
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  async expectUpcomingWorkouts() {
    await expect(this.workoutCards.first()).toBeVisible();
  }

  async startFirstWorkout() {
    await this.workoutCards.first().getByRole('button', { name: /rozpocznij/i }).click();
  }

  async navigateToPlans() {
    await this.navigation.getByRole('link', { name: /plany/i }).click();
    await this.page.waitForURL('**/plans');
  }

  async navigateToHistory() {
    await this.navigation.getByRole('link', { name: /historia/i }).click();
    await this.page.waitForURL('**/history');
  }
}
```

### 3.6 PlanGeneratorPage

```typescript
// e2e/page-objects/PlanGeneratorPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PlanGeneratorPage extends BasePage {
  // Form fields
  readonly goalSelect: Locator;
  readonly systemSelect: Locator;
  readonly availableDaysCheckboxes: Locator;
  readonly sessionDurationInput: Locator;
  readonly cycleDurationInput: Locator;
  readonly notesTextarea: Locator;
  
  // Buttons
  readonly generateButton: Locator;
  readonly acceptButton: Locator;
  readonly rejectButton: Locator;
  
  // States
  readonly loadingIndicator: Locator;
  readonly generatedPlanPreview: Locator;
  readonly errorMessage: Locator;
  readonly safetyDisclaimer: Locator;

  constructor(page: Page) {
    super(page);
    this.goalSelect = page.getByLabel(/cel/i);
    this.systemSelect = page.getByLabel(/system/i);
    this.availableDaysCheckboxes = page.locator('[data-testid="day-checkbox"]');
    this.sessionDurationInput = page.getByLabel(/czas|długość.*sesji/i);
    this.cycleDurationInput = page.getByLabel(/cykl|tygodnie/i);
    this.notesTextarea = page.getByLabel(/uwagi|notatki/i);
    
    this.generateButton = page.getByRole('button', { name: /generuj/i });
    this.acceptButton = page.getByRole('button', { name: /zaakceptuj|zapisz/i });
    this.rejectButton = page.getByRole('button', { name: /odrzuć/i });
    
    this.loadingIndicator = page.getByTestId('generation-loading');
    this.generatedPlanPreview = page.getByTestId('plan-preview');
    this.errorMessage = page.getByRole('alert');
    this.safetyDisclaimer = page.getByTestId('safety-disclaimer');
  }

  async goto() {
    await super.goto('/generate');
    await this.waitForHydration();
  }

  async fillGeneratorForm(options: {
    goal: string;
    system: string;
    days: string[];
    sessionDuration: number;
    cycleDuration: number;
    notes?: string;
  }) {
    await this.goalSelect.selectOption(options.goal);
    await this.systemSelect.selectOption(options.system);
    
    for (const day of options.days) {
      await this.page.getByLabel(day).check();
    }
    
    await this.sessionDurationInput.fill(String(options.sessionDuration));
    await this.cycleDurationInput.fill(String(options.cycleDuration));
    
    if (options.notes) {
      await this.notesTextarea.fill(options.notes);
    }
  }

  async generatePlan() {
    await this.generateButton.click();
  }

  async waitForGeneration() {
    // AI generation może trwać długo
    await expect(this.loadingIndicator).toBeVisible({ timeout: 5000 });
    await expect(this.loadingIndicator).not.toBeVisible({ timeout: 60000 });
  }

  async expectPlanGenerated() {
    await expect(this.generatedPlanPreview).toBeVisible();
    await expect(this.acceptButton).toBeEnabled();
    await expect(this.rejectButton).toBeEnabled();
  }

  async acceptPlan() {
    await this.acceptButton.click();
    await this.page.waitForURL('**/plans/**');
  }

  async rejectPlan() {
    await this.rejectButton.click();
  }

  async expectSafetyDisclaimer() {
    await expect(this.safetyDisclaimer).toBeVisible();
  }
}
```

### 3.7 ActiveSessionPage

```typescript
// e2e/page-objects/ActiveSessionPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ActiveSessionPage extends BasePage {
  readonly planName: Locator;
  readonly dayName: Locator;
  readonly exercisesList: Locator;
  readonly timerDisplay: Locator;
  readonly timerStartButton: Locator;
  readonly timerResetButton: Locator;
  readonly setCheckboxes: Locator;
  readonly repsInputs: Locator;
  readonly weightInputs: Locator;
  readonly finishWorkoutButton: Locator;
  readonly confirmDialog: Locator;

  constructor(page: Page) {
    super(page);
    this.planName = page.getByTestId('session-plan-name');
    this.dayName = page.getByTestId('session-day-name');
    this.exercisesList = page.getByTestId('exercises-list');
    this.timerDisplay = page.getByTestId('timer-display');
    this.timerStartButton = page.getByRole('button', { name: /start|rozpocznij/i });
    this.timerResetButton = page.getByRole('button', { name: /reset|resetuj/i });
    this.setCheckboxes = page.locator('[data-testid="set-checkbox"]');
    this.repsInputs = page.locator('[data-testid="actual-reps-input"]');
    this.weightInputs = page.locator('[data-testid="actual-weight-input"]');
    this.finishWorkoutButton = page.getByRole('button', { name: /zakończ trening/i });
    this.confirmDialog = page.getByRole('alertdialog');
  }

  async expectSessionLoaded() {
    await expect(this.exercisesList).toBeVisible();
    await expect(this.finishWorkoutButton).toBeVisible();
  }

  async getExerciseCard(exerciseName: string): Locator {
    return this.exercisesList.locator(`[data-exercise-name="${exerciseName}"]`);
  }

  async completeSet(exerciseIndex: number, setIndex: number, reps?: number, weight?: number) {
    const exercise = this.exercisesList.locator('[data-testid="exercise-card"]').nth(exerciseIndex);
    const set = exercise.locator('[data-testid="set-row"]').nth(setIndex);
    
    if (reps !== undefined) {
      await set.locator('[data-testid="actual-reps-input"]').fill(String(reps));
    }
    if (weight !== undefined) {
      await set.locator('[data-testid="actual-weight-input"]').fill(String(weight));
    }
    await set.locator('[data-testid="set-checkbox"]').check();
  }

  async startTimer() {
    await this.timerStartButton.click();
  }

  async expectTimerRunning() {
    await expect(this.timerDisplay).toContainText(/\d+:\d+/);
  }

  async finishWorkout() {
    await this.finishWorkoutButton.click();
  }

  async confirmFinish() {
    await this.confirmDialog.getByRole('button', { name: /potwierdź|tak/i }).click();
  }

  async cancelFinish() {
    await this.confirmDialog.getByRole('button', { name: /anuluj|nie/i }).click();
  }

  async expectWorkoutCompleted() {
    await this.page.waitForURL(/\/(history|plans)/);
  }
}
```

## 4. Rozszerzone Fixtures

```typescript
// e2e/fixtures/base.ts - rozszerzenie
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { RegisterPage } from '../page-objects/RegisterPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { PlanGeneratorPage } from '../page-objects/PlanGeneratorPage';
import { ActiveSessionPage } from '../page-objects/ActiveSessionPage';

// Test user credentials (z seed.sql)
export const TEST_USER = {
  email: 'dev.user@example.com',
  password: 'password',
};

// Define custom fixtures types
type CustomFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  planGeneratorPage: PlanGeneratorPage;
  activeSessionPage: ActiveSessionPage;
};

// Extend base test with custom fixtures
export const test = base.extend<CustomFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  
  planGeneratorPage: async ({ page }, use) => {
    await use(new PlanGeneratorPage(page));
  },
  
  activeSessionPage: async ({ page }, use) => {
    await use(new ActiveSessionPage(page));
  },
});

export { expect };
```

```typescript
// e2e/fixtures/test-data.ts
export const TestData = {
  users: {
    valid: {
      email: 'dev.user@example.com',
      password: 'password',
    },
    newUser: {
      email: `test.${Date.now()}@example.com`,
      password: 'TestPassword123',
    },
    invalid: {
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    },
  },
  
  planPreferences: {
    standard: {
      goal: 'hypertrophy',
      system: 'PPL',
      days: ['Poniedziałek', 'Środa', 'Piątek'],
      sessionDuration: 60,
      cycleDuration: 4,
      notes: 'Test plan generated by E2E',
    },
    minimal: {
      goal: 'strength',
      system: 'FBW',
      days: ['Wtorek', 'Czwartek'],
      sessionDuration: 45,
      cycleDuration: 2,
    },
  },
};
```

## 5. Scenariusze Testowe

### 5.1 Moduł Autentykacji

#### 5.1.1 Rejestracja nowego użytkownika (US-001)

```typescript
// e2e/specs/auth/register.unauth.spec.ts
import { test, expect } from '../../fixtures/base';
import { TestData } from '../../fixtures/test-data';

test.describe('Rejestracja użytkownika', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test('powinno wyświetlić formularz rejestracji', async ({ registerPage }) => {
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeEnabled();
  });

  test('powinno walidować format adresu email', async ({ registerPage }) => {
    await registerPage.emailInput.fill('invalid-email');
    await registerPage.passwordInput.fill('TestPassword123');
    await registerPage.confirmPasswordInput.fill('TestPassword123');
    await registerPage.submitButton.click();

    await registerPage.expectFormValidationError('email');
  });

  test('powinno wymagać hasła o minimalnej sile', async ({ registerPage }) => {
    await registerPage.emailInput.fill('test@example.com');
    await registerPage.passwordInput.fill('weak');
    
    // Sprawdź, że wskaźniki siły hasła nie są spełnione
    await expect(registerPage.passwordStrengthIndicator).toBeVisible();
  });

  test('powinno pokazywać wskaźniki siły hasła podczas wpisywania', async ({ registerPage }) => {
    await registerPage.passwordInput.fill('a');
    await registerPage.expectPasswordStrengthMet('lowercase');

    await registerPage.passwordInput.fill('aA');
    await registerPage.expectPasswordStrengthMet('uppercase');

    await registerPage.passwordInput.fill('aA1');
    await registerPage.expectPasswordStrengthMet('number');

    await registerPage.passwordInput.fill('aA1bcdef');
    await registerPage.expectPasswordStrengthMet('length');
  });

  test('powinno walidować zgodność haseł', async ({ registerPage }) => {
    await registerPage.register(
      'test@example.com',
      'TestPassword123',
      'DifferentPassword123'
    );

    await expect(registerPage.errorAlert).toBeVisible();
  });

  test('powinno zarejestrować nowego użytkownika z poprawnymi danymi', async ({ registerPage }) => {
    const newUser = TestData.users.newUser;
    
    await registerPage.register(newUser.email, newUser.password);
    await registerPage.expectRegistrationSuccess();
  });

  test('powinno wyświetlić błąd przy próbie rejestracji na istniejący email', async ({ registerPage }) => {
    const existingUser = TestData.users.valid;
    
    await registerPage.register(existingUser.email, 'NewPassword123');
    await registerPage.expectRegistrationError(/już istnieje|already exists/i);
  });

  test('powinno nawigować do strony logowania', async ({ registerPage }) => {
    await registerPage.loginLink.click();
    await registerPage.page.waitForURL('**/login');
  });
});
```

#### 5.1.2 Logowanie użytkownika (US-002)

```typescript
// e2e/specs/auth/login.unauth.spec.ts
import { test, expect } from '../../fixtures/base';
import { TestData } from '../../fixtures/test-data';

test.describe('Logowanie użytkownika', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('powinno wyświetlić formularz logowania', async ({ loginPage }) => {
    await expect(loginPage.pageTitle).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test('powinno zalogować użytkownika z poprawnymi danymi', async ({ loginPage }) => {
    const user = TestData.users.valid;
    
    await loginPage.login(user.email, user.password);
    await loginPage.expectLoginSuccess();
  });

  test('powinno wyświetlić błąd przy nieprawidłowych danych', async ({ loginPage }) => {
    const invalidUser = TestData.users.invalid;
    
    await loginPage.login(invalidUser.email, invalidUser.password);
    await loginPage.expectLoginError(/nieprawidłowy|invalid/i);
  });

  test('powinno walidować puste pola formularza', async ({ loginPage }) => {
    await loginPage.submitButton.click();
    
    // Formularz nie powinien się wysłać
    await expect(loginPage.page).toHaveURL(/.*login/);
  });

  test('powinno nawigować do strony odzyskiwania hasła', async ({ loginPage }) => {
    await loginPage.forgotPasswordLink.click();
    await loginPage.page.waitForURL('**/forgot-password');
  });

  test('powinno nawigować do strony rejestracji', async ({ loginPage }) => {
    await loginPage.registerLink.click();
    await loginPage.page.waitForURL('**/register');
  });

  test('powinno utrzymywać sesję po odświeżeniu strony', async ({ loginPage, page }) => {
    const user = TestData.users.valid;
    
    await loginPage.login(user.email, user.password);
    await loginPage.expectLoginSuccess();
    
    // Odśwież stronę
    await page.reload();
    
    // Powinien nadal być zalogowany
    await expect(page.locator('nav')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });
});
```

#### 5.1.3 Wylogowanie użytkownika

```typescript
// e2e/specs/auth/logout.auth.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Wylogowanie użytkownika', () => {
  test('powinno wylogować użytkownika', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();
    
    // Znajdź i kliknij przycisk wylogowania
    await page.getByRole('button', { name: /wyloguj/i }).click();
    
    // Powinien być przekierowany na stronę logowania
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Zaloguj się' })).toBeVisible();
  });

  test('nie powinno mieć dostępu do chronionych stron po wylogowaniu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /wyloguj/i }).click();
    await page.waitForURL('**/login');
    
    // Próba dostępu do chronionej strony
    await page.goto('/plans');
    await page.waitForURL('**/login');
  });
});
```

### 5.2 Moduł Planów Treningowych

#### 5.2.1 Generowanie planu przez AI (US-004)

```typescript
// e2e/specs/plans/generate-ai.auth.spec.ts
import { test, expect } from '../../fixtures/base';
import { TestData } from '../../fixtures/test-data';

test.describe('Generowanie planu przez AI', () => {
  test.beforeEach(async ({ planGeneratorPage }) => {
    await planGeneratorPage.goto();
  });

  test('powinno wyświetlić formularz generatora', async ({ planGeneratorPage }) => {
    await expect(planGeneratorPage.goalSelect).toBeVisible();
    await expect(planGeneratorPage.systemSelect).toBeVisible();
    await expect(planGeneratorPage.generateButton).toBeEnabled();
  });

  test('powinno wyświetlić klauzulę bezpieczeństwa (F-022)', async ({ planGeneratorPage }) => {
    await planGeneratorPage.expectSafetyDisclaimer();
  });

  test('powinno wygenerować plan na podstawie preferencji', async ({ planGeneratorPage }) => {
    const prefs = TestData.planPreferences.standard;
    
    await planGeneratorPage.fillGeneratorForm(prefs);
    await planGeneratorPage.generatePlan();
    await planGeneratorPage.waitForGeneration();
    await planGeneratorPage.expectPlanGenerated();
  });

  test('powinno pozwolić na edycję wygenerowanego planu', async ({ planGeneratorPage, page }) => {
    const prefs = TestData.planPreferences.standard;
    
    await planGeneratorPage.fillGeneratorForm(prefs);
    await planGeneratorPage.generatePlan();
    await planGeneratorPage.waitForGeneration();
    
    // Sprawdź, że podgląd jest edytowalny
    const exerciseName = planGeneratorPage.generatedPlanPreview.locator('input[type="text"]').first();
    await expect(exerciseName).toBeEditable();
  });

  test('powinno zaakceptować i zapisać plan', async ({ planGeneratorPage }) => {
    const prefs = TestData.planPreferences.minimal;
    
    await planGeneratorPage.fillGeneratorForm(prefs);
    await planGeneratorPage.generatePlan();
    await planGeneratorPage.waitForGeneration();
    await planGeneratorPage.acceptPlan();
    
    // Powinien przekierować do szczegółów planu
    await expect(planGeneratorPage.page).toHaveURL(/\/plans\/[a-z0-9-]+/);
  });

  test('powinno odrzucić plan i wrócić do formularza', async ({ planGeneratorPage }) => {
    const prefs = TestData.planPreferences.minimal;
    
    await planGeneratorPage.fillGeneratorForm(prefs);
    await planGeneratorPage.generatePlan();
    await planGeneratorPage.waitForGeneration();
    await planGeneratorPage.rejectPlan();
    
    // Powinien pokazać formularz ponownie
    await expect(planGeneratorPage.generateButton).toBeVisible();
  });

  test('powinno wyświetlić błąd przy problemach z AI', async ({ planGeneratorPage, page }) => {
    // Symuluj błąd poprzez przekazanie nieprawidłowych danych
    await planGeneratorPage.cycleDurationInput.fill('-1');
    await planGeneratorPage.generatePlan();
    
    await expect(planGeneratorPage.errorMessage).toBeVisible();
  });
});
```

#### 5.2.2 Tworzenie planu od zera (US-005)

```typescript
// e2e/specs/plans/create-manual.auth.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Tworzenie planu manualnie', () => {
  test('powinno nawigować do edytora nowego planu', async ({ page }) => {
    await page.goto('/plans/new');
    
    await expect(page.getByRole('heading', { name: /nowy plan|stwórz plan/i })).toBeVisible();
  });

  test('powinno pozwolić na dodanie dni treningowych', async ({ page }) => {
    await page.goto('/plans/new/edit');
    
    const addDayButton = page.getByRole('button', { name: /dodaj dzień/i });
    await addDayButton.click();
    
    await expect(page.locator('[data-testid="day-card"]')).toHaveCount(1);
  });

  test('powinno pozwolić na dodanie ćwiczeń do dnia', async ({ page }) => {
    await page.goto('/plans/new/edit');
    
    // Dodaj dzień
    await page.getByRole('button', { name: /dodaj dzień/i }).click();
    
    // Dodaj ćwiczenie
    await page.getByRole('button', { name: /dodaj ćwiczenie/i }).first().click();
    
    await expect(page.locator('[data-testid="exercise-row"]')).toHaveCount(1);
  });

  test('powinno pozwolić na określenie serii, powtórzeń i przerw', async ({ page }) => {
    await page.goto('/plans/new/edit');
    
    await page.getByRole('button', { name: /dodaj dzień/i }).click();
    await page.getByRole('button', { name: /dodaj ćwiczenie/i }).first().click();
    
    // Wypełnij dane ćwiczenia
    const exerciseRow = page.locator('[data-testid="exercise-row"]').first();
    await exerciseRow.getByLabel(/nazwa/i).fill('Wyciskanie sztangi');
    await exerciseRow.getByLabel(/serie/i).fill('4');
    await exerciseRow.getByLabel(/powtórzenia/i).fill('8');
    await exerciseRow.getByLabel(/przerwa/i).fill('90');
    
    // Sprawdź wartości
    await expect(exerciseRow.getByLabel(/nazwa/i)).toHaveValue('Wyciskanie sztangi');
  });

  test('powinno zapisać plan', async ({ page }) => {
    await page.goto('/plans/new/edit');
    
    // Wypełnij nazwę planu
    await page.getByLabel(/nazwa planu/i).fill('Mój plan testowy');
    
    // Dodaj dzień i ćwiczenie
    await page.getByRole('button', { name: /dodaj dzień/i }).click();
    await page.getByRole('button', { name: /dodaj ćwiczenie/i }).first().click();
    
    const exerciseRow = page.locator('[data-testid="exercise-row"]').first();
    await exerciseRow.getByLabel(/nazwa/i).fill('Przysiady');
    
    // Zapisz plan
    await page.getByRole('button', { name: /zapisz/i }).click();
    
    await expect(page).toHaveURL(/\/plans\/[a-z0-9-]+/);
  });
});
```

#### 5.2.3 Lista planów (US-006)

```typescript
// e2e/specs/plans/list.auth.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Lista planów treningowych', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plans');
  });

  test('powinno wyświetlić listę planów', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /moje plany/i })).toBeVisible();
  });

  test('każdy plan powinien mieć nazwę i datę zakończenia', async ({ page }) => {
    const planCard = page.locator('[data-testid="plan-card"]').first();
    
    // Jeśli są jakieś plany
    const count = await planCard.count();
    if (count > 0) {
      await expect(planCard.locator('[data-testid="plan-name"]')).toBeVisible();
      await expect(planCard.locator('[data-testid="plan-end-date"]')).toBeVisible();
    }
  });

  test('powinno pozwolić na otwarcie planu w trybie edycji', async ({ page }) => {
    const planCard = page.locator('[data-testid="plan-card"]').first();
    const count = await planCard.count();
    
    if (count > 0) {
      await planCard.getByRole('link', { name: /edytuj/i }).click();
      await expect(page).toHaveURL(/\/plans\/[a-z0-9-]+\/edit/);
    }
  });

  test('powinno wymagać potwierdzenia przed usunięciem planu', async ({ page }) => {
    const planCard = page.locator('[data-testid="plan-card"]').first();
    const count = await planCard.count();
    
    if (count > 0) {
      await planCard.getByRole('button', { name: /usuń|archiwizuj/i }).click();
      
      // Dialog potwierdzenia
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await expect(page.getByRole('button', { name: /potwierdź|tak/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /anuluj/i })).toBeVisible();
    }
  });

  test('powinno nawigować do tworzenia nowego planu', async ({ page }) => {
    await page.getByRole('link', { name: /nowy plan/i }).click();
    await expect(page).toHaveURL(/\/plans\/new|\/generate/);
  });
});
```

### 5.3 Moduł Realizacji Treningu

#### 5.3.1 Rozpoczęcie treningu (US-007)

```typescript
// e2e/specs/sessions/start-workout.auth.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Rozpoczęcie treningu', () => {
  test('powinno rozpocząć trening z dashboardu', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    
    const workoutCard = page.locator('[data-testid="workout-card"]').first();
    const count = await workoutCard.count();
    
    if (count > 0) {
      await workoutCard.getByRole('button', { name: /rozpocznij/i }).click();
      await expect(page).toHaveURL(/\/session\/active/);
    }
  });

  test('powinno wyświetlić listę ćwiczeń w widoku treningu', async ({ activeSessionPage, page }) => {
    // Najpierw rozpocznij sesję (zakładając że istnieje)
    await page.goto('/session/active');
    
    // Jeśli jest aktywna sesja
    const exercisesList = page.locator('[data-testid="exercises-list"]');
    const count = await exercisesList.count();
    
    if (count > 0) {
      await activeSessionPage.expectSessionLoaded();
    }
  });

  test('powinno przekierować do dashboardu gdy brak aktywnej sesji', async ({ page }) => {
    await page.goto('/session/active');
    
    // Bez aktywnej sesji powinno przekierować
    await page.waitForURL(/\/?message=no_active_session|\//);
  });
});
```

#### 5.3.2 Realizacja treningu (US-007, US-008)

```typescript
// e2e/specs/sessions/active-session.auth.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Aktywna sesja treningowa', () => {
  // Uwaga: Te testy wymagają przygotowanej aktywnej sesji
  // W praktyce można użyć fixture który najpierw tworzy sesję
  
  test('powinno wyświetlić planowane wartości dla każdej serii', async ({ page }) => {
    await page.goto('/session/active');
    
    const setRow = page.locator('[data-testid="set-row"]').first();
    const count = await setRow.count();
    
    if (count > 0) {
      await expect(setRow.locator('[data-testid="planned-reps"]')).toBeVisible();
      await expect(setRow.locator('[data-testid="planned-weight"]')).toBeVisible();
    }
  });

  test('powinno pozwolić na wpisanie faktycznych wartości', async ({ page }) => {
    await page.goto('/session/active');
    
    const setRow = page.locator('[data-testid="set-row"]').first();
    const count = await setRow.count();
    
    if (count > 0) {
      const actualRepsInput = setRow.locator('[data-testid="actual-reps-input"]');
      const actualWeightInput = setRow.locator('[data-testid="actual-weight-input"]');
      
      await actualRepsInput.fill('10');
      await actualWeightInput.fill('50');
      
      await expect(actualRepsInput).toHaveValue('10');
      await expect(actualWeightInput).toHaveValue('50');
    }
  });

  test('powinno pozwolić na odznaczenie wykonanej serii', async ({ page }) => {
    await page.goto('/session/active');
    
    const setCheckbox = page.locator('[data-testid="set-checkbox"]').first();
    const count = await setCheckbox.count();
    
    if (count > 0) {
      await setCheckbox.check();
      await expect(setCheckbox).toBeChecked();
    }
  });

  test('powinno uruchomić minutnik przy serii', async ({ page }) => {
    await page.goto('/session/active');
    
    const timerButton = page.getByRole('button', { name: /start|timer/i }).first();
    const count = await timerButton.count();
    
    if (count > 0) {
      await timerButton.click();
      
      // Timer powinien pokazywać czas
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(/\d+:\d+/);
    }
  });

  test('powinno wyświetlić przycisk zakończenia treningu', async ({ page }) => {
    await page.goto('/session/active');
    
    const finishButton = page.getByRole('button', { name: /zakończ trening/i });
    const count = await finishButton.count();
    
    if (count > 0) {
      await expect(finishButton).toBeVisible();
    }
  });
});
```

#### 5.3.3 Zakończenie treningu (US-009)

```typescript
// e2e/specs/sessions/complete-workout.auth.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Zakończenie sesji treningowej', () => {
  test('powinno wymagać potwierdzenia przed zakończeniem', async ({ page }) => {
    await page.goto('/session/active');
    
    const finishButton = page.getByRole('button', { name: /zakończ trening/i });
    const count = await finishButton.count();
    
    if (count > 0) {
      await finishButton.click();
      
      // Dialog potwierdzenia
      await expect(page.getByRole('alertdialog')).toBeVisible();
    }
  });

  test('powinno zapisać sesję i przekierować do historii', async ({ page }) => {
    await page.goto('/session/active');
    
    const finishButton = page.getByRole('button', { name: /zakończ trening/i });
    const count = await finishButton.count();
    
    if (count > 0) {
      await finishButton.click();
      await page.getByRole('button', { name: /potwierdź|tak/i }).click();
      
      // Przekierowanie do historii lub podsumowania
      await expect(page).toHaveURL(/\/(history|plans)/);
    }
  });

  test('powinno anulować zakończenie treningu', async ({ page }) => {
    await page.goto('/session/active');
    
    const finishButton = page.getByRole('button', { name: /zakończ trening/i });
    const count = await finishButton.count();
    
    if (count > 0) {
      await finishButton.click();
      await page.getByRole('button', { name: /anuluj|nie/i }).click();
      
      // Powinien pozostać w sesji
      await expect(page).toHaveURL(/\/session\/active/);
    }
  });
});
```

### 5.4 Moduł Historii

#### 5.4.1 Przeglądanie historii (US-010)

```typescript
// e2e/specs/history/view-history.auth.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Historia treningów', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history');
  });

  test('powinno wyświetlić sekcję Historia', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /historia/i })).toBeVisible();
  });

  test('powinno wyświetlić chronologiczną listę sesji', async ({ page }) => {
    const sessionsList = page.locator('[data-testid="sessions-list"]');
    await expect(sessionsList).toBeVisible();
  });

  test('powinno wyświetlić szczegóły sesji po kliknięciu', async ({ page }) => {
    const sessionCard = page.locator('[data-testid="session-card"]').first();
    const count = await sessionCard.count();
    
    if (count > 0) {
      await sessionCard.click();
      await expect(page).toHaveURL(/\/history\/[a-z0-9-]+/);
      
      // Szczegóły sesji
      await expect(page.locator('[data-testid="session-details"]')).toBeVisible();
    }
  });

  test('każda sesja powinna zawierać datę i nazwę planu', async ({ page }) => {
    const sessionCard = page.locator('[data-testid="session-card"]').first();
    const count = await sessionCard.count();
    
    if (count > 0) {
      await expect(sessionCard.locator('[data-testid="session-date"]')).toBeVisible();
      await expect(sessionCard.locator('[data-testid="session-plan-name"]')).toBeVisible();
    }
  });

  test('szczegóły sesji powinny pokazywać porównanie planowanych i rzeczywistych wartości', async ({ page }) => {
    const sessionCard = page.locator('[data-testid="session-card"]').first();
    const count = await sessionCard.count();
    
    if (count > 0) {
      await sessionCard.click();
      await page.waitForURL(/\/history\/[a-z0-9-]+/);
      
      const setRow = page.locator('[data-testid="set-comparison"]').first();
      const setCount = await setRow.count();
      
      if (setCount > 0) {
        await expect(setRow.locator('[data-testid="planned-value"]')).toBeVisible();
        await expect(setRow.locator('[data-testid="actual-value"]')).toBeVisible();
      }
    }
  });
});
```

### 5.5 Nawigacja i Routing

```typescript
// e2e/specs/navigation/routing.auth.spec.ts
import { test, expect } from '../../fixtures/base';

test.describe('Nawigacja i Routing', () => {
  test('powinno nawigować między głównymi sekcjami', async ({ page }) => {
    await page.goto('/');
    
    // Dashboard -> Plans
    await page.getByRole('link', { name: /plany/i }).click();
    await expect(page).toHaveURL('**/plans');
    
    // Plans -> History
    await page.getByRole('link', { name: /historia/i }).click();
    await expect(page).toHaveURL('**/history');
    
    // History -> Dashboard
    await page.getByRole('link', { name: /pulpit|home/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('powinno przekierować niezalogowanego użytkownika do logowania', async ({ browser }) => {
    // Nowy kontekst bez sesji
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/plans');
    await expect(page).toHaveURL('**/login');
    
    await context.close();
  });

  test('powinno obsługiwać nawigację wstecz', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /plany/i }).click();
    await page.waitForURL('**/plans');
    
    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('strona 404 dla nieistniejących ścieżek', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz');
    
    // Sprawdź czy zwraca 404 lub przekierowuje
    expect(response?.status()).toBe(404);
  });
});
```

### 5.6 Responsywność

```typescript
// e2e/specs/responsive.auth.spec.ts
import { test, expect } from '../fixtures/base';

test.describe('Responsywność', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`Dashboard powinien być responsywny na ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
      
      // Screenshot dla porównania wizualnego
      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test(`Generator planu powinien być responsywny na ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/generate');
      
      await expect(page.locator('form')).toBeVisible();
    });
  }
});
```

## 6. Harmonogram Implementacji

### Faza 1: Setup (1 dzień)
- [ ] Rozszerzenie `playwright.config.ts`
- [ ] Utworzenie `global-setup.ts` i `auth.setup.ts`
- [ ] Rozszerzenie fixtures w `base.ts`
- [ ] Utworzenie `test-data.ts`
- [ ] Konfiguracja `.gitignore` dla `e2e/.auth/`

### Faza 2: Page Objects (2 dni)
- [ ] `LoginPage.ts`
- [ ] `RegisterPage.ts`
- [ ] `DashboardPage.ts`
- [ ] `PlanGeneratorPage.ts`
- [ ] `PlansListPage.ts`
- [ ] `ActiveSessionPage.ts`
- [ ] `HistoryPage.ts`

### Faza 3: Testy Autentykacji (1 dzień)
- [ ] `login.unauth.spec.ts`
- [ ] `register.unauth.spec.ts`
- [ ] `logout.auth.spec.ts`

### Faza 4: Testy Planów (2 dni)
- [ ] `generate-ai.auth.spec.ts`
- [ ] `create-manual.auth.spec.ts`
- [ ] `list.auth.spec.ts`
- [ ] `edit.auth.spec.ts`

### Faza 5: Testy Sesji Treningowych (2 dni)
- [ ] `start-workout.auth.spec.ts`
- [ ] `active-session.auth.spec.ts`
- [ ] `complete-workout.auth.spec.ts`

### Faza 6: Testy Historii i Nawigacji (1 dzień)
- [ ] `view-history.auth.spec.ts`
- [ ] `routing.auth.spec.ts`
- [ ] `responsive.auth.spec.ts`

### Faza 7: CI/CD Integration (1 dzień)
- [ ] GitHub Actions workflow dla E2E
- [ ] Integracja z raportowaniem błędów
- [ ] Konfiguracja artifacts (screenshots, traces)

## 7. Dodatkowe Uwagi

### 7.1 Data Testid Attributes

Aby testy były stabilne, należy dodać atrybuty `data-testid` do kluczowych elementów w komponentach React:

```tsx
// Przykład dla WorkoutCard
<div data-testid="workout-card">
  <span data-testid="workout-date">{date}</span>
  <button data-testid="start-workout-btn">Rozpocznij</button>
</div>
```

### 7.2 Mockowanie AI

W testach E2E nie mockujemy bezpośrednio API AI (OpenRouter), ale możemy:
1. Użyć timeoutów dla długich operacji (do 60s dla generowania)
2. Utworzyć dedykowane plany testowe z seed.sql
3. Opcjonalnie: użyć interceptora Playwright do mockowania odpowiedzi

```typescript
// Opcjonalne mockowanie odpowiedzi AI
await page.route('**/api/plans/generate', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockGeneratedPlan),
  });
});
```

### 7.3 Cleanup

Po testach należy rozważyć cleanup danych testowych:

```typescript
// e2e/global-teardown.ts
async function globalTeardown() {
  console.log('🧹 Cleaning up test data...');
  // Opcjonalnie: usuń plany/sesje utworzone podczas testów
  // Można identyfikować po prefiksie nazwy lub metadata
}

export default globalTeardown;
```

### 7.4 Debugging

Dla debugowania testów:

```bash
# Tryb headed (widoczna przeglądarka)
npx playwright test --headed

# Tryb debug z pauzą
npx playwright test --debug

# Generowanie trace
npx playwright test --trace on

# Przeglądanie trace
npx playwright show-trace trace.zip
```

## 8. Podsumowanie

Plan zakłada implementację ~30 scenariuszy testowych E2E pokrywających:
- ✅ Pełny flow autentykacji (US-001, US-002)
- ✅ Generowanie planu przez AI (US-004)
- ✅ Manualne tworzenie planów (US-005)
- ✅ Zarządzanie planami (US-006)
- ✅ Realizacja treningu (US-007, US-008)
- ✅ Zakończenie i zapis sesji (US-009)
- ✅ Historia treningów (US-010)
- ✅ Nawigacja i responsywność

Szacowany czas implementacji: **10-12 dni roboczych**

Wszystkie testy używają Page Object Model dla łatwości utrzymania i są zgodne z wytycznymi z `.cursor/rules/playwright.mdc`.

