// *************** IMPORT MODULES ***************
const InternshipsModel = require('../models/internships.model');

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
  if (industry) {
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
        industry: {
          $arrayElemAt: ['$company.industry', 0],
        },
      },
    });

    // *************** Match by the specified industry
    pipeline.push({
      $match: {
        industry: industry,
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
            company: 0,
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

// *************** EXPORT MODULES ***************
module.exports = {
  GetRecommendationSearchBasedService,
};
