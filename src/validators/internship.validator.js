// *************** IMPORT LIBRARY ***************
const Joi = require('joi');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');

/**
 * Validates the input payload for searching internships.
 * @param {object} payload - The payload containing search criteria and pagination.
 * @param {string} [payload.keyword] - Optional keyword for searching internships.
 * @param {string} [payload.location] - Optional location for searching internships.
 * @param {string} [payload.work_mode] - Optional work mode for internships (e.g., 'remote', 'on-site').
 * @param {string} [payload.industry] - Optional industry for internships.
 * @param {number} payload.page - The page number for pagination.
 * @param {number} payload.limit - The number of items per page for pagination.
 * @throws {ApiError} Throws an ApiError if the payload fails validation.
 * @returns {void}
 */
function ValidateSearchInternshipInput(payload) {
  // *************** Define validation schema
  const schema = Joi.object({
    keyword: Joi.string().optional(),
    location: Joi.string().optional(),
    work_mode: Joi.string().optional(),
    industry: Joi.string().optional(),
    page: Joi.number().required(),
    limit: Joi.number().required(),
  });

  // *************** Validate the payload against the schema
  const { error } = schema.validate(payload);

  // *************** Handle validation errors
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  ValidateSearchInternshipInput,
};
