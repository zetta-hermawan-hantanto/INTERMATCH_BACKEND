// *************** IMPORT MODULES ***************
const CompanyModel = require('../models/companies.model');

// *************** IMPORT UTILITIES ***************
const ApiError = require('../utils/common-error');

// *************** IMPORT VALIDATORS ***************
const CommonValidator = require('../validators/common.validator');

/**
 * Handles the request to retrieve a company by its ID.
 * Validates the company ID, fetches the company from the database,
 * and returns the company details or an appropriate error response.
 *
 * @param {object} req - The Express request object, containing parameters like company_id.
 * @param {object} res - The Express response object, used to send back the API response.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
async function GetCompanyById(req, res) {
  // *************** Start of try block for API request handling
  try {
    // *************** Extract company_id from request parameters
    const { company_id } = req.params;

    // *************** Validate if the company_id is a valid ObjectId
    CommonValidator.ValidateObjectId(company_id, 'company_id');

    // *************** Find the company by ID and convert the Mongoose document to a plain JavaScript object
    const company = await CompanyModel.findOne({ _id: company_id }).lean();

    // *************** Check if a company was found
    if (!company) {
      // *************** If no company is found, throw an ApiError with a 404 status
      throw new ApiError(404, 'Company not found');
    }

    // *************** Prepare the success response payload
    const responsePayload = {
      status: 'success',
      message: 'Company details',
      data: company,
    };

    // *************** Send a 200 OK response with the company details
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
 * Handles the request to retrieve all companies.
 * Fetches all company records from the database and returns them.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object, used to send back the API response.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
async function GetAllCompanies(req, res) {
  // *************** Start of try block for API request handling
  try {
    // *************** Find all companies and convert the Mongoose documents to plain JavaScript objects
    const companies = await CompanyModel.find({}).lean();

    // *************** Prepare the success response payload
    const responsePayload = {
      status: 'success',
      message: 'Companies list',
      data: companies,
    };

    // *************** Send a 200 OK response with the list of companies
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

// *************** EXPORT MODULES ***************
module.exports = {
  GetAllCompanies,
  GetCompanyById,
};
