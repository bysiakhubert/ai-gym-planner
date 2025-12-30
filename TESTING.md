# Testing Guide

Ten dokument opisuje konfigurację i użycie testów w projekcie GymPlanner.

## Stack testowy

### Testy jednostkowe i komponentów
- **Vitest** - szybki runner testów kompatybilny z Vite
- **React Testing Library** - testowanie komponentów React
- **jsdom** - symulacja środowiska DOM
- **MSW (Mock Service Worker)** - mockowanie API

### Testy E2E
- **Playwright** - kompleksowe testy End-to-End
- **Page Object Model** - wzorzec projektowy dla łatwiejszego utrzymania testów

## Struktura katalogów

```
├── src/test/                      # Konfiguracja i narzędzia testowe
│   ├── setup.ts                   # Setup file dla Vitest
│   ├── test-utils.tsx             # Custom render z providerami
│   ├── mocks/                     # MSW handlers
│   │   ├── handlers.ts            # Definicje mock API
│   │   └── server.ts              # MSW server setup
│   └── __tests__/                 # Testy jednostkowe
│       ├── components/            # Testy komponentów React
│       ├── services/              # Testy serwisów
│       └── utils/                 # Testy funkcji pomocniczych
│
├── e2e/                           # Testy E2E (Playwright)
│   ├── fixtures/                  # Custom fixtures dla Playwright
│   │   └── base.ts                # Bazowe fixtures
│   └── page-objects/              # Page Object Model
│       ├── BasePage.ts            # Bazowa klasa dla wszystkich stron
│       └── HomePage.ts            # Przykładowy Page Object
```

## Dostępne komendy

### Testy jednostkowe (Vitest)

```bash
# Uruchom testy
npm run test

# Testy w trybie watch (automatyczne przeładowanie)
npm run test:watch

# Testy z interfejsem UI
npm run test:ui

# Testy z coverage
npm run test:coverage
```

### Testy E2E (Playwright)

```bash
# Uruchom testy E2E
npm run test:e2e

# Uruchom z interfejsem UI
npm run test:e2e:ui

# Uruchom w trybie debug
npm run test:e2e:debug

# Nagraj nowe testy (codegen)
npm run test:e2e:codegen
```

### Wszystkie testy

```bash
# Uruchom wszystkie testy (jednostkowe + E2E)
npm run test:all
```

## Pisanie testów jednostkowych

### Podstawowy test funkcji

```typescript
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should return correct result', () => {
    // Arrange
    const input = 5;
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe(10);
  });
});
```

### Test komponentu React

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### Mockowanie funkcji

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue(42);

// Lub z implementacją
const mockFn2 = vi.fn((x: number) => x * 2);
```

### Mockowanie modułów

```typescript
import { vi } from 'vitest';

vi.mock('./api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
}));
```

## Pisanie testów E2E

### Tworzenie Page Object

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  
  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Login' });
  }
  
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### Podstawowy test E2E

```typescript
import { test, expect } from './fixtures/base';
import { LoginPage } from './page-objects/LoginPage';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('/login');
    
    await loginPage.login('test@example.com', 'password123');
    
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### Visual Regression Testing

```typescript
test('should match visual snapshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    maxDiffPixels: 100,
  });
});
```

## Best Practices

### Vitest

1. **Struktura testów (AAA Pattern)**
   - Arrange (przygotowanie)
   - Act (działanie)
   - Assert (sprawdzenie)

2. **Używaj opisowych nazw**
   ```typescript
   it('should show error message when form is submitted with empty email', () => {
     // test
   });
   ```

3. **Mockuj zależności zewnętrzne**
   - API calls
   - Timery
   - LocalStorage/SessionStorage

4. **Testuj zachowanie, nie implementację**
   - Sprawdzaj co użytkownik widzi
   - Unikaj testowania internal state

5. **Używaj custom render z providerami**
   ```typescript
   import { render } from '@/test/test-utils';
   ```

### Playwright

1. **Używaj Page Object Model**
   - Łatwiejsze utrzymanie testów
   - Reużywalność kodu
   - Czytelniejsze testy

2. **Preferuj user-facing selectors**
   ```typescript
   page.getByRole('button', { name: 'Submit' })
   page.getByLabel('Email')
   page.getByText('Welcome')
   ```

3. **Unikaj hard-coded delays**
   ```typescript
   // ❌ Źle
   await page.waitForTimeout(5000);
   
   // ✅ Dobrze
   await page.waitForSelector('[data-testid="loaded"]');
   await page.waitForLoadState('networkidle');
   ```

4. **Izoluj testy**
   - Każdy test powinien być niezależny
   - Używaj `beforeEach` do setup
   - Używaj `afterEach` do cleanup

5. **Wykorzystuj trace viewer do debugowania**
   ```bash
   npm run test:e2e:debug
   ```

## Mockowanie API z MSW

### Dodaj handler w `src/test/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ]);
  }),
  
  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ token: 'mock-token' });
  }),
];
```

### Użyj w teście

```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

test('should handle API error', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );
  
  // test error handling
});
```

## Coverage

Projekt jest skonfigurowany z następującymi progami coverage:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

Raport coverage znajduje się w `coverage/index.html` po uruchomieniu:
```bash
npm run test:coverage
```

## CI/CD Integration

Testy są gotowe do integracji z CI/CD:
- Playwright: automatycznie wykrywa środowisko CI
- Vitest: działa w trybie single-run na CI
- Coverage: generuje raporty w formacie JSON/HTML

Przykładowa konfiguracja GitHub Actions:

```yaml
- name: Install dependencies
  run: npm ci

- name: Run unit tests
  run: npm run test:coverage

- name: Run E2E tests
  run: npm run test:e2e
```

## Debugowanie

### Vitest
- Użyj `npm run test:ui` dla graficznego interfejsu
- Użyj `console.log` lub `debugger` w testach
- Sprawdź `screen.debug()` dla stanu DOM

### Playwright
- Użyj `npm run test:e2e:debug` dla step-by-step debugging
- Sprawdź `playwright-report/` dla HTML reportów
- Użyj trace viewer: `npx playwright show-trace trace.zip`

## Przykłady

Sprawdź przykładowe testy w:
- `src/test/__tests__/utils/example.test.ts` - testy funkcji
- `src/test/__tests__/components/ExampleButton.test.tsx` - testy komponentów
- `e2e/example.spec.ts` - testy E2E z Page Object Model

## Dalsze kroki

1. Usuń przykładowe testy i zastąp je własnymi
2. Dostosuj MSW handlers do swoich API endpoints
3. Utwórz Page Objects dla kluczowych stron aplikacji
4. Dodaj testy dla krytycznych ścieżek użytkownika
5. Skonfiguruj CI/CD pipeline

