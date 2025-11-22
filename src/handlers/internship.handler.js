// *************** IMPORT LIBRARY ***************
const lodash = require('lodash');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');
const { ComputeTFIDFInternships, CalculateTFIDF, CalculateTermFrequencies, TokenizeText } = require('../utils/common-tf_idf');
const { ValidateObjectId } = require('../validators/common.validator');
const { GetSortedInternshipsByCosineSimilarity } = require('../utils/common-cosine_similarity');

// *************** IMPORT MODULES ***************
const StudentModel = require('../models/students.model');
const VectorMetaModel = require('../models/vector_meta.model');

// *************** IMPORT HELPERS ***************
const { BuildDocumentTextStudentProfile } = require('../helpers/student.helper');

// *************** GLOBAL VARIABLES ***************
const mappingFunctions = {
  ComputeTFIDFInternships,
};

/**
 * TriggerFunctionManually
 * Manually triggers a registered function by name via an HTTP request.
 *
 * Flow:
 * - Reads `name_function` from `req.body`
 * - Validates that the function name is a non-empty string
 * - Resolves the function from `mappingFunctions`
 * - Executes the mapped function (no arguments)
 * - Returns a JSON response indicating success or failure
 *
 * Error handling:
 * - Throws 400 ApiError if `name_function` is missing/invalid
 * - Throws 400 ApiError if function name is not registered in `mappingFunctions`
 * - Catches ApiError and sends structured JSON error response
 * - Catches unexpected errors and returns 500 with a generic message
 *
 * @async
 * @function TriggerFunctionManually
 * @param {import('express').Request} req - Express request object containing `name_function` in `req.body`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status and message.
 */
async function TriggerFunctionManually(req, res) {
  try {
    // *************** Extract input parameters from request
    const { name_function } = req.body;

    // *************** Validate input parameters
    if (!name_function || typeof name_function !== 'string') {
      throw new ApiError(400, 'Function name is required and must be a string.');
    }

    // *************** Map function names to actual implementations
    const functionToExecute = mappingFunctions[name_function];

    // *************** Handle unknown function names
    if (!functionToExecute) {
      throw new ApiError(400, `Function '${name_function}' is not recognized.`);
    }

    // *************** Execute the mapped function
    await functionToExecute();

    // *************** Send success response
    const responsePayload = {
      status: 'success',
      message: `Function '${name_function}' executed successfully.`,
      data: null,
    };

    // *************** Return the response
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
 * GetRecommendationInternshipsBasedProfile
 * Retrieves internship recommendations for a specific student based on their profile using TF-IDF and cosine similarity.
 *
 * Flow:
 * - Extracts `student_id` from request parameters.
 * - Validates the `student_id` format.
 * - Fetches the student's profile from the database.
 * - Constructs a document text from the student's profile (major, roles, interests, industries, skills, education).
 * - Tokenizes the document text.
 * - Calculates term frequencies for the tokenized text.
 * - Retrieves the latest Inverse Document Frequency (IDF) values from the database.
 * - Calculates TF-IDF values for the student's profile.
 * - Uses TF-IDF values to find and sort internships by cosine similarity.
 * - Returns a list of recommended internships.
 *
 * Error handling:
 * - Throws 400 ApiError for invalid `student_id`.
 * - Throws 404 ApiError if student profile, document text, tokenized text, term frequencies, IDF values, TF-IDF values, or sorted internships are not found.
 * - Catches ApiError and sends structured JSON error response.
 * - Catches unexpected errors and returns 500 with a generic message.
 *
 * @async
 * @function GetRecommendationInternshipsBasedProfile
 * @param {import('express').Request} req - Express request object containing `student_id` in `req.params`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and recommended internships.
 */
async function GetRecommendationInternshipsBasedProfile(req, res) {
  try {
    // *************** Extract input parameters from request
    const { student_id } = req.params;

    // *************** Validate input parameters
    ValidateObjectId(student_id, 'student_id');

    // *************** Find student profile by ID
    const studentProfile = await StudentModel.findById(student_id)
      .select('major desired_roles interests preferred_industries skills education_level')
      .lean();

    // *************** Validate student profile existence
    if (!studentProfile) {
      throw new ApiError(404, 'Student profile not found');
    }

    // *************** Build document text from student's profile
    const documentText = BuildDocumentTextStudentProfile(studentProfile);
    // *************** Validate document text
    if (!documentText || lodash.isEmpty(documentText)) {
      throw new ApiError(404, 'Document text not found');
    }

    // *************** Tokenize the document text
    const tokenizedText = TokenizeText(documentText);
    // *************** Validate tokenized text
    if (!tokenizedText || lodash.isEmpty(tokenizedText)) {
      throw new ApiError(404, 'Tokenized text not found');
    }

    // *************** Calculate term frequencies from tokenized text
    const termFrequencies = CalculateTermFrequencies(tokenizedText);
    // *************** Validate term frequencies
    if (!termFrequencies || lodash.isEmpty(termFrequencies)) {
      throw new ApiError(404, 'Term frequencies not found');
    }

    // *************** Fetch the latest IDF values for TF-IDF calculation
    const latestVectorMetaName = process.env.VECTOR_META_LATEST;
    const latestIDF = await VectorMetaModel.findOne({ name: latestVectorMetaName }).select('idf_values').lean();
    // *************** Validate latest IDF values
    if (!latestIDF) {
      throw new ApiError(404, 'Latest IDF not found');
    }

    // *************** Calculate TF-IDF values for the student's profile
    const tfidfValues = CalculateTFIDF(termFrequencies, latestIDF.idf_values);
    // *************** Validate TF-IDF values
    if (!tfidfValues || lodash.isEmpty(tfidfValues)) {
      throw new ApiError(404, 'TF-IDF values not found');
    }

    // *************** Get internships sorted by cosine similarity with student's profile
    const sortedInternships = await GetSortedInternshipsByCosineSimilarity(tfidfValues);
    // *************** Validate sorted internships
    if (!sortedInternships || lodash.isEmpty(sortedInternships)) {
      throw new ApiError(404, 'Sorted internships not found');
    }

    // *************** Prepare success response payload
    const responsePayload = {
      status: 'success',
      message: 'Internships sorted by cosine similarity',
      data: sortedInternships,
    };

    // *************** Return the success response
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
  TriggerFunctionManually,
  GetRecommendationInternshipsBasedProfile,
};
