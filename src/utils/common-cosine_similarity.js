// *************** IMPORT LIBRARY ***************
const lodash = require('lodash');

// *************** IMPORT MODULES ***************
const InternshipModel = require('../models/internships.model');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('./common-error');

/**
 * Normalize both vectors to have the same keys
 * @param {Object} tfIdfValuesOrigin
 * @param {Object} tfIdfValuesInternship
 * @returns {Object}
 */
function NormalizeVectorBoth(tfIdfValuesOrigin, tfIdfValuesInternship) {
  try {
    // *************** Validate tfIdfValuesOrigin parameter
    if (!tfIdfValuesOrigin || lodash.isEmpty(tfIdfValuesOrigin)) {
      throw new ApiError(400, 'Invalid tfIdfValuesOrigin or tfIdfValuesInternship parameter provided');
    }

    // *************** Validate tfIdfValuesInternship parameter
    if (!tfIdfValuesInternship || lodash.isEmpty(tfIdfValuesInternship)) {
      throw new ApiError(400, 'Invalid tfIdfValuesOrigin or tfIdfValuesInternship parameter provided');
    }

    // *************** Initialize objects to store normalized TF-IDF values
    const tfIdfValuesOriginNormalized = {};
    const tfIdfValuesInternshipNormalized = {};

    // *************** Normalize tfIdfValuesOrigin based on keys present in tfIdfValuesInternship
    for (const key in tfIdfValuesOrigin) {
      if (tfIdfValuesInternship.hasOwnProperty(key)) {
        tfIdfValuesOriginNormalized[key] = tfIdfValuesOrigin[key];
      } else {
        tfIdfValuesOriginNormalized[key] = 0;
      }
    }

    // *************** Normalize tfIdfValuesInternship based on keys present in tfIdfValuesOrigin
    for (const key in tfIdfValuesInternship) {
      if (tfIdfValuesOrigin.hasOwnProperty(key)) {
        tfIdfValuesInternshipNormalized[key] = tfIdfValuesInternship[key];
      } else {
        tfIdfValuesInternshipNormalized[key] = 0;
      }
    }

    // *************** Return both normalized vectors
    return { tfIdfValuesOriginNormalized, tfIdfValuesInternshipNormalized };
  } catch (error) {
    // *************** Log and re-throw any errors encountered during normalization
    console.log(error.stack);

    throw error;
  }
}

/**
 * Calculates the dot product of two normalized TF-IDF vectors.
 * @param {Object} tfIdfValuesOriginNormalized - The normalized TF-IDF values of the origin text.
 * @param {Object} tfIdfValuesInternshipNormalized - The normalized TF-IDF values of the internship text.
 * @returns {number} The dot product of the two vectors.
 */
function CalculateDotProduct(tfIdfValuesOriginNormalized, tfIdfValuesInternshipNormalized) {
  try {
    // *************** Validate tfIdfValuesOriginNormalized parameter
    if (!tfIdfValuesOriginNormalized || lodash.isEmpty(tfIdfValuesOriginNormalized)) {
      throw new ApiError(400, 'Invalid tfIdfValuesOriginNormalized parameter provided');
    }

    // *************** Validate tfIdfValuesInternshipNormalized parameter
    if (!tfIdfValuesInternshipNormalized || lodash.isEmpty(tfIdfValuesInternshipNormalized)) {
      throw new ApiError(400, 'Invalid tfIdfValuesInternshipNormalized parameter provided');
    }

    // *************** Initialize dot product variable
    let dotProduct = 0;

    // *************** Calculate dot product by iterating through keys
    for (const key in tfIdfValuesOriginNormalized) {
      if (tfIdfValuesInternshipNormalized.hasOwnProperty(key)) {
        dotProduct += tfIdfValuesOriginNormalized[key] * tfIdfValuesInternshipNormalized[key];
      }
    }

    // *************** Return the calculated dot product
    return dotProduct;
  } catch (error) {
    // *************** Log and re-throw any errors encountered during calculation
    console.log(error.stack);

    throw error;
  }
}

/**
 * Calculates the magnitude of a normalized TF-IDF vector.
 * @param {Object} tfIdfValuesNormalized - The normalized TF-IDF values.
 * @returns {number} The magnitude of the vector.
 */
function CalculateMagnitude(tfIdfValuesNormalized) {
  try {
    // *************** Validate tfIdfValuesNormalized parameter
    if (!tfIdfValuesNormalized || lodash.isEmpty(tfIdfValuesNormalized)) {
      throw new ApiError(400, 'Invalid tfIdfValuesNormalized parameter provided');
    }

    // *************** Initialize magnitude variable
    let magnitude = 0;

    // *************** Calculate magnitude by summing squared values
    for (const key in tfIdfValuesNormalized) {
      if (tfIdfValuesNormalized.hasOwnProperty(key)) {
        magnitude += tfIdfValuesNormalized[key] * tfIdfValuesNormalized[key];
      }
    }

    // *************** Calculate the square root of the magnitude
    const SquaredMagnitude = Math.sqrt(magnitude);

    // *************** Return the square root of the magnitude
    return SquaredMagnitude;
  } catch (error) {
    // *************** Log error
    console.log(error.stack);

    // *************** Re-throw error
    throw error;
  }
}

/**
 * Retrieves and sorts internships based on cosine similarity with the provided origin TF-IDF values.
 * @param {Object} tfIdfValuesOrigin - The TF-IDF values of the origin text (e.g., user profile or search query).
 * @returns {Promise<Array>} A promise that resolves to an array of internships sorted by cosine similarity score.
 */
async function GetSortedInternshipsByCosineSimilarity(tfIdfValuesOrigin) {
  try {
    // *************** Validate tfIdfValuesOrigin parameter
    if (!tfIdfValuesOrigin || lodash.isEmpty(tfIdfValuesOrigin)) {
      throw new ApiError(400, 'Invalid tfIdfValuesOrigin parameter provided');
    }

    // *************** Retrieve all internships from the database
    const internships = await InternshipModel.find({}).lean();

    // *************** Initialize array to store internships with similarity scores
    const internshipsWithScore = [];

    // *************** Calculate cosine similarity for each internship
    for (const internship of internships) {
      // *************** Normalize vectors for both origin and internship
      const { tfIdfValuesOriginNormalized, tfIdfValuesInternshipNormalized } = NormalizeVectorBoth(tfIdfValuesOrigin, internship.vector);

      // *************** Calculate dot product of normalized vectors
      const dotProduct = CalculateDotProduct(tfIdfValuesOriginNormalized, tfIdfValuesInternshipNormalized);

      // *************** Calculate magnitude of normalized vectors
      const magnitudeOrigin = CalculateMagnitude(tfIdfValuesOriginNormalized);
      const magnitudeInternship = CalculateMagnitude(tfIdfValuesInternshipNormalized);

      // *************** Calculate cosine similarity score
      const cosineSimilarity = dotProduct / (magnitudeOrigin * magnitudeInternship);

      // *************** Add internship with score to the array
      internshipsWithScore.push({
        ...internship,
        score: cosineSimilarity,
      });
    }

    // *************** Sort internships by score in descending order
    const sortedInternships = internshipsWithScore.sort((document1, document2) => document2.score - document1.score);

    // *************** Return the sorted array of internships
    return sortedInternships;
  } catch (error) {
    // *************** Log error
    console.log(error.stack);

    // *************** Re-throw error
    throw error;
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  GetSortedInternshipsByCosineSimilarity,
};
