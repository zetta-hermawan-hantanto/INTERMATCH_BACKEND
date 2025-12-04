// *************** IMPORT LIBRARIES ***************
const lodash = require('lodash');
const dotenv = require('dotenv');

// *************** IMPORT MODULES ***************
const InternshipsModel = require('../models/internships.model');
const StudentsModel = require('../models/students.model');
const VectorMetaModel = require('../models/vector_meta.model');

// *************** IMPORT UTILITIES ***************
const { ApiError } = require('../utils/common-error');
const { BuildDocumentTextStudentProfile } = require('../helpers/student.helper');
const {
  TokenizeText,
  CalculateTermFrequencies,
  BuildDocumentText,
  CalculateTFIDF,
  AverageTFIDF,
  CalculateCombinedTFIDF,
} = require('../utils/common-tf_idf');
const { GetSortedInternshipsByCosineSimilarity } = require('../utils/common-cosine_similarity');

// *************** CONFIGURE DOTENV ***************
dotenv.config();

/**
 * Retrieves internship recommendations based on search criteria.
 *
 * @param {object} params - The parameters for the search.
 * @param {string} [params.keyword] - Keyword to search within internship details.
 * @param {string} [params.location] - Location of the internship.
 * @param {string} [params.workMode] - Work mode (e.g., 'remote', 'on-site').
 * @param {string} [params.industry] - Industry of the company offering the internship.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of results per page.
 * @returns {Promise<Array>} A promise that resolves to an array containing metadata and internship data.
 */
async function GetRecommendationSearchBasedService({ keyword, location, workMode, industry, page = 1, limit = 10 }) {
  // *************** Initialize the base match stage for active internships
  const matchStage = {
    status: 'active',
  };

  // *************** Add location and work mode to match stage if provided
  if (location) matchStage.location_program = location;
  if (workMode) matchStage.work_mode = workMode;

  // *************** Add text search for keyword if provided
  if (keyword) {
    matchStage.$text = { $search: keyword };
  }

  // *************** Initialize the aggregation pipeline
  const pipeline = [];

  // *************** Apply the initial match stage
  pipeline.push({
    $match: matchStage,
  });

  // *************** Handle industry filtering if provided

  // *************** Lookup company details to access industry information
  pipeline.push({
    $lookup: {
      from: 'companies',
      localField: 'company',
      foreignField: '_id',
      as: 'company',
    },
  });

  // *************** Extract the industry from the company document
  pipeline.push({
    $addFields: {
      company: {
        $arrayElemAt: ['$company', 0],
      },
    },
  });

  if (industry) {
    // *************** Match by the specified industry
    pipeline.push({
      $match: {
        'company.industry_field': industry,
      },
    });
  }

  // *************** Apply facet stage for metadata and paginated data
  pipeline.push({
    $facet: {
      // *************** Metadata to count total results
      metadata: [{ $count: 'total' }],
      // *************** Data for pagination and projection
      data: [
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit,
        },
        {
          // *************** Exclude sensitive or unnecessary fields
          $project: {
            vector: 0,
            vector_histories: 0,
          },
        },
      ],
    },
  });

  // *************** Execute the aggregation pipeline, allowing disk use for large operations
  const result = await InternshipsModel.aggregate(pipeline).allowDiskUse(true);

  // *************** Return the aggregation result
  return result;
}

/**
 * Retrieves internship recommendations based on a student's profile and liked internships using TF-IDF and cosine similarity.
 *
 * @param {object} params - The parameters for the service.
 * @param {string} params.studentId - The ID of the student for whom to get recommendations.
 * @returns {Promise<Array>} A promise that resolves to an array of sorted internship recommendations.
 * @throws {ApiError} If the student is not found, vector meta is not found, or TF-IDF calculation fails.
 */
async function GetRecommendationHybridService({ studentId }) {
  // *************** Find the student by ID and select relevant fields for recommendation generation.
  const student = await StudentsModel.findById(studentId)
    .select('major desired_roles interests preferred_industries skills education_level liked_internships')
    .populate([
      {
        path: 'liked_internships',
        select: 'vector',
      },
    ])
    .lean();

  // *************** Throw an error if the student is not found.
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  // *************** Destructure student profile fields.
  const { major, desired_roles, interests, preferred_industries, skills, education_level } = student;

  // *************** Build a single document text from the student's profile information.
  const documentTextStudentProfile = BuildDocumentTextStudentProfile({
    major,
    desired_roles,
    interests,
    preferred_industries,
    skills,
    education_level,
  });
  // *************** Tokenize the student's profile text.
  const tokenizedTextStudentProfile = TokenizeText(documentTextStudentProfile);
  // *************** Calculate term frequencies for the tokenized student profile.
  const termFrequenciesStudentProfile = CalculateTermFrequencies(tokenizedTextStudentProfile);

  // *************** Get the latest vector meta information from the database.
  const latestVectorMetaName = process.env.VECTOR_META_LATEST;
  const vectorMeta = await VectorMetaModel.findOne({ name: latestVectorMetaName }).select('idf_values').lean();
  // *************** Throw an error if vector meta is not found.
  if (!vectorMeta) {
    throw new ApiError(404, 'Vector meta not found');
  }

  // *************** Get the IDF values from the vector meta.
  const idfValues = vectorMeta.idf_values;

  // *************** Calculate TF-IDF for the student's profile using the vector meta.
  const tfIdfStudentProfile = CalculateTFIDF(termFrequenciesStudentProfile, idfValues);
  // *************** Throw an error if the TF-IDF student profile is not generated or is empty.
  if (!tfIdfStudentProfile || lodash.isEmpty(tfIdfStudentProfile)) {
    throw new ApiError(404, 'TF-IDF student profile not found');
  }

  // *************** Extract vectors from liked internships.
  const likedInternships = student.liked_internships || [];
  const allTfIdfValues = likedInternships.map((internship) => internship.vector?.value);

  // *************** Calculate the average TF-IDF from liked internships.
  const combinedTFIDF = AverageTFIDF(allTfIdfValues);
  // *************** Throw an error if the combined TF-IDF from liked internships is not found or is empty.
  if (!combinedTFIDF || lodash.isEmpty(combinedTFIDF)) {
    throw new ApiError(404, 'Combined TF-IDF not found');
  }

  // *************** Calculate the final combined TF-IDF, blending student profile and liked internships.
  const resultTfIDF = CalculateCombinedTFIDF({ tfIdfStudentProfile, combinedTFIDF, totalLikedInternships: likedInternships.length });
  // *************** Throw an error if the final combined TF-IDF is not found or is empty.
  if (!resultTfIDF || lodash.isEmpty(resultTfIDF)) {
    throw new ApiError(404, 'Combined TF-IDF not found');
  }

  // *************** Get internships sorted by cosine similarity to the student's combined TF-IDF.
  // *************** The '6' here might represent a limit or a specific parameter for the sorting function.
  const sortedInternships = await GetSortedInternshipsByCosineSimilarity(resultTfIDF, 6);

  // *************** Return the sorted internships, or an empty array if none are found.
  return sortedInternships || [];
}

// *************** EXPORT MODULES ***************
module.exports = {
  GetRecommendationSearchBasedService,
  GetRecommendationHybridService,
};
