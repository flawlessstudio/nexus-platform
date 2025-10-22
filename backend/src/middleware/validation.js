const { validationResult } = require('express-validator');
exports.validate = (schemas) => async (req, res, next) => {
  await Promise.all(schemas.map((schema) => schema.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  // Use 422 for semantic validation errors
  res.status(422).json({ errors: errors.array() });
};
