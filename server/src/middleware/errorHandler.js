export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'It did not save. Try again.' } });
}

export function errorHandler(err, _req, res, _next) {
  if (err.name === 'ZodError') {
    const fields = {};
    for (const issue of err.issues || []) {
      const key = issue.path.join('.') || 'body';
      fields[key] = issue.message;
    }
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'Check the fields.', fields },
    });
  }

  if (err.status && err.code) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, fields: err.fields },
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Already exists.' },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'SERVER', message: 'It did not save. Try again.' },
  });
}

export function httpError(status, code, message, fields) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.fields = fields;
  return err;
}
