# GitHub Actions Workflow - Pull Request CI

## Overview

The `pull-request.yml` workflow provides automated CI/CD for pull requests targeting the `master` branch. It performs code quality checks, runs tests, and provides automated feedback directly on pull requests.

## Workflow Structure

### 1. **Lint Job** (Sequential)
- **Purpose**: Validates code quality and style
- **Runs**: `npm run lint`
- **Dependencies**: None (runs first)

### 2. **Unit Test Job** (Parallel with E2E)
- **Purpose**: Runs unit tests with coverage
- **Runs**: `npm run test:coverage`
- **Dependencies**: Requires `lint` to pass
- **Artifacts**:
  - `unit-test-coverage/` - Coverage reports from Vitest

### 3. **E2E Test Job** (Parallel with Unit Tests)
- **Purpose**: Runs end-to-end tests with Playwright
- **Runs**: `npm run test:e2e`
- **Dependencies**: Requires `lint` to pass
- **Environment**: `integration`
- **Browser**: Chromium (Desktop Chrome configuration)
- **Artifacts**:
  - `playwright-report/` - HTML test report
  - `e2e-test-results/` - Raw test results

### 4. **Status Comment Job** (Final)
- **Purpose**: Posts a summary comment on the PR
- **Dependencies**: Runs after all previous jobs complete
- **Condition**: Always runs, even if previous jobs fail
- **Permissions**: Requires `pull-requests: write`

## Required Secrets

The workflow requires the following secrets to be configured in GitHub repository settings:

### Integration Environment Secrets

Navigate to: `Settings > Environments > integration > Environment secrets`

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon/public key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin) | `eyJhbGc...` |
| `E2E_USERNAME_ID` | Test user UUID | `123e4567-e89b-12d3-a456-426614174000` |
| `E2E_USERNAME` | Test user email | `test@example.com` |
| `E2E_PASSWORD` | Test user password | `SecurePassword123!` |

## Actions Used

All actions use the latest major versions (verified as of January 2026):

| Action | Version | Purpose |
|--------|---------|---------|
| `actions/checkout` | v6 | Clone repository |
| `actions/setup-node` | v6 | Setup Node.js environment |
| `actions/upload-artifact` | v6 | Upload test artifacts |
| `actions/download-artifact` | v7 | Download test artifacts |
| `actions/github-script` | v8 | Post PR comments |

## Workflow Features

### Concurrency Control
- Cancels in-progress runs when new commits are pushed
- Prevents resource waste on outdated code

### Node.js Configuration
- Uses `.nvmrc` file to determine Node.js version (currently 22.14.0)
- Leverages npm cache for faster dependency installation

### Playwright Browser Setup
- Installs only Chromium browser (as per `playwright.config.ts`)
- Includes system dependencies (`--with-deps`)

### Artifact Management
- Retains artifacts for 7 days
- Coverage and test results available for download
- Always uploads artifacts, even on test failure

### PR Comment Features
- Updates existing comment instead of creating duplicates
- Shows status with emojis: ✅ ❌ ⚠️ ⏭️ ❓
- Provides links to workflow run
- Displays coverage and report information

## Trigger Conditions

The workflow runs on:
- **Event**: Pull Request
- **Branches**: `master`
- **Types**: 
  - `opened` - New PR created
  - `synchronize` - New commits pushed
  - `reopened` - PR reopened

## Local Testing

Before pushing, you can run the same checks locally:

```bash
# Lint
npm run lint

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires .env.test file)
npm run test:e2e

# All tests
npm run test:all
```

## Troubleshooting

### Lint Job Fails
- Run `npm run lint:fix` to auto-fix issues
- Check `eslint.config.js` for rule configuration

### Unit Tests Fail
- Run `npm run test:ui` for interactive debugging
- Check test files in `src/test/__tests__/`

### E2E Tests Fail
- Verify secrets are correctly configured in GitHub
- Check that integration environment exists
- Run `npm run test:e2e:ui` locally for debugging
- Review Playwright report artifact in GitHub Actions

### Status Comment Not Posted
- Verify repository has `pull-requests: write` permission
- Check that previous jobs completed (success or failure)
- Review workflow run logs for API errors

## Performance Optimization

The workflow is optimized for speed:
- **Parallel execution**: Unit and E2E tests run simultaneously
- **npm cache**: Reduces dependency installation time
- **Concurrency control**: Cancels outdated runs
- **Selective browser install**: Only Chromium, not all browsers

## Cost Optimization

To minimize GitHub Actions usage:
- Sequential lint prevents wasted parallel jobs
- 7-day artifact retention (not default 90 days)
- Single worker for E2E tests (avoids race conditions)
- Cancels in-progress runs on new commits

## Future Enhancements

Potential improvements:
- Add visual regression testing
- Integrate code coverage reports (Codecov, Coveralls)
- Add performance benchmarking
- Deploy preview environments
- Add security scanning (npm audit, Snyk)
