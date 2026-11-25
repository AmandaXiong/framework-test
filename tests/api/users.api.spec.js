const { test, expect } = require('../../src/fixtures');
const { validateSchema } = require('../../src/utils/schema');
const userSchema = require('../../src/api/schemas/user.schema.json');

test.describe('Users API', () => {
  test('GET /users/1 returns a valid user @smoke', async ({ apiClient }) => {
    const response = await apiClient.get('/users/1');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const { valid, errors } = validateSchema(userSchema, body);
    expect(valid, JSON.stringify(errors)).toBe(true);
  });

  test('GET /users/999999 returns 404', async ({ apiClient }) => {
    const response = await apiClient.get('/users/999999');
    expect(response.status()).toBe(404);
  });
});
