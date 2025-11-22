// *************** IMPORT LIBRARIES ***************
const Joi = require('joi');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');

// *************** GLOBAL VARIABLES ***************
const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * ValidateLoginInput
 *
 * PURPOSE:
 *   Validate user login credentials to ensure input integrity before authentication.
 *
 * RATIONALE:
 *   Validation acts as a boundary gate — we reject malformed or incomplete inputs early
 *   to maintain data consistency and reduce unnecessary processing in downstream layers.
 *
 * @param {Object} params
 * @param {string} params.email - The user's email; normalized to lowercase and trimmed.
 * @param {string} params.password - The user's raw password input.
 *
 * @returns {void}
 * @throws {Error} Throws validation error message if email or password is invalid.
 */
const ValidateLoginInput = ({ email, password }) => {
  // *************** define joi schema for login input
  const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      // *************** custom error messages for email
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),

    password: Joi.string().min(6).max(128).required().pattern(passwordPattern).messages({
      // *************** custom error messages for password
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
  });

  // *************** validate input using schema
  const { error } = loginSchema.validate({ email, password });

  // *************** throw error if validation fails
  if (error) {
    throw new ApiError(400, error.message);
  }
};

/**
 * ValidateRegisterInput
 *
 * PURPOSE:
 *   Validate user registration credentials to ensure all required input fields
 *   conform to pre-defined business constraints and avoid malformed data records.
 *
 * RATIONALE:
 *   This function enforces initial data integrity before user creation, reducing
 *   downstream database and application logic errors.
 *
 * @param {Object} params
 * @param {string} params.name - The user's full name (required).
 * @param {string} params.email - The user's email address (required).
 * @param {string} params.password - The user's raw password input (required).
 *
 * @returns {void}
 * @throws {ApiError} Throws validation error if any field is invalid.
 */
const ValidateRegisterInput = ({ name, email, password }) => {
  // *************** define joi schema for registration input
  const registerSchema = Joi.object({
    // *************** name must be a string, at least 3 chars, required
    name: Joi.string().min(3).required().messages({
      // *************** custom error messages for name
      'string.base': 'Name must be a string',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters',
      'any.required': 'Name is required',
    }),

    // *************** email must be valid email, normalized, required
    email: Joi.string().email().lowercase().trim().required().messages({
      // *************** custom error messages for email
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),

    // *************** password must match security requirements, required
    password: Joi.string().min(6).max(128).pattern(passwordPattern).required().messages({
      // *************** custom error messages for password
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
  });

  // *************** validate input using schema; destructure error only
  const { error } = registerSchema.validate({ name, email, password });

  // *************** throw error if validation fails, using custom error message
  if (error) {
    throw new ApiError(400, error.message);
  }
};

/**
 * ValidateForgotPasswordInput
 * Validates the forgot password input payload using Joi.
 *
 * Ensures that:
 * - `email` is provided
 * - `email` is a string
 * - `email` is a valid email format
 * - `email` is lowercased and trimmed
 *
 * @param {{ email: string }} params - Object containing the email to validate.
 * @param {string} params.email - The email address submitted for forgot password.
 * @throws {ApiError} Throws 400 ApiError if validation fails with the Joi error message.
 * @returns {void}
 */
const ValidateForgotPasswordInput = ({ email }) => {
  // *************** define joi schema for forgot password input
  const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
  });

  // *************** validate input using schema; destructure error only
  const { error } = forgotPasswordSchema.validate({ email });

  // *************** throw error if validation fails
  if (error) {
    throw new ApiError(400, error.message);
  }
};

/**
 * ValidateResetPasswordInput
 * Validates the reset password input payload using Joi.
 *
 * Ensures that:
 * - `token` is provided and is a non-empty string
 * - `newPassword` is provided
 * - `newPassword` is a string with a valid length
 * - `newPassword` matches the required password pattern
 *   (at least one uppercase letter, one number, and one special character)
 *
 * @param {{ token: string, newPassword: string }} params - Object containing reset password input.
 * @param {string} params.token - JWT or reset token sent to the user.
 * @param {string} params.newPassword - New password chosen by the user.
 * @throws {ApiError} Throws 400 ApiError if validation fails with the Joi error message.
 * @returns {void}
 */
const ValidateResetPasswordInput = ({ token, newPassword }) => {
  // *************** define joi schema for reset password input
  const resetPasswordSchema = Joi.object({
    token: Joi.string().required().messages({
      'string.base': 'Token must be a string',
      'string.empty': 'Token is required',
      'any.required': 'Token is required',
    }),
    newPassword: Joi.string().min(6).max(128).pattern(passwordPattern).required().messages({
      'string.base': 'New password must be a string',
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one number, and one special character',
      'any.required': 'New password is required',
    }),
  });

  // *************** validate input using schema; destructure error only
  const { error } = resetPasswordSchema.validate({ token, newPassword });

  // *************** throw error if validation fails
  if (error) {
    throw new ApiError(400, error.message);
  }
};

// *************** EXPORT MODULES ***************
module.exports = {
  ValidateLoginInput,
  ValidateRegisterInput,
  ValidateForgotPasswordInput,
  ValidateResetPasswordInput,
};
