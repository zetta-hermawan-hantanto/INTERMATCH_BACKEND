// *************** IMPORT LIBRARY ***************
const express = require('express');

// *************** IMPORT HANDLERS ***************
const StudentHandler = require('../handlers/student.handler');

const router = express.Router();

router.get('/profile/:student_id', StudentHandler.GetStudentProfile);
router.put('/profile/:student_id', StudentHandler.UpdateStudentProfile);
router.get('/liked-internships/:student_id', StudentHandler.GetLikedInternships);
router.get('/profile-completeness/:student_id', StudentHandler.GetProfileCompleteness);

// *************** EXPORT MODULES ***************
module.exports = router;
