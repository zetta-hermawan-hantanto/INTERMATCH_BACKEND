// *************** IMPORT LIBRARY ***************
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// *************** IMPORT MODULES ***************
const UserModel = require('../models/users');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');

/**
 * AuthMiddleware
 *
 * PURPOSE:
 *   Authenticate requests using a Bearer JWT and attach userId to the request object.
 *
 * RATIONALE:
 *   Protects private routes by rejecting requests with missing/invalid tokens or non-existent users.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>} Continues request lifecycle if authenticated.
 */
const AuthMiddleware = async (req, res, next) => {
  try {
    // *************** Validation Section: Ensure Authorization header is present and well-formed
    const authorizationHeader = req.headers?.authorization;
    const hasBearerPrefix = authorizationHeader?.indexOf('Bearer ') === 0;
    if (!hasBearerPrefix) {
      throw new ApiError(401, 'Unauthorized: token not provided.');
    }

    // *************** Query Section: Extract token and verify signature/claims
    const token = authorizationHeader?.slice(7)?.trim();
    if (!token) {
      throw new ApiError(401, 'Unauthorized: token not provided.');
    }

    // *************** Get secret key from environment variables
    const jwtSecret = process.env.SECRET_KEY;

    // *************** Handle missing secret key configuration
    if (!jwtSecret) {
      throw new ApiError(500, 'Server configuration error.');
    }

    // *************** Verification Section: Decode and verify JWT token
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded?.userId;
    if (!userId) {
      throw new ApiError(401, 'Unauthorized: invalid token.');
    }

    // *************** Transformation Section: Validate userId shape to prevent cast errors
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    if (!isValidObjectId) {
      throw new ApiError(401, 'Unauthorized: invalid token.');
    }

    // *************** Query Section: Confirm user still exists (handles deleted/disabled accounts)
    const userExists = await UserModel.exists({ _id: userId });
    if (!userExists) {
      throw new ApiError(401, 'Unauthorized: user not found.');
    }

    // *************** Output Section: Stamp context and continue
    req.userId = userId;
    return next();
  } catch (error) {
    console.error(error.stack);

    // *************** Normalize common JWT errors into a clean 401 without leaking details
    if (error && (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError')) {
      return res.status(401).json({
        status: 'failed',
        message: 'Unauthorized: invalid or expired token.',
        data: null,
      });
    }

    // *************** Handle known application errors with consistent structure
    if (error instanceof ApiError) {
      return res.status(error.code).json({
        status: 'failed',
        message: error.message,
        data: null,
      });
    }

    // *************** Fallback for unexpected server errors without exposing internals
    return res.status(500).json({
      status: 'failed',
      message: 'Internal Server Error',
      data: null,
    });
  }
};

// *************** EXPORT MODULES ***************
module.exports = { AuthMiddleware };
