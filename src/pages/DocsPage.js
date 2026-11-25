const { BasePage } = require('./BasePage');

class DocsPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.getStartedLink = page.getByRole('link', { name: 'Get started' }).first();
  }

  async open() {
    await this.goto('/');
  }
}

module.exports = { DocsPage };
