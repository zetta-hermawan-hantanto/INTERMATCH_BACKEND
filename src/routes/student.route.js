// *************** IMPORT LIBRARY ***************
const express = require('express');

// *************** IMPORT HANDLERS ***************
const StudentHandler = require('../handlers/student.handler');

const router = express.Router();

router.get('/profile/:id', StudentHandler.GetStudentProfile);
router.put('/profile/:id', StudentHandler.UpdateStudentProfile);

// *************** EXPORT MODULES ***************
module.exports = router;
