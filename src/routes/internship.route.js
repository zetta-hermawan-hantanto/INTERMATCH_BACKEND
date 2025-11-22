// *************** IMPORT LIBRARY ***************
const express = require('express');

// *************** IMPORT HANDLERS ***************
const InternshipHandler = require('../handlers/internship.handler');

const router = express.Router();

router.post('/trigger-function-manually', InternshipHandler.TriggerFunctionManually);
router.get('/recommendation-internships-based-profile/:student_id', InternshipHandler.GetRecommendationInternshipsBasedProfile);

// *************** EXPORT MODULES ***************
module.exports = router;
