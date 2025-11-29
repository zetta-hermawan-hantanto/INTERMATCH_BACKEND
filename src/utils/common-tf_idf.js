// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');

// *************** IMPORT MODULES ***************
const InternshipModel = require('../models/internships.model');
const VectorMetaModel = require('../models/vector_meta.model');
const CompanyModel = require('../models/companies.model');

// *************** IMPORT GLOBALS ***************
const { STOP_WORD_SET } = require('./common-global');

/**
 * BuildDocumentText
 * Builds a normalized text string from internship and company fields
 * to be used as a document for TF-IDF.
 *
 * Collects title, role, industry_field, tags, skills, requirements,
 * education levels, responsibilities, and description into a single
 * cleaned, lowercased string.
 *
 * @param {Object} internship - Internship document containing descriptive fields.
 * @param {string} [internship.title] - Internship title.
 * @param {string} [internship.role] - Internship role/title.
 * @param {string[]} [internship.tags] - Tags related to the internship.
 * @param {string[]} [internship.skills] - Skills required or preferred.
 * @param {string[]} [internship.requirements] - Requirements for applicants.
 * @param {string[]} [internship.education_levels] - Required education levels.
 * @param {string[]} [internship.responsibilities] - Main responsibilities.
 * @param {string} [internship.description] - Free text description.
 * @param {Object} company - Company document related to the internship.
 * @param {string} [company.industry_field] - Company industry/field.
 * @returns {string} Normalized, space-joined, lowercased document text.
 * @throws {Error} If internship or company object is invalid.
 */
function BuildDocumentText(internship, company) {
  try {
    // *************** Validate input internship object
    if (!internship || typeof internship !== 'object') {
      throw new Error('Invalid internship object provided.');
    }

    // *************** Validate input company object
    if (!company || typeof company !== 'object') {
      throw new Error('Invalid company object provided.');
    }

    // *************** Safe extract array fields
    const requirements = Array.isArray(internship.requirements) ? internship.requirements : [];
    const skills = Array.isArray(internship.skills) ? internship.skills : [];
    const tags = Array.isArray(internship.tags) ? internship.tags : [];
    const educationLevels = Array.isArray(internship.education_levels) ? internship.education_levels : [];
    const responsibilities = Array.isArray(internship.responsibilities) ? internship.responsibilities : [];

    const description = internship.description || '';

    // *************** Collect all relevant fields into array of strings
    const fields = [
      internship.title || '',
      internship.role || '',
      company?.industry_field || '',
      ...tags,
      ...skills,
      ...requirements,
      ...educationLevels,
      ...responsibilities,
      description,
    ];

    // *************** Normalize: remove empty, trim, join
    const text = fields
      .filter(Boolean)
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return text;
  } catch (error) {
    // *************** Log and rethrow any errors encountered
    console.log(error.stack);

    // *************** Rethrow the error to be handled by the caller
    throw error;
  }
}

/**
 * TokenizeText
 * Tokenizes a normalized text string into tokens and removes stop words.
 *
 * Splits on whitespace and filters out empty tokens and any token
 * that exists in the STOP_WORD_SET.
 *
 * @param {string} text - Cleaned document text to tokenize.
 * @returns {string[]} Array of tokens with stop words removed.
 */
function TokenizeText(text) {
  try {
    // *************** Handle empty or non-string input
    if (typeof text !== 'string' || !text.length) {
      return [];
    }

    // *************** Split text into tokens based on whitespace and remove stop words
    const tokenizedText = text.split(/\s+/).filter((token) => {
      // *************** Normalize token
      const normalizedToken = token.trim();

      // *************** Remove empty tokens
      if (!normalizedToken) return false;

      // *************** Remove stop words
      if (STOP_WORD_SET.has(normalizedToken)) return false;

      // *************** Remove 1–2 length tokens
      if (normalizedToken.length <= 2) return false;

      // *************** Remove numbers
      if (/^[0-9]+(\.[0-9]+)?$/.test(normalizedToken)) return false;

      // *************** Return true if token passes all filters
      return true;
    });

    // *************** Return the array of tokens
    return tokenizedText;
  } catch (error) {
    // *************** Log and rethrow any errors encountered
    console.log(error.stack);
    // *************** Rethrow the error to be handled by the caller
    throw error;
  }
}

/**
 * CalculateTermFrequencies
 * Builds a term frequency (TF) map from an array of tokens.
 *
 * Each token is counted and the result is an object where
 * keys are terms and values are their counts in the document.
 *
 * @param {string[]} tokens - Array of tokens for a single document.
 * @returns {Object.<string, number>} Term frequency map for the document.
 */
function CalculateTermFrequencies(tokens) {
  try {
    // *************** Handle empty token array
    if (!Array.isArray(tokens) || !tokens.length) {
      return {};
    }

    // *************** Initialize term frequency map
    const termFrequencies = {};

    // *************** Count occurrences of each token
    tokens.forEach((token) => {
      if (termFrequencies[token]) {
        termFrequencies[token] += 1;
      } else {
        termFrequencies[token] = 1;
      }
    });

    // *************** Return the term frequency map
    return termFrequencies;
  } catch (error) {
    // *************** Log and rethrow any errors encountered
    console.log(error.stack);

    // *************** Rethrow the error to be handled by the caller
    throw error;
  }
}

/**
 * CalculateDocumentFrequencies
 * Computes document frequency (DF) for all terms across multiple documents.
 *
 * For each document, each unique token is counted once toward its DF.
 * Result is an object where keys are terms and values are the number
 * of documents in which the term appears.
 *
 * @param {string[][]} allDocumentTokens - Array of token arrays, one per document.
 * @returns {Object.<string, number>} Document frequency map across all documents.
 */
function CalculateDocumentFrequencies(allDocumentTokens) {
  try {
    // *************** Handle empty input array
    if (!Array.isArray(allDocumentTokens) || !allDocumentTokens.length) {
      return {};
    }

    // *************** Initialize document frequency map
    const documentFrequencies = {};

    // *************** Iterate over each document's tokens
    for (const tokens of allDocumentTokens) {
      // *************** Use a Set to count each token only once per document
      const uniqueTokens = new Set(tokens);

      // *************** Update document frequency counts
      uniqueTokens.forEach((token) => {
        if (documentFrequencies[token]) {
          documentFrequencies[token] += 1;
        } else {
          documentFrequencies[token] = 1;
        }
      });
    }

    // *************** Return the document frequency map
    return documentFrequencies;
  } catch (error) {
    // *************** Log the error stack for debugging
    console.log(error.stack);

    // *************** Rethrow the error to be handled by the caller
    throw error;
  }
}

/**
 * CalculateInverseDocumentFrequencies
 * Computes inverse document frequency (IDF) for each term.
 *
 * Uses the formula: IDF(term) = ln(totalDocuments / documentFrequency(term)).
 *
 * @param {Object.<string, number>} documentFrequencies - DF map for all terms.
 * @param {number} totalDocuments - Total number of documents.
 * @returns {Object.<string, number>} IDF map where keys are terms and values are IDF scores.
 * @throws {Error} If totalDocuments is not a positive number.
 */
function CalculateInverseDocumentFrequencies(documentFrequencies, totalDocuments) {
  try {
    // *************** Handle empty document frequencies
    if (!documentFrequencies || typeof documentFrequencies !== 'object') {
      return {};
    }

    // *************** Handle invalid total documents count
    if (typeof totalDocuments !== 'number' || totalDocuments <= 0) {
      throw new Error('Total documents must be a positive number.');
    }

    // *************** Initialize inverse document frequency map
    const inverseDocumentFrequencies = {};

    // *************** Calculate IDF for each term
    for (const [term, docFreq] of Object.entries(documentFrequencies)) {
      inverseDocumentFrequencies[term] = Math.log(totalDocuments / docFreq);
    }

    // *************** Return the inverse document frequency map
    return inverseDocumentFrequencies;
  } catch (error) {
    // *************** Log the error stack for debugging
    console.log(error.stack);
    // *************** Rethrow the error to be handled by the caller
    throw error;
  }
}

/**
 * CalculateTFIDF
 * Computes TF-IDF values for all terms in a single document.
 *
 * For each term in termFrequencies, multiplies TF(term) by
 * IDF(term) from the inverseDocumentFrequencies map.
 *
 * @param {Object.<string, number>} termFrequencies - TF map for a single document.
 * @param {Object.<string, number>} inverseDocumentFrequencies - IDF map for all terms.
 * @returns {Object.<string, number>} TF-IDF map for the document.
 */
function CalculateTFIDF(termFrequencies, inverseDocumentFrequencies) {
  try {
    // *************** Handle empty term frequencies
    if (!termFrequencies || typeof termFrequencies !== 'object') {
      return {};
    }

    // *************** Handle empty inverse document frequencies
    if (!inverseDocumentFrequencies || typeof inverseDocumentFrequencies !== 'object') {
      return {};
    }

    // *************** Initialize TF-IDF map
    const tfidfValues = {};

    // *************** Calculate TF-IDF for each term in term frequencies
    for (const [term, termFreq] of Object.entries(termFrequencies)) {
      // *************** Get the corresponding IDF value
      const idf = inverseDocumentFrequencies[term];

      // *************** Skip terms without IDF value
      if (!idf) continue;

      // *************** Calculate TF-IDF value
      tfidfValues[term] = termFreq * idf;
    }

    // *************** Return the TF-IDF map
    return tfidfValues;
  } catch (error) {
    // *************** Log the error stack for debugging
    console.log(error.stack);

    // *************** Rethrow the error to be handled by the caller
    throw error;
  }
}

/**
 * ComputeTFIDFInternships
 * Computes TF-IDF vectors for all active internships and stores them.
 *
 * Steps:
 * - Fetches all active internships and populates `company`.
 * - Builds normalized document text for each internship.
 * - Tokenizes text, removes stop words, and computes term frequencies.
 * - Computes document frequencies and IDF across all internships.
 * - Stores vector metadata (vocabulary + IDF values) in VectorMetaModel.
 * - Computes TF-IDF vector for each internship and bulk-updates InternshipModel
 *   with `vector` and appends to `vector_histories`.
 *
 * @async
 * @function ComputeTFIDFInternships
 * @returns {Promise<string>} Success message when TF-IDF computation and storage complete.
 * @throws {Error} If no active internships are found or a database error occurs.
 */
async function ComputeTFIDFInternships() {
  try {
    // *************** Fetch all active internships from the database
    const internships = await InternshipModel.find({ status: 'active' })
      .populate([
        {
          path: 'company',
        },
      ])
      .lean();

    // *************** Ensure there are active internships to process
    if (!internships || !internships.length) {
      throw new Error('No active internships found for TF-IDF computation.');
    }

    // *************** Store all document tokens for document frequency calculation
    const allDocumentTokens = [];

    // *************** Store term frequencies for each document
    const allDocumentTermFrequencies = [];

    // *************** Process each internship to build document texts
    for (const internship of internships) {
      // *************** Safely extract the company data
      const company = internship.company || {};

      // *************** Build the document text for TF-IDF
      const documentText = BuildDocumentText(internship, company);

      // *************** Clean the document text: lowercase, remove non-alphanumeric, trim
      const cleanedDocumentText = documentText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // *************** Tokenize the cleaned document text
      const tokenizedText = TokenizeText(cleanedDocumentText);

      // *************** Calculate term frequencies for the cleaned document text
      const termFrequencies = CalculateTermFrequencies(tokenizedText);

      // *************** Store tokens for later document frequency calculation
      allDocumentTokens.push(tokenizedText);

      // *************** Store term frequencies for this document
      allDocumentTermFrequencies.push({
        internshipId: internship._id,
        termFrequencies,
      });
    }

    // *************** Calculate document frequencies across all documents
    const documentFrequencies = CalculateDocumentFrequencies(allDocumentTokens);

    // *************** Calculate total number of documents
    const totalDocuments = internships.length;

    // *************** Calculate inverse document frequencies
    const inverseDocumentFrequencies = CalculateInverseDocumentFrequencies(documentFrequencies, totalDocuments);

    // *************** Prepare vector metadata for storage
    const vectorMetaData = {
      name: 'internship_v1',
      idf_values: inverseDocumentFrequencies,
    };

    // *************** Store the vector metadata in the database
    await VectorMetaModel.create(vectorMetaData);

    // *************** Prepare bulk operations for internship TF-IDF vectors
    const bulkOperations = [];

    // *************** Calculate and store TF-IDF vectors for each internship
    for (const docTermFreq of allDocumentTermFrequencies) {
      // *************** Destructure internship ID and term frequencies
      const { internshipId, termFrequencies } = docTermFreq;

      // *************** Calculate TF-IDF values for the internship
      const tfidfValues = CalculateTFIDF(termFrequencies, inverseDocumentFrequencies);

      // *************** Prepare the bulk update operation
      const vector = {
        index: 'internship_v1',
        value: tfidfValues,
      };

      // *************** Add the update operation to the bulk operations array
      bulkOperations.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(internshipId) },
          update: {
            $set: { vector },
            $push: { vector_histories: { status: 'active', vector, created_at: new Date() } },
          },
        },
      });
    }

    // *************** Execute the bulk update operations
    if (bulkOperations.length) {
      await InternshipModel.bulkWrite(bulkOperations);
    }

    // *************** Return success message
    return 'TF-IDF computation and storage completed successfully.';
  } catch (error) {
    // *************** Log the error stack for debugging
    console.log(error.stack);

    // *************** Rethrow the error to be handled by the caller
    throw error;
  }
}

/**
 * Calculates the average TF-IDF values across multiple TF-IDF vectors.
 * This function takes an array of TF-IDF objects (where each object maps terms to their TF-IDF scores)
 * and computes the average score for each term across all provided vectors.
 *
 * @function AverageTFIDF
 * @param {Array<Object.<string, number>>} allTfIdfValues - An array of TF-IDF objects. Each object represents a document's TF-IDF vector,
 *                                                          mapping terms (strings) to their TF-IDF scores (numbers).
 * @returns {Promise<Object.<string, number>>} A promise that resolves to an object containing the average TF-IDF scores for each term.
 *                                              Returns an empty object if `allTfIdfValues` is empty or null.
 * @throws {Error} If an error occurs during the averaging process.
 */
function AverageTFIDF(allTfIdfValues) {
  try {
    // *************** Handle empty or null input array
    if (!allTfIdfValues || !allTfIdfValues.length) {
      return {};
    }

    // *************** Get the total number of TF-IDF vectors for averaging
    const totalLength = allTfIdfValues.length;

    // *************** Initialize an object to accumulate TF-IDF sums for each term
    const tfIdfAverage = {};

    // *************** Iterate through each TF-IDF vector in the input array
    for (const tfIdfValue of allTfIdfValues) {
      // *************** Iterate through each term and its TF-IDF score in the current vector
      for (const [term, value] of Object.entries(tfIdfValue)) {
        // *************** Accumulate the TF-IDF score for the current term
        if (tfIdfAverage[term]) {
          tfIdfAverage[term] += value;
        } else {
          // *************** If the term is encountered for the first time, initialize its sum
          tfIdfAverage[term] = value;
        }
      }
    }

    // *************** Divide the accumulated sum of each term by the total number of vectors to get the average
    for (const term in tfIdfAverage) {
      tfIdfAverage[term] /= totalLength;
    }

    // *************** Return the object containing the average TF-IDF scores
    return tfIdfAverage;
  } catch (error) {
    // *************** Log the error stack for debugging purposes
    console.log(error.stack);

    // *************** Re-throw the error to be handled by the caller
    throw error;
  }
}

/**
 * Calculates a combined TF-IDF vector by weighting a student's profile TF-IDF with a combined TF-IDF from liked internships.
 * The weighting factor (alpha) adjusts based on the number of liked internships, giving more weight to the student profile
 * when fewer internships are liked, and more weight to liked internships as their count increases.
 *
 * @param {Object.<string, number>} tfIdfStudentProfile - An object representing the TF-IDF vector of the student's profile,
 *                                                        where keys are terms and values are their TF-IDF scores.
 * @param {Object.<string, number>} combinedTFIDF - An object representing the combined TF-IDF vector from previously liked internships,
 *                                                  where keys are terms and values are their TF-IDF scores.
 * @param {number} totalLikedInternships - An sum of liked internships, used to determine the weighting factor.
 * @returns {Object.<string, number>} An object representing the new combined TF-IDF vector.
 */
function CalculateCombinedTFIDF({ tfIdfStudentProfile, combinedTFIDF, totalLikedInternships }) {
  try {
    // *************** Create a set of all unique terms from both the student profile and the combined liked internships TF-IDF vectors
    const terms = new Set([...Object.keys(tfIdfStudentProfile), ...Object.keys(combinedTFIDF)]);

    // *************** Initialize an empty object to store the newly calculated combined TF-IDF scores
    const newCombinedTFIDF = {};

    // *************** Initialize the weighting factor (alpha) for the student profile. Default to giving more weight to student profile.
    let alpha = 0.6;

    // *************** Adjust the alpha weighting factor based on the number of liked internships
    if (totalLikedInternships) {
      // *************** If 3 to 10 internships are liked, reduce student profile weight slightly
      if (totalLikedInternships >= 3 && totalLikedInternships <= 10) {
        alpha = 0.4;
      }
      // *************** If more than 10 internships are liked, significantly reduce student profile weight, giving more to liked internships
      else if (totalLikedInternships > 10) {
        alpha = 0.2;
      }
    }

    // *************** Iterate through each unique term to calculate its combined TF-IDF score
    for (const term of Array.from(terms)) {
      // *************** Get the TF-IDF score for the term from the student profile, default to 0 if not present
      const studentValue = tfIdfStudentProfile[term] || 0;
      // *************** Get the TF-IDF score for the term from the existing combined liked internships, default to 0 if not present
      const internshipValue = combinedTFIDF[term] || 0;

      // *************** Calculate the new combined TF-IDF score using the weighted average formula
      newCombinedTFIDF[term] = alpha * studentValue + (1 - alpha) * internshipValue;
    }

    // *************** Return the newly calculated combined TF-IDF vector
    return newCombinedTFIDF;
  } catch (error) {
    // *************** Log the error stack for debugging purposes
    console.log(error.stack);

    // *************** Re-throw the error to be handled by the caller
    throw error;
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  ComputeTFIDFInternships,
  CalculateTermFrequencies,
  BuildDocumentText,
  TokenizeText,
  CalculateTFIDF,
  AverageTFIDF,
  CalculateCombinedTFIDF,
};
