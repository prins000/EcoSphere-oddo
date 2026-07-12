// ============================================================
// EcoSphere ESG - Social Routes
// CSR Activities, Participation, Diversity
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getCSRActivities,
  getCSRActivity,
  createCSRActivity,
  updateCSRStatus,
  participateInActivity,
  approveParticipation,
  getMyParticipations,
  getDiversityMetrics,
} = require('../controllers/social.controller');

router.use(authenticate);

// ── CSR Activities ────────────────────────────────────────
router.get('/csr-activities', getCSRActivities);
router.get('/csr-activities/:id', getCSRActivity);
router.post('/csr-activities', createCSRActivity);
router.put('/csr-activities/:id/status', authorize('ADMIN', 'ESG_MANAGER', 'DEPARTMENT_HEAD'), updateCSRStatus);

// ── Participation ─────────────────────────────────────────
router.post('/participate/:activityId', participateInActivity);
router.put('/participation/:id/approve', authorize('ADMIN', 'ESG_MANAGER', 'DEPARTMENT_HEAD'), approveParticipation);
router.get('/my-participations', getMyParticipations);

// ── Diversity ─────────────────────────────────────────────
router.get('/diversity-metrics', getDiversityMetrics);

module.exports = router;
