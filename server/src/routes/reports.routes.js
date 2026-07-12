const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getEnvironmentalReport, getSocialReport, getGovernanceReport, getSummaryReport, getCustomReport } = require('../controllers/reports.controller');

router.use(authenticate);

router.get('/environmental', getEnvironmentalReport);
router.get('/social', getSocialReport);
router.get('/governance', getGovernanceReport);
router.get('/summary', getSummaryReport);
router.get('/custom', getCustomReport);

module.exports = router;