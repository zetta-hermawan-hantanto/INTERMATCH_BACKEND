// *************** IMPORT LIBRARY ***************
const lodash = require('lodash');

// *************** IMPORT MODULES ***************
const InternshipModel = require('../models/internships.model');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('./common-error');

/**
 * Builds a comprehensive vocabulary from the terms present in the origin TF-IDF values and all internship vectors.
 * @param {Object} tfIdfValuesOrigin - The TF-IDF values of the origin text (e.g., user profile or search query).
 * @param {Array<Object>} internships - An array of internship objects, each containing a `vector.value` property with TF-IDF values.
 * @returns {Array<string>} An array of unique terms representing the combined vocabulary.
 */
function BuildVocabulary(tfIdfValuesOrigin, internships) {
  // *************** Initialize vocabulary set
  const vocabulary = new Set();

  // *************** add student terms
  Object.keys(tfIdfValuesOrigin).forEach((term) => vocabulary.add(term));

  // *************** add internship terms
  internships.forEach((doc) => {
    Object.keys(doc.vector.value).forEach((term) => vocabulary.add(term));
  });

  // *************** final vocabulary array
  const vocab = Array.from(vocabulary);

  // *************** Return the vocabulary array
  return vocab;
}

/**
 * Builds a vector representation of TF-IDF values based on a given vocabulary.
 * Terms not present in the TF-IDF object will have a value of 0 in the vector.
 * @param {Object} tfidf - An object where keys are terms and values are their TF-IDF scores.
 * @param {Array<string>} vocab - An array of terms representing the vocabulary order for the vector.
 * @returns {Array<number>} A numerical vector where each element corresponds to a term in the vocabulary.
 */
function BuildVector(tfidf, vocab) {
  // *************** Initialize vector array
  const vector = [];

  // *************** Build vector
  for (const term of vocab) {
    vector.push(tfidf[term] || 0);
  }

  // *************** Return the vector
  return vector;
}

/**
 * Calculates the dot product of two normalized vectors.
 * @param {number[]} originVectorNormalized - The first normalized vector (e.g., origin vector).
 * @param {number[]} internshipVectorNormalized - The second normalized vector (e.g., internship vector).
 * @returns {number} The dot product of the two vectors.
 */
function CalculateDotProduct(originVectorNormalized, internshipVectorNormalized) {
  // *************** Initialize dot product variable
  let dotProduct = 0;

  // *************** Calculate dot product
  for (let index = 0; index < originVectorNormalized.length; index++) {
    dotProduct += originVectorNormalized[index] * internshipVectorNormalized[index];
  }

  // *************** Return the dot product
  return dotProduct;
}

/**
 * Calculates the magnitude of a vector.
 * @param {number[]} vectorNormalized - The vector for which to calculate the magnitude.
 * @returns {number} The magnitude of the vector.
 */
function CalculateMagnitude(vectorNormalized) {
  // *************** Initialize magnitude variable
  let magnitude = 0;

  // *************** Calculate magnitude
  for (let index = 0; index < vectorNormalized.length; index++) {
    magnitude += vectorNormalized[index] * vectorNormalized[index];
  }

  // *************** Calculate the square root of the magnitude
  const squareMagnitude = Math.sqrt(magnitude);

  // *************** Return the square root of the magnitude
  return squareMagnitude;
}

/**
 * Retrieves and sorts internships based on cosine similarity with the provided origin TF-IDF values.
 * @param {Object} tfIdfValuesOrigin - The TF-IDF values of the origin text (e.g., user profile or search query).
 * @returns {Promise<Array>} A promise that resolves to an array of internships sorted by cosine similarity score.
 */
async function GetSortedInternshipsByCosineSimilarity(tfIdfValuesOrigin, totalDoc) {
  try {
    // *************** Validate tfIdfValuesOrigin parameter
    if (!tfIdfValuesOrigin || lodash.isEmpty(tfIdfValuesOrigin)) {
      throw new ApiError(400, 'Invalid tfIdfValuesOrigin parameter provided');
    }

    // *************** Retrieve all internships from the database
    const internships = await InternshipModel.find({}).lean();

    // *************** Initialize array to store internships with similarity scores
    const internshipsWithScore = [];

    // *************** Build vocabulary from origin and internships
    const vocabulary = BuildVocabulary(tfIdfValuesOrigin, internships);

    // *************** Build origin vector and calculate its magnitude
    const originVectorNormalized = BuildVector(tfIdfValuesOrigin, vocabulary);
    const magnitudeOrigin = CalculateMagnitude(originVectorNormalized);

    // *************** Calculate cosine similarity for each internship
    for (const internship of internships) {
      // *************** Get internship vector
      const internshipVector = internship.vector.value;

      // *************** Build internship vector
      const internshipVectorNormalized = BuildVector(internshipVector, vocabulary);

      // *************** Calculate dot product of normalized vectors
      const dotProduct = CalculateDotProduct(originVectorNormalized, internshipVectorNormalized);

      // *************** Calculate magnitude of normalized vectors
      const magnitudeInternship = CalculateMagnitude(internshipVectorNormalized);

      // *************** Calculate total magnitude
      const totalMagnitude = magnitudeOrigin * magnitudeInternship;

      // *************** Calculate cosine similarity score
      const cosineSimilarity = dotProduct / totalMagnitude;
      const result = cosineSimilarity || 0;

      // *************** Add internship with score to the array
      internshipsWithScore.push({
        _id: internship._id,
        title: internship.title,
        description: internship.description,
        requirements: internship.requirements,
        score: result,
      });
    }

    // *************** Sort internships by score in descending order and limit to 10
    const sortedInternships = internshipsWithScore.sort((document1, document2) => document2.score - document1.score).slice(0, totalDoc);

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
