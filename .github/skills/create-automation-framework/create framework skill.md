---
name: create-automation-framework
description: Creates or extends a Playwright + JavaScript test automation framework with both UI automation (page objects, fixtures, auth setup) and API automation (API client, schema checks), plus environment config, test data, reporting and CI. Use when asked to set up a new automation framework, scaffold a test project, or add the UI or API layer to an existing one.
---

# Create a Playwright UI + API automation framework (JavaScript)

Follow these steps in order. Do not skip the "Check first" step.

## 1. Check first

Before creating anything:

1. Look at the repository root. If `package.json`, `playwright.config.js` or a `tests/` folder already exists, **extend the existing framework instead of replacing it**. Follow its existing naming and folder style. Only add the missing parts.
2. Ask the user (if not already given):
   - The application's UI base URL and API base URL for each environment (e.g. dev, qa, uat)
   - How users log in (UI form, SSO, API token)
   - Which browsers to run (default: Chromium only)
3. Never write real passwords, tokens or customer data into any file. Use environment variables and `.env` files that are git-ignored.

## 2. Install

```bash
npm init -y
npm install -D @playwright/test dotenv ajv eslint
npx playwright install chromium
```

If the machine's OS is too old for the latest Playwright browsers, pin a version that works (e.g. `@playwright/test@1.57.0`) and record it in the README.

## 3. Folder structure

Create exactly this layout (skip any folder that already exists):

```
.
├── playwright.config.js
├── package.json
├── .gitignore
├── README.md
├── env/
│   ├── .env.example        # committed: variable names only, no values
│   └── .env.qa             # NOT committed
├── src/
│   ├── pages/              # UI page objects
│   │   ├── BasePage.js
│   │   └── LoginPage.js
│   ├── components/         # shared UI parts (header, modal, table)
│   ├── api/                # API layer
│   │   ├── ApiClient.js
│   │   └── schemas/        # JSON schemas for response checks
│   ├── fixtures/
│   │   └── index.js        # custom test fixtures (pages + api client)
│   ├── data/               # test data builders and static data
│   └── utils/              # helpers (dates, random data, logger)
├── tests/
│   ├── setup/
│   │   └── auth.setup.js   # logs in once, saves session
│   ├── ui/
│   │   └── login.spec.js
│   └── api/
│       └── users.api.spec.js
└── .github/
    └── workflows/
        └── playwright.yml
```

## 4. Configuration

`playwright.config.js`. One config, separate **projects** for setup, UI and API:

```js
// @ts-check
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

const TEST_ENV = process.env.TEST_ENV || 'qa';
require('dotenv').config({ path: path.resolve(__dirname, 'env', `.env.${TEST_ENV}`) });

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      use: { baseURL: process.env.UI_BASE_URL },
    },
    {
      name: 'ui-chromium',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.UI_BASE_URL,
        storageState: '.auth/user.json',
      },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: process.env.API_BASE_URL,
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
  ],
});
```

`env/.env.example`:

```
UI_BASE_URL=
API_BASE_URL=
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
API_TOKEN=
```

`.gitignore` must include:

```
node_modules/
env/.env.*
!env/.env.example
.auth/
test-results/
playwright-report/
```

`package.json` scripts:

```json
"scripts": {
  "test": "playwright test",
  "test:ui": "playwright test --project=ui-chromium",
  "test:api": "playwright test --project=api",
  "test:smoke": "playwright test --grep @smoke",
  "report": "playwright show-report",
  "lint": "eslint ."
}
```

## 5. UI layer

### Page objects (rules)
- One class per page, in `src/pages/`. Shared parts go in `src/components/`.
- Locators are defined in the constructor. Prefer `getByRole`, `getByLabel`, `getByTestId`. Avoid CSS/XPath unless there is no other option.
- Methods describe user actions (`login()`, `searchAccount()`), not clicks.
- **No assertions inside page objects**, except simple "page is loaded" checks. Assertions belong in tests.
- Never use `page.waitForTimeout()`. Rely on Playwright's auto-waiting and web-first assertions.

`src/pages/BasePage.js`:

```js
class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto(path = '/') {
    await this.page.goto(path);
  }
}

module.exports = { BasePage };
```

`src/pages/LoginPage.js`:

```js
const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async open() {
    await this.goto('/login');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}

module.exports = { LoginPage };
```

### Auth setup (log in once, reuse the session)

`tests/setup/auth.setup.js`:

```js
const { test: setup, expect } = require('@playwright/test');
const { LoginPage } = require('../../src/pages/LoginPage');

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  await expect(page).not.toHaveURL(/login/);
  await page.context().storageState({ path: '.auth/user.json' });
});
```

## 6. API layer

### API client (rules)
- All HTTP calls go through `src/api/ApiClient.js` (or one client per service, e.g. `UsersApi.js`, if the API is large).
- The client returns the raw `APIResponse`, so tests can check status, headers and body.
- Auth headers are added in one place, never copied into tests.
- Validate response shape with a JSON schema in `src/api/schemas/`.

`src/api/ApiClient.js`:

```js
class ApiClient {
  /** @param {import('@playwright/test').APIRequestContext} request */
  constructor(request) {
    this.request = request;
    this.headers = process.env.API_TOKEN
      ? { Authorization: `Bearer ${process.env.API_TOKEN}` }
      : {};
  }

  get(url, options = {}) {
    return this.request.get(url, { ...options, headers: { ...this.headers, ...options.headers } });
  }

  post(url, data, options = {}) {
    return this.request.post(url, { ...options, data, headers: { ...this.headers, ...options.headers } });
  }

  put(url, data, options = {}) {
    return this.request.put(url, { ...options, data, headers: { ...this.headers, ...options.headers } });
  }

  delete(url, options = {}) {
    return this.request.delete(url, { ...options, headers: { ...this.headers, ...options.headers } });
  }
}

module.exports = { ApiClient };
```

`src/utils/schema.js`:

```js
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

function validateSchema(schema, body) {
  const validate = ajv.compile(schema);
  const valid = validate(body);
  return { valid, errors: validate.errors };
}

module.exports = { validateSchema };
```

## 7. Fixtures (connect UI and API to tests)

`src/fixtures/index.js`:

```js
const base = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { ApiClient } = require('../api/ApiClient');

const test = base.test.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
});

module.exports = { test, expect: base.expect };
```

Every test imports `test` and `expect` from `src/fixtures`, **not** directly from `@playwright/test`.

## 8. Example tests

`tests/ui/login.spec.js`:

```js
const { test, expect } = require('../../src/fixtures');

test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // start logged out

  test('shows an error for a wrong password @smoke', async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.login(process.env.TEST_USER_EMAIL, 'wrong-password');
    await expect(loginPage.errorMessage).toBeVisible();
  });
});
```

`tests/api/users.api.spec.js`:

```js
const { test, expect } = require('../../src/fixtures');
const { validateSchema } = require('../../src/utils/schema');
const userSchema = require('../../src/api/schemas/user.schema.json');

test.describe('Users API', () => {
  test('GET /users/:id returns a valid user @smoke', async ({ apiClient }) => {
    const response = await apiClient.get('/users/1');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const { valid, errors } = validateSchema(userSchema, body);
    expect(valid, JSON.stringify(errors)).toBe(true);
  });

  test('GET /users/:id returns 404 for an unknown user', async ({ apiClient }) => {
    const response = await apiClient.get('/users/999999');
    expect(response.status()).toBe(404);
  });
});
```

Replace endpoints, labels and schema with the real application's values. Ask the user if unknown. Do not invent endpoints.

## 9. Test conventions

- File names: `*.spec.js` for UI, `*.api.spec.js` for API.
- Test names describe expected behaviour: `"shows an error for a wrong password"`, not `"test1"`.
- Tags in the title: `@smoke`, `@regression`, plus a feature tag if useful (`@payments`).
- Each test is independent: creates its own data (prefer the API to set up data for UI tests), and cleans up if needed.
- Test data builders live in `src/data/`. Use unique values (timestamp or random suffix) to avoid clashes in parallel runs.
- Use `test.step()` for long flows so reports are readable.

## 10. CI (GitHub Actions)

`.github/workflows/playwright.yml`:

```yaml
name: Playwright Tests
on:
  pull_request:
  workflow_dispatch:
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      TEST_ENV: qa
      UI_BASE_URL: ${{ vars.UI_BASE_URL }}
      API_BASE_URL: ${{ vars.API_BASE_URL }}
      TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
      TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      API_TOKEN: ${{ secrets.API_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

If the team uses another CI tool (Jenkins, Harness, Azure DevOps), keep the same steps and only change the pipeline file. Secrets always come from the CI secret store.

## 11. README

Write a short `README.md` with: prerequisites (Node version, Playwright version), how to create `env/.env.qa` from `.env.example`, how to run UI / API / smoke tests, how to open the report, and the folder structure from step 3.

## 12. Verify before finishing

Run and confirm each item. Report results to the user:

1. `npm run lint` passes.
2. `npx playwright test --list` shows the setup, UI and API tests in the right projects.
3. `npm run test:api` runs (or fails only because of real-app values the user still needs to fill in).
4. `npm run test:ui` runs the setup project first, then the UI tests.
5. `git status` shows no `.env` files, `.auth/` folder or reports staged.

Tell the user which placeholder values (URLs, labels, endpoints, schemas) still need real values.
