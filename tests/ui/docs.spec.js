const { test, expect } = require('../../src/fixtures');

test.describe('Playwright documentation', () => {
  test('loads the home page and shows primary navigation @smoke', async ({ docsPage }) => {
    await test.step('Open documentation', async () => {
      await docsPage.open();
    });

    await expect(docsPage.page).toHaveTitle(/Playwright/);
    await expect(docsPage.heading).toBeVisible();
    await expect(docsPage.getStartedLink).toBeVisible();
  });

  test('opens the getting started documentation', async ({ docsPage, page }) => {
    await docsPage.open();
    await docsPage.getStartedLink.click();

    await expect(page).toHaveURL(/docs\/intro/);
  });
});
