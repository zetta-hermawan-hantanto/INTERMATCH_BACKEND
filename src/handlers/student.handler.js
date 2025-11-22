// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** IMPORT MODULES ***************
const StudentModel = require('../models/students.model');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');

// *************** IMPORT VALIDATORS ***************
const StudentValidator = require('../validators/student.validator');

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
    const { id: studentId } = req.params;

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

// *************** EXPORT MODULES ***************
module.exports = {
  UpdateStudentProfile,
};
