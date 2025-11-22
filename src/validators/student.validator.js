// *************** IMPORT LIBRARIES ***************
const Joi = require('joi');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');

/**
 * ValidateUpdateStudentInput
 * Validates the payload for updating a student profile using Joi.
 *
 * Validates (all optional):
 * - major: string
 * - desired_roles: array of strings
 * - interests: array of strings
 * - preferred_industries: array of strings
 * - preferred_locations: array of strings
 * - skills: array of strings
 * - preferred_work_modes: array of strings, each one of "onsite" | "remote" | "hybrid"
 * - education_level: string
 *
 * On validation failure, throws an ApiError with the Joi error message.
 *
 * @param {Object} params - Student update payload.
 * @param {string} [params.major] - Student major or field of study.
 * @param {string[]} [params.desired_roles] - Desired roles for internships/jobs.
 * @param {string[]} [params.interests] - Interest areas of the student.
 * @param {string[]} [params.preferred_industries] - Preferred industries.
 * @param {string[]} [params.preferred_locations] - Preferred locations.
 * @param {string[]} [params.skills] - Skills the student has.
 * @param {string[]} [params.preferred_work_modes] - Preferred work modes ("onsite", "remote", "hybrid").
 * @param {string} [params.education_level] - Current education level.
 * @throws {ApiError} 400 - If validation fails.
 * @returns {void}
 */
function ValidateUpdateStudentInput({
  major,
  desired_roles,
  interests, 
  preferred_industries,
  preferred_locations,
  skills,
  preferred_work_modes,
  education_level,
}) {
  // *************** Define Joi schema for student update payload (all fields optional)
  const schema = Joi.object({
    major: Joi.string().trim().optional().messages({
      'string.base': 'Major should be a string',
      'string.empty': 'Major cannot be an empty field',
    }),
    desired_roles: Joi.array().items(Joi.string().trim()).optional().messages({
      'array.base': 'Desired roles should be an array',
      'string.base': 'Each desired role should be a string',
    }),
    interests: Joi.array().items(Joi.string().trim()).optional().messages({
      'array.base': 'Interests should be an array',
      'string.base': 'Each interest should be a string',
    }),
    preferred_industries: Joi.array().items(Joi.string().trim()).optional().messages({
      'array.base': 'Preferred industries should be an array',
      'string.base': 'Each preferred industry should be a string',
    }),
    preferred_locations: Joi.array().items(Joi.string().trim()).optional().messages({
      'array.base': 'Preferred locations should be an array',
      'string.base': 'Each preferred location should be a string',
    }),
    skills: Joi.array().items(Joi.string().trim()).optional().messages({
      'array.base': 'Skills should be an array',
      'string.base': 'Each skill should be a string',
    }),
    preferred_work_modes: Joi.array()
      .items(Joi.string().trim().allow('onsite', 'remote', 'hybrid'))
      .optional()
      .messages({
        'array.base': 'Preferred work modes should be an array',
        'string.base': 'Each preferred work mode should be a string',
        'any.only': 'Preferred work mode must be one of "onsite", "remote", or "hybrid"',
      }),
    education_level: Joi.string().trim().optional().messages({
      'string.base': 'Education level should be a string',
      'string.empty': 'Education level cannot be an empty field',
    }),
  });

  // *************** Validate input payload against schema
  const { error } = schema.validate({
    major,
    desired_roles,
    interests, 
    preferred_industries,
    preferred_locations,
    skills,
    preferred_work_modes,
    education_level,
  });

  // *************** Throw ApiError with Joi message if validation fails
  if (error) {
    throw new ApiError(400, error.message);
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  ValidateUpdateStudentInput,
  ValidateUpdateStudentInput,
};
