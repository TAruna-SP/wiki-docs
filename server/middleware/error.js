import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

// 404 for unmatched routes.
export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler. Normalizes known errors to clean JSON.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode ?? 500;
  let message = err.message ?? 'Internal server error';
  let details = err.details;

  // Mongoose / Mongo specifics.
  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyValue ?? {}).join(', ')}`;
  }

  if (status >= 500 && !config.isTest) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(status).json({
    error: message,
    ...(details ? { details } : {}),
    ...(config.isProd ? {} : { stack: err.stack }),
  });
}

export { ApiError };
