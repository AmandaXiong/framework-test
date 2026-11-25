# Playwright UI and API test framework

A Playwright + JavaScript framework with Chromium UI tests and JSONPlaceholder API tests.

## Prerequisites

- Node.js 20+
- Playwright `@playwright/test@1.57.0`
- macOS Ventura compatibility

No login or credentials are required.

## Setup

```bash
npm install
npx playwright install chromium
cp env/.env.example env/.env.qa
```

The copied `.env.qa` contains these practice URLs and is safe to use:

- UI: `https://playwright.dev`
- API: `https://jsonplaceholder.typicode.com`

## Commands

```bash
npm run test:ui
npm run test:api
npm run test:smoke
npm test
npm run lint
npm run report
```

## Structure

- `src/pages/` - UI page objects
- `src/api/` - API client and JSON schemas
- `src/fixtures/` - shared Playwright fixtures
- `src/utils/` - validation helpers
- `tests/ui/` - Chromium UI specs
- `tests/api/` - API specs
- `env/` - environment configuration
- `.github/workflows/playwright.yml` - Pull request CI

Run results are written to `test-results/` and `playwright-report/`.
