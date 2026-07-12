// ============================================================
// EcoSphere ESG - Governance Routes
// Policies, Acknowledgements, Audits, Compliance Issues
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getPolicies,
  createPolicy,
  updatePolicy,
  acknowledgePolicy,
  getMyAcknowledgements,
  getAudits,
  createAudit,
  updateAudit,
  getComplianceIssues,
  createComplianceIssue,
  updateComplianceIssue,
} = require('../controllers/governance.controller');

router.use(authenticate);

// ── Policies ──────────────────────────────────────────────
router.get('/policies', getPolicies);
router.post('/policies', authorize('ADMIN', 'ESG_MANAGER'), createPolicy);
router.put('/policies/:id', authorize('ADMIN', 'ESG_MANAGER'), updatePolicy);

// ── Acknowledgements ──────────────────────────────────────
router.post('/policies/:policyId/acknowledge', acknowledgePolicy);
router.get('/my-acknowledgements', getMyAcknowledgements);

// ── Audits ────────────────────────────────────────────────
router.get('/audits', getAudits);
router.post('/audits', authorize('ADMIN', 'ESG_MANAGER'), createAudit);
router.put('/audits/:id', authorize('ADMIN', 'ESG_MANAGER'), updateAudit);

// ── Compliance Issues ─────────────────────────────────────
router.get('/compliance-issues', getComplianceIssues);
router.get('/issues', getComplianceIssues);               // alias
router.post('/compliance-issues', authorize('ADMIN', 'ESG_MANAGER', 'DEPARTMENT_HEAD'), createComplianceIssue);
router.post('/issues', authorize('ADMIN', 'ESG_MANAGER', 'DEPARTMENT_HEAD'), createComplianceIssue); // alias
router.put('/compliance-issues/:id', updateComplianceIssue);
router.put('/issues/:id', updateComplianceIssue);         // alias

module.exports = router;