// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');

/**
 * Validates if a given string is a valid MongoDB ObjectId.
 * Throws an ApiError if the ObjectId is invalid.
 * @param {string} mongoId - The string to validate as a MongoDB ObjectId.
 * @param {string} fieldName - The name of the field being validated, used in the error message.
 * @throws {ApiError} If the mongoId is not a valid ObjectId.
 */
function ValidateObjectId(mongoId, fieldName) {
  // *************** Validate if the provided ID is a valid MongoDB ObjectId
  const isValid = mongoose.isValidObjectId(mongoId);

  // *************** If the ID is not valid, throw an ApiError
  if (!isValid) {
    throw new ApiError(400, `${fieldName} is not valid`);
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  ValidateObjectId,
};
