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
const InternshipsModel = require('../models/internships.model');
const CompaniesModel = require('../models/companies.model');

// *************** IMPORT HELPERS ***************
const { BuildDocumentTextStudentProfile } = require('../helpers/student.helper');
const { ValidateSearchInternshipInput } = require('../validators/internship.validator');

// *************** IMPORT VALIDATORS ***************
const CommonValidator = require('../validators/common.validator');

// *************** IMPORT SERVICES ***************
const { GetRecommendationSearchBasedService, GetRecommendationHybridService } = require('../service/internship.service');

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
    const sortedInternships = await GetSortedInternshipsByCosineSimilarity(tfidfValues, 5);
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

/**
 * GetRecommendationSearchBased
 * Retrieves internship recommendations based on search criteria (keyword, location, work mode, industry).
 *
 * Flow:
 * - Extracts search parameters (keyword, location, work_mode, industry, page, limit) from `req.query`.
 * - Validates the extracted search parameters.
 * - Calls a service function to get the search-based recommendations.
 * - Returns a list of recommended internships.
 *
 * Error handling:
 * - Throws 400 ApiError for invalid search input.
 * - Catches ApiError and sends structured JSON error response.
 * - Catches unexpected errors and returns 500 with a generic message.
 *
 * @async
 * @function GetRecommendationSearchBased
 * @param {import('express').Request} req - Express request object containing search parameters in `req.query`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and recommended internships.
 */
async function GetRecommendationSearchBased(req, res) {
  try {
    // *************** Extract input parameters from request
    let { keyword, location, work_mode, industry, page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);

    // *************** Validate input parameters
    ValidateSearchInternshipInput({
      keyword,
      location,
      work_mode,
      industry,
      page,
      limit,
    });

    // *************** Get recommendations from the service layer
    const result = await GetRecommendationSearchBasedService({
      keyword,
      location,
      workMode: work_mode,
      industry,
      page,
      limit,
    });

    // *************** Get internship data and the pagination
    const internships = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    // *************** Prepare success response payload
    const responsePayload = {
      status: 'success',
      message: 'Internships sorted by cosine similarity', // This message might need to be updated if it's not cosine similarity for search
      data: {
        internships,
        metadata: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
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

/**
 * GetLocationInternship
 * Retrieves a list of distinct internship locations from the database.
 *
 * Flow:
 * - Queries the database to get distinct values for 'location_program'.
 * - Returns the list of unique locations.
 *
 * Error handling:
 * - Catches ApiError and sends structured JSON error response.
 * - Catches unexpected errors and returns 500 with a generic message.
 *
 * @async
 * @function GetLocationInternship
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and a list of distinct internship locations.
 */
async function GetLocationInternship(req, res) {
  try {
    const locations = await InternshipsModel.distinct('location_program');

    // *************** Prepare success response payload
    const responsePayload = {
      status: 'success',
      message: 'Locations of internships',
      data: locations,
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

/**
 * GetIndustryFieldsOfInternship
 * Retrieves a list of distinct internship industries from the database.
 *
 * Flow:
 * - Queries the database to get distinct values for 'industry_field' from the CompaniesModel.
 * - Returns the list of unique industries.
 *
 * Error handling:
 * - Catches ApiError and sends structured JSON error response.
 * - Catches unexpected errors and returns 500 with a generic message.
 *
 * @async
 * @function GetIndustryFieldsOfInternship
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and a list of distinct internship industries.
 */
async function GetIndustryFieldsOfInternship(req, res) {
  try {
    const industries = await CompaniesModel.distinct('industry_field');

    // *************** Prepare success response payload
    const responsePayload = {
      status: 'success',
      message: 'Industries of internships',
      data: industries,
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

/**
 * LikeUnlikeInternship
 * Toggles the like status of an internship for a specific student.
 * If the internship is already liked, it will be unliked (removed from the student's liked_internships).
 * If the internship is not liked, it will be liked (added to the student's liked_internships).
 *
 * Flow:
 * - Extracts `student_id` and `internship_id` from `req.params`.
 * - Validates both IDs using `CommonValidator.ValidateObjectId`.
 * - Checks if the internship is currently liked by the student.
 * - Constructs an update query (`$pull` for unlike, `$addToSet` for like).
 * - Updates the student's document in the database.
 * - Returns a success response.
 *
 * Error handling:
 * - Throws 400 ApiError for invalid object IDs.
 * - Catches ApiError and sends structured JSON error response.
 * - Catches unexpected errors and returns 500 with a generic message.
 *
 * @async
 * @function LikeUnlikeInternship
 * @param {import('express').Request} req - Express request object containing `student_id` and `internship_id` in `req.params`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and null data.
 */
async function LikeUnlikeInternship(req, res) {
  try {
    // *************** Extract the student and internship IDs from the request parameters
    const { student_id, internship_id } = req.params;


    // *************** Validate the student and internship IDs
    CommonValidator.ValidateObjectId(student_id, 'student_id');
    CommonValidator.ValidateObjectId(internship_id, 'internship_id');

    // *************** Check if the internship is already liked by the student
    const isInternshipLiked = await StudentModel.exists({
      _id: student_id,
      liked_internships: internship_id,
    });

    // *************** Prepare the update query
    let queryUpdate = {};

    // *************** If the internship is already liked, remove it from the liked_internships array
    if (isInternshipLiked) {
      queryUpdate = {
        $pull: {
          liked_internships: internship_id,
        },
      };
    } else {
      queryUpdate = {
        $addToSet: {
          liked_internships: internship_id,
        },
      };
    }

    // *************** Update the student's liked_internships array
    await StudentModel.updateOne({ _id: student_id }, queryUpdate);

    // *************** Prepare success response payload
    const responsePayload = {
      status: 'success',
      message: 'Internship liked/unliked successfully',
      data: null,
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

/**
 * GetLikedInternships
 * Retrieves a list of internships liked by a specific student.
 *
 * Flow:
 * - Extracts `student_id` from `req.params`.
 * - Validates the `student_id` using `CommonValidator.ValidateObjectId`.
 * - Queries the `StudentModel` to find the student and populate their `liked_internships`.
 * - Selects only the `liked_internships` field and excludes sensitive data like `vector` and `vector_histories` from the populated internships.
 * - Prepares a success response payload with the list of liked internships.
 * - Returns the success response.
 *
 * Error handling:
 * - Throws 400 ApiError for invalid object IDs.
 * - Catches ApiError and sends structured JSON error response.
 * - Catches unexpected errors and returns 500 with a generic message.
 *
 * @async
 * @function GetLikedInternships
 * @param {import('express').Request} req - Express request object containing `student_id` in `req.params`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and a list of liked internships.
 */
async function GetLikedInternships(req, res) {
  try {
    // *************** Extract the student ID from the request parameters
    const { student_id } = req.params;

    // *************** Validate the student ID
    CommonValidator.ValidateObjectId(student_id, 'student_id');

    // *************** Find the student and populate their liked internships
    const likedInternships = await StudentModel.findOne({ _id: student_id })
      .populate({
        path: 'liked_internships',
        select: '-vector -vector_histories',
      })
      .select('liked_internships')
      .lean();

    // *************** Extract the liked internships data, defaulting to an empty array if none found
    const likedInternshipsData = likedInternships?.liked_internships || [];

    // *************** Prepare success response payload
    const responsePayload = {
      status: 'success',
      message: 'Liked internships',
      data: likedInternshipsData,
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

/**
 * @function GetInternshipsByCompany
 * @description Retrieves all internships associated with a specific company ID.
 * @param {object} req - The Express request object, containing `company_id` in `req.params`.
 * @param {object} res - The Express response object, used to send back the list of internships or an error.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
async function GetInternshipsByCompany(req, res) {
  try {
    // *************** Extract the company ID from request parameters
    const { company_id } = req.params;

    // *************** Validate the extracted company ID to ensure it's a valid ObjectId
    CommonValidator.ValidateObjectId(company_id, 'company_id');

    // *************** Find all internships belonging to the specified company, excluding vector fields
    const internships = await InternshipsModel.find({ company: company_id }).select('-vector -vector_histories').lean();

    // *************** Prepare the success response payload with the retrieved internships
    const responsePayload = {
      status: 'success',
      message: 'Internships',
      data: internships,
    };

    // *************** Send a 200 OK response with the internships data
    return res.status(200).json(responsePayload);
  } catch (error) {
    // *************** Log the full error stack for debugging purposes
    console.error(error.stack);

    // *************** Check if the error is an instance of a custom ApiError
    if (error instanceof ApiError) {
      // *************** Prepare the error response payload for custom API errors
      const responsePayload = {
        status: 'failed',
        message: error.message,
        data: null,
      };
      // *************** Send the response with the status code from the ApiError
      return res.status(error.code).json(responsePayload);
    }

    // *************** Prepare a generic error response payload for unexpected errors
    const responsePayload = {
      status: 'failed',
      message: 'Internal Server Error',
      data: null,
    };
    // *************** Send a 500 Internal Server Error response
    return res.status(500).json(responsePayload);
  }
}

/**
 * GetInternshipById
 * Retrieves a single internship by its ID.
 *
 * @async
 * @function GetInternshipById
 * @param {import('express').Request} req - Express request object containing `internship_id` in `req.params`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and internship data.
 */
async function GetInternshipById(req, res) {
  try {
    // *************** Extract internship_id from request parameters
    const { internship_id } = req.params;
    // *************** Validate the extracted internship_id to ensure it's a valid ObjectId
    ValidateObjectId(internship_id, 'internship_id');

    // *************** Find the internship by ID, populate company details, and exclude vector fields
    const internship = await InternshipsModel.findById(internship_id).populate('company').select('-vector -vector_histories').lean();

    // *************** If no internship is found, throw an ApiError
    if (!internship) {
      throw new ApiError(404, 'Internship not found');
    }

    // *************** Send a success response with the fetched internship data
    return res.status(200).json({
      status: 'success',
      message: 'Internship details fetched successfully',
      data: internship,
    });
  } catch (error) {
    // *************** Log the full error stack for debugging purposes
    console.error(error.stack);
    // *************** Check if the error is an instance of a custom ApiError
    if (error instanceof ApiError) {
      // *************** Prepare the error response payload for custom API errors
      return res.status(error.code).json({
        status: 'failed',
        message: error.message,
        data: null,
      });
    }
    // *************** Prepare a generic error response payload for unexpected errors
    return res.status(500).json({
      status: 'failed',
      message: 'Internal Server Error',
      data: null,
    });
  }
}

/**
 * GetHybridInternshipProfileAndLikes
 * Retrieves hybrid internship recommendations based on a student's profile and liked internships.
 *
 * Flow:
 * - Extracts `student_id` from `req.params`.
 * - Validates the `student_id` using `CommonValidator.ValidateObjectId`.
 * - Calls `GetRecommendationHybridService` with the student ID to get recommendations.
 * - Prepares a success response payload with the hybrid recommendations.
 * - Returns the success response.
 *
 * Error handling:
 * - Throws 400 ApiError for invalid object IDs.
 * - Catches ApiError and sends structured JSON error response.
 * - Catches unexpected errors and returns 500 with a generic message.
 *
 * @async
 * @function GetHybridInternshipProfileAndLikes
 * @param {import('express').Request} req - Express request object containing `student_id` in `req.params`.
 * @param {import('express').Response} res - Express response object used to send JSON response.
 * @returns {Promise<void>} Sends a JSON response with status, message, and hybrid recommendation data.
 */
async function GetHybridInternshipProfileAndLikes(req, res) {
  try {
    // *************** Extract the student ID from the request parameters
    const { student_id } = req.params;

    // *************** Validate the student ID
    CommonValidator.ValidateObjectId(student_id, 'student_id');

    // *************** Call the hybrid recommendation service
    const result = await GetRecommendationHybridService({ studentId: student_id });

    // *************** Prepare success response payload
    return res.status(200).json({
      status: 'success',
      message: 'Hybrid recommendation fetched successfully',
      data: result,
    });
  } catch (error) {
    // *************** Log the full error stack for debugging
    console.error(error.stack);

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
}

// *************** EXPORT MODULES ***************
module.exports = {
  TriggerFunctionManually,
  GetRecommendationInternshipsBasedProfile,
  GetRecommendationSearchBased,
  GetLocationInternship,
  GetIndustryFieldsOfInternship,
  LikeUnlikeInternship,
  GetLikedInternships,
  GetInternshipsByCompany,
  GetInternshipById,
  GetHybridInternshipProfileAndLikes,
};
