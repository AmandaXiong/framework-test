const base = require('@playwright/test');
const { DocsPage } = require('../pages/DocsPage');
const { ApiClient } = require('../api/ApiClient');

const test = base.test.extend({
  docsPage: async ({ page }, use) => {
    await use(new DocsPage(page));
  },
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
});

module.exports = { test, expect: base.expect };
