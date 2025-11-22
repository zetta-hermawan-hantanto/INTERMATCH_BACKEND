// *************** IMPORT LIBRARY  ***************
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// *************** IMPORT MODULES  ***************
const UserModel = require('../models/users.js');

// *************** IMPORT VALIDATOR  ***************
const UserValidator = require('../validators/users.validator.js');

// *************** IMPORT UTILITIES  ***************
const { ApiError } = require('../utils/common-error.js');

// *************** IMPORT SERVICES ***************
const AuthService = require('../service/auth.service.js');

/**
 * Login
 *
 * PURPOSE:
 *   Authenticate user credentials and issue a short-lived JWT on success.
 *
 * RATIONALE:
 *   Validate early, avoid leaking which field failed, and return a minimal safe payload.
 *
 * @async
 * @function Login
 * @param {import('express').Request} req - Express request containing email and password in body.
 * @param {import('express').Response} res - Express response used to send JSON payloads.
 * @returns {Promise<import('express').Response>} Express JSON response with status, message, and data.
 */
async function Login(req, res) {
  try {
    const { email, password } = req.body;

    UserValidator.ValidateLoginInput({ email, password });

    const { user, token } = await AuthService.LoginUserService({ email, password });

    const responsePayload = {
      status: 'success',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token,
      },
      message: 'Successfully login into INTERNMATCH platform.',
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error(error.stack);

    if (error instanceof ApiError) {
      const responsePayload = {
        status: 'failed',
        message: error.message,
        data: null,
      };
      return res.status(error.code).json(responsePayload);
    }

    const responsePayload = {
      status: 'failed',
      message: 'Internal Server Error',
      data: null,
    };
    return res.status(500).json(responsePayload);
  }
}

/**
 * Register
 *
 * PURPOSE:
 *   Handles new user registration by creating User and Student records.
 *
 * RATIONALE:
 *   Validates input, delegates creation logic to AuthService for transaction safety,
 *   and handles duplicate email errors gracefully.
 *
 * @async
 * @function Register
 * @param {import('express').Request} req - Express request containing name, email, and password.
 * @param {import('express').Response} res - Express response used to send JSON payloads.
 * @returns {Promise<import('express').Response>} Express JSON response with status 201 and user data.
 */
async function Register(req, res) {
  try {
    const { name, email, password } = req.body;

    UserValidator.ValidateRegisterInput({ name, email, password });

    const { newUser, newStudent } = await AuthService.RegisterUserService({ name, email, password });

    const responsePayload = {
      status: 'success',
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        student_id: newStudent._id,
      },
      message: 'Successfully registered to the platform.',
    };

    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error(error.stack);

    // *************** Collapse duplicate key race condition into a client-friendly message
    if (error && error.code && error.code === 11000) {
      const responsePayload = {
        status: 'failed',
        message: 'Email already exists.',
        data: null,
      };
      return res.status(400).json(responsePayload);
    }

    if (error instanceof ApiError) {
      const responsePayload = {
        status: 'failed',
        message: error.message,
        data: null,
      };
      return res.status(error.code).json(responsePayload);
    }

    const responsePayload = {
      status: 'failed',
      message: 'Internal Server Error',
      data: null,
    };
    return res.status(500).json(responsePayload);
  }
}

/**
 * ForgotPassword
 * Handles "forgot password" flow by validating the email, generating a reset token,
 * and returning a password reset link to the client.
 *
 * Flow:
 * - Extracts and validates `email` from request body
 * - Normalizes email (trim + lowercase) and looks up user
 * - Generates a short-lived JWT reset token
 * - Builds reset-password URL and returns it in the response payload
 * - Handles known errors (validation, duplicate key, application errors) with safe messages
 *
 * @async
 * @function ForgotPassword
 * @param {import('express').Request} req - Express request object containing `email` in `req.body`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends JSON response with status, message, and optional reset link.
 */
async function ForgotPassword(req, res) {
  try {
    // *************** Extract email from request body
    const { email } = req.body;

    // *************** Validate request early to protect auth flow and save compute
    UserValidator.ValidateForgotPasswordInput({ email });

    // *************** Normalize inputs to ensure consistent lookup
    const normalizedEmail = String(email).trim().toLowerCase();

    // *************** Fetch user by normalized email; include password hash for verification
    const user = await UserModel.findOne({ email: normalizedEmail }).select('_id name email').lean();

    // *************** Use a generic error to avoid leaking account existence
    if (!user) {
      throw new ApiError(401, 'Email not found.');
    }

    // *************** Ensure JWT secret is configured to prevent weak token generation
    const token = jwt.sign({ user }, process.env.FORGOT_PASSWORD_KEY, {
      expiresIn: '1h',
    });

    // *************** Generate short-lived token; rotate/refresh strategy can be added later
    if (!token) {
      throw new ApiError(500, 'Cannot generate token.');
    }

    // *************** Build minimal safe response payload; never return password/hash
    const URL = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    // *************** Build minimal safe response payload; never return password/hash
    const responsePayload = {
      status: 'success',
      data: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        resetLink: URL,
      },
      message: 'Successfully generated password reset link.',
    };

    // *************** Send response to client
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error(error.stack);

    // *************** Collapse duplicate key race condition into a client-friendly message
    if (error && error.code && error.code === 11000) {
      const responsePayload = {
        status: 'failed',
        message: 'Email already exists.',
        data: null,
      };
      return res.status(400).json(responsePayload);
    }

    // *************** Handle known application errors with consistent structure
    if (error instanceof ApiError) {
      const responsePayload = {
        status: 'failed',
        message: error.message,
        data: null,
      };
      return res.status(error.code).json(responsePayload);
    }

    // *************** Fallback for unexpected server errors without exposing internals
    const responsePayload = {
      status: 'failed',
      message: 'Internal Server Error',
      data: null,
    };
    return res.status(500).json(responsePayload);
  }
}

/**
 * ResetPassword
 * Handles the password reset flow using a reset token and a new password.
 *
 * Flow:
 * - Extracts `token` and `newPassword` from request body
 * - Validates input with Joi validator
 * - Verifies and decodes JWT reset token
 * - Hashes the new password with bcrypt
 * - Updates the user's password in the database
 * - Returns a success response without exposing any password/hash
 * - Handles known errors with safe, consistent responses
 *
 * @async
 * @function ResetPassword
 * @param {import('express').Request} req - Express request object containing `token` and `newPassword` in `req.body`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends JSON response with status and message.
 */
async function ResetPassword(req, res) {
  try {
    // *************** Extract token and newPassword from request body
    const { token, newPassword } = req.body;

    // *************** Validate request early to protect auth flow and save compute
    UserValidator.ValidateResetPasswordInput({ token, newPassword });

    // *************** Verify and decode the token using the secret key
    const decoded = jwt.verify(token, process.env.FORGOT_PASSWORD_KEY);
    if (!decoded || !decoded.user) {
      throw new ApiError(401, 'Invalid or expired token.');
    }

    // *************** Extract user ID from decoded token
    const userId = decoded.user._id;

    // *************** Get salt rounds from environment variable or default to 10
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const bcryptSalt = await bcrypt.genSalt(saltRounds);

    // *************** Hash the new password using the generated salt
    const hashedPassword = await bcrypt.hash(newPassword, bcryptSalt);
    if (!hashedPassword) {
      throw new ApiError(500, 'Cannot hash password.');
    }

    // *************** Update the user's password in the database
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          password: hashedPassword,
        },
      },
      { new: true }
    );

    // *************** Confirm password update succeeded
    if (!updatedUser) {
      throw new ApiError(500, 'Cannot update password.');
    }

    // *************** Build minimal safe response payload; never return password/hash
    const responsePayload = {
      status: 'success',
      data: {
        _id: String(updatedUser._id),
        name: updatedUser.name,
        email: updatedUser.email,
      },
      message: 'Successfully reset password.',
    };

    // *************** Send response to client
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error(error.stack);

    // *************** Collapse duplicate key race condition into a client-friendly message
    if (error && error.code && error.code === 11000) {
      const responsePayload = {
        status: 'failed',
        message: 'Email already exists.',
        data: null,
      };
      return res.status(400).json(responsePayload);
    }

    // *************** Handle known application errors with consistent structure
    if (error instanceof ApiError) {
      const responsePayload = {
        status: 'failed',
        message: error.message,
        data: null,
      };
      return res.status(error.code).json(responsePayload);
    }

    // *************** Fallback for unexpected server errors without exposing internals
    const responsePayload = {
      status: 'failed',
      message: 'Internal Server Error',
      data: null,
    };
    return res.status(500).json(responsePayload);
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
};
