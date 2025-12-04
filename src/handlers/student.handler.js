// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** IMPORT MODULES ***************
const StudentModel = require('../models/students.model');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');

// *************** IMPORT VALIDATORS ***************
const StudentValidator = require('../validators/student.validator');
const CommonValidator = require('../validators/common.validator');

// *************** IMPORT SERVICES ***************
const StudentService = require('../service/student.service');

/**
 * @description Retrieves a student's profile by their ID.
 * @param {object} req - The request object, containing student_id in params.
 * @param {object} res - The response object.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
async function GetStudentProfile(req, res) {
  try {
    // *************** Extract student ID from request parameters
    const { student_id } = req.params;

    // *************** Validate the extracted student ID format
    CommonValidator.ValidateObjectId(student_id, 'student_id');

    // *************** Fetch student profile using the service layer
    const studentProfile = await StudentService.GetStudentProfileService(student_id);

    // *************** Handle case where student profile is not found
    if (!studentProfile) {
      throw new ApiError(404, 'Student not found');
    }

    // *************** Build success response payload
    const responsePayload = {
      status: 'success',
      message: 'Student profile retrieved successfully',
      data: studentProfile,
    };

    // *************** Send successful response
    return res.status(200).json(responsePayload);
  } catch (error) {
    // *************** Log the full error stack for debugging
    console.error(error.stack);

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
 * UpdateStudentProfile
 * Updates a student's profile with the provided fields in the request body.
 *
 * Flow:
 * - Extracts `id` from `req.params` and validates its presence and ObjectId format.
 * - Extracts updatable fields from `req.body` into a payload object.
 * - Validates the payload using `StudentValidator.ValidateUpdateStudentInput`.
 * - Builds an update object only from non-empty payload fields.
 * - Updates the student document in MongoDB and returns the updated record.
 * - Handles known `ApiError` instances and unexpected server errors with consistent JSON responses.
 *
 * Request:
 * - Params:
 *   - id: string (MongoDB ObjectId of the student)
 * - Body (all optional, but at least one must be valid for update):
 *   - major: string
 *   - desired_roles: string[]
 *   - interests: string[]
 *   - preferred_industries: string[]
 *   - preferred_locations: string[]
 *   - skills: string[]
 *   - preferred_work_modes: string[] ("onsite" | "remote" | "hybrid")
 *   - education_level: string
 *
 * Responses:
 * - 200: { status: 'success', message, data: updatedStudent }
 * - 400: { status: 'failed', message: validation error / invalid ID / no fields }
 * - 404: { status: 'failed', message: 'Student not found' }
 * - 500: { status: 'failed', message: 'Internal Server Error' }
 *
 * @async
 * @function UpdateStudentProfile
 * @param {import('express').Request} req - Express request object containing params and body.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and data.
 * @throws {ApiError} Thrown internally and converted into a structured JSON error response.
 */
async function UpdateStudentProfile(req, res) {
  try {
    // *************** Extract and validate student ID
    const { student_id: studentId } = req.params;

    if (!studentId) {
      throw new ApiError(400, 'Student ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new ApiError(400, 'Student ID is not a valid ObjectId');
    }

    // *************** Extract updatable fields from request body
    const { major, desired_roles, interests, preferred_industries, preferred_locations, skills, preferred_work_modes, education_level } =
      req.body;

    // *************** Construct payload object
    const payload = {
      major,
      desired_roles,
      interests,
      preferred_industries,
      preferred_locations,
      skills,
      preferred_work_modes,
      education_level,
    };

    // *************** Validate payload with Joi
    StudentValidator.ValidateUpdateStudentInput(payload);

    // *************** Build update fields only from defined keys
    const updateFields = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined) return;
      updateFields[key] = value;
    });

    if (!Object.keys(updateFields).length) {
      throw new ApiError(400, 'No valid fields provided for update');
    }

    // *************** Update student in database
    const updatedStudent = await StudentModel.findByIdAndUpdate(
      studentId,
      { $set: updateFields },
      { new: true, lean: true, runValidators: true }
    );

    // dasd
    if (!updatedStudent) {
      throw new ApiError(404, 'Student not found');
    }

    // *************** Build response payload (optionally map to DTO)
    const responsePayload = {
      status: 'success',
      message: 'Student profile updated successfully',
      data: updatedStudent,
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    // *************** Log the full error stack for debugging
    console.error(error.stack);

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
 * GetLikedInternships
 * Handles the retrieval of a user's liked internships.
 *
 * Flow:
 * - Extracts userId from the request object (assumed to be set by a prior middleware)
 * - Queries the database for the user's liked internships
 * - Returns a success response with the list of liked internships
 * - Handles known errors with safe, consistent responses
 *
 * @async
 * @function GetLikedInternships
 * @param {import('express').Request} req - Express request object, expected to have `req.userId`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends JSON response with status and liked internships data.
 */
async function GetLikedInternships(req, res) {
  try {
    // *************** Extract user ID from the request object
    const { student_id } = req.params;

    // *************** Find the user and select only the 'liked_internships' field
    const likedInternships = await StudentModel.findById(student_id).select('liked_internships').lean();

    // *************** Send successful response with the liked internships data
    return res.status(200).json({
      status: 'success',
      data: likedInternships || [],
    });
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
 * GetProfileCompleteness
 *
 * @description
 * Calculates and returns the completeness percentage of a student's profile.
 * The profile completeness is based on specific fields being filled out by the student.
 *
 * Flow:
 * - Validates the student_id parameter.
 * - Fetches the required profile fields.
 * - Computes a score based on presence of each field.
 * - Calculates completeness percentage and returns it.
 * - Handles known and unknown errors with standardized responses.
 *
 * @async
 * @function
 * @param {import('express').Request} req - Express request object, expects `student_id` in params.
 * @param {import('express').Response} res - Express response object used to return JSON.
 * @returns {Promise<void>} Sends JSON with status and profile completeness percentage.
 */
async function GetProfileCompleteness(req, res) {
  try {
    // *************** Extract student_id from request parameters
    const { student_id } = req.params;

    // *************** Validate student_id is a valid ObjectId
    CommonValidator.ValidateObjectId(student_id, 'student_id');

    // *************** Fetch relevant profile fields for completeness calculation
    const studentProfile = await StudentModel.findById(student_id)
      .select('major desired_roles interests preferred_industries preferred_locations skills preferred_work_modes education_level')
      .lean();

    // *************** If student profile does not exist, throw not found error
    if (!studentProfile) {
      throw new ApiError(404, 'Student profile not found');
    }

    // *************** Prepare mapping for fields: 1 if present (non-empty), 0 if absent
    const profileCompleteness = {
      major: studentProfile.major ? 1 : 0,
      desired_roles: studentProfile.desired_roles && studentProfile.desired_roles.length ? 1 : 0,
      interests: studentProfile.interests && studentProfile.interests.length ? 1 : 0,
      preferred_industries: studentProfile.preferred_industries && studentProfile.preferred_industries.length ? 1 : 0,
      preferred_locations: studentProfile.preferred_locations && studentProfile.preferred_locations.length ? 1 : 0,
      skills: studentProfile.skills && studentProfile.skills.length ? 1 : 0,
      preferred_work_modes: studentProfile.preferred_work_modes && studentProfile.preferred_work_modes.length ? 1 : 0,
      education_level: studentProfile.education_level ? 1 : 0,
    };

    // *************** Aggregate the number of completed fields and total fields
    const profileCompletenessValue = Object.values(profileCompleteness).reduce((acc, curr) => acc + curr, 0);
    const profileCompletenessLength = Object.keys(profileCompleteness).length;

    // *************** Calculate the completeness percentage
    const profileCompletenessPercentage = (profileCompletenessValue / profileCompletenessLength) * 100;

    // *************** Send the calculated completeness as a successful response
    return res.status(200).json({
      status: 'success',
      message: 'Profile completeness retrieved successfully',
      data: {
        profile_completeness: profileCompletenessPercentage,
      },
    });
  } catch (error) {
    // *************** Log the full error stack for debugging
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
  UpdateStudentProfile,
  GetStudentProfile,
  GetLikedInternships,
  GetProfileCompleteness,
};
