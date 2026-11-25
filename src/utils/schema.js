const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

function validateSchema(schema, body) {
  const validate = ajv.compile(schema);
  const valid = validate(body);
  return { valid, errors: validate.errors };
}

module.exports = { validateSchema };
