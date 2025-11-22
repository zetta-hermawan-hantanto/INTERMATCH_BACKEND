// *************** IMPORT LIBRARY ***************
const express = require('express');

// *************** IMPORT HANDLERS ***************
const UserHandler = require('../handlers/user.handler.js');

const router = express.Router();

router.post('/login', UserHandler.Login);
router.post('/register', UserHandler.Register);
router.post('/forgot-password', UserHandler.ForgotPassword);
router.post('/reset-password', UserHandler.ResetPassword);

// *************** EXPORT MODULES ***************
module.exports = router;
