// ============================================================
// EcoSphere ESG - Dashboard Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getOverview, getDepartmentRankings, getActivityFeed } = require('../controllers/dashboard.controller');

router.use(authenticate);

router.get('/overview', getOverview);
router.get('/department-rankings', getDepartmentRankings);
router.get('/rankings', getDepartmentRankings);          // alias
router.get('/activity-feed', getActivityFeed);
router.get('/activity', getActivityFeed);                // alias

module.exports = router;
