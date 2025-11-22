// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');
const { ComputeTFIDFInternships } = require('../utils/TFIDF');

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


// *************** EXPORT MODULES ***************
module.exports = {
  TriggerFunctionManually,
};
