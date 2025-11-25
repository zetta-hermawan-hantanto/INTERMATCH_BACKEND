// *************** IMPORT LIBRARY ***************
const express = require('express');

// *************** IMPORT HANDLERS ***************
const CompanyHandler = require('../handlers/company.handler');

const router = express.Router();

router.get('/get-all-companies', CompanyHandler.GetAllCompanies);
router.get('/get-company-by-id/:company_id', CompanyHandler.GetCompanyById);

// *************** EXPORT MODULES ***************
module.exports = router;
