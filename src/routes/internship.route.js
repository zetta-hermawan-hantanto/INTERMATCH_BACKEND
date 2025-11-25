// *************** IMPORT LIBRARY ***************
const express = require('express');

// *************** IMPORT HANDLERS ***************
const InternshipHandler = require('../handlers/internship.handler');

const router = express.Router();

router.get('/recommendation-internships-based-profile/:student_id', InternshipHandler.GetRecommendationInternshipsBasedProfile);
router.get('/recommendation-internships-based-search', InternshipHandler.GetRecommendationSearchBased);
router.get('/get-industry-fields-of-internship', InternshipHandler.GetIndustryFieldsOfInternship);
router.get('/get-location-internship', InternshipHandler.GetLocationInternship);
router.get('/get-like-internships/:student_id', InternshipHandler.GetLikedInternships);
router.get('/get-company-internships/:company_id', InternshipHandler.GetInternshipsByCompany);
router.get('/get-internship-by-id/:internship_id', InternshipHandler.GetInternshipById);

router.post('/trigger-function-manually', InternshipHandler.TriggerFunctionManually);
router.post('/link-unlike-internship/:student_id/:internship_id', InternshipHandler.LikeUnlikeInternship);

// *************** EXPORT MODULES ***************
module.exports = router;
