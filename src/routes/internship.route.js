// *************** IMPORT LIBRARY ***************
const express = require('express');

// *************** IMPORT HANDLERS ***************
const InternshipHandler = require('../handlers/internship.handler');

const router = express.Router();

router.post('/trigger-function-manually', InternshipHandler.TriggerFunctionManually);

// *************** EXPORT MODULES ***************
module.exports = router;
