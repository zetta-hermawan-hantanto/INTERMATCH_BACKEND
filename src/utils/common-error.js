/**
 * @class ApiError
 * @extends Error
 *
 * @classdesc
 * Represents an application-specific error for API responses, allowing for custom HTTP status codes and messages.
 * Useful for differentiating API errors from generic errors within middleware and error handlers.
 */
class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.message = message;
    this.code = code;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  ApiError,
};
