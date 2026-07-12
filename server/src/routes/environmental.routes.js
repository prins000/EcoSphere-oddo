// ============================================================
// EcoSphere ESG - Environmental Routes
// Emission Factors, Carbon Transactions, Goals, Products
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getEmissionFactors,
  createEmissionFactor,
  updateEmissionFactor,
  getCarbonTransactions,
  createCarbonTransaction,
  getCarbonSummary,
  getGoals,
  createGoal,
  updateGoal,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} = require('../controllers/environmental.controller');

// All routes require authentication
router.use(authenticate);

// ── Categories ────────────────────────────────────────────
router.get('/categories', getCategories);

// ── Emission Factors ──────────────────────────────────────
router.get('/emission-factors', getEmissionFactors);
router.post('/emission-factors', authorize('ADMIN', 'ESG_MANAGER'), createEmissionFactor);
router.put('/emission-factors/:id', authorize('ADMIN', 'ESG_MANAGER'), updateEmissionFactor);

// ── Carbon Transactions ───────────────────────────────
router.get('/carbon-transactions', getCarbonTransactions);
router.get('/carbon', getCarbonTransactions);           // alias
router.post('/carbon-transactions', createCarbonTransaction);
router.post('/carbon', createCarbonTransaction);         // alias
router.get('/carbon-summary', getCarbonSummary);
router.get('/carbon/summary', getCarbonSummary);         // alias

// ── Environmental Goals ───────────────────────────────────
router.get('/goals', getGoals);
router.post('/goals', authorize('ADMIN', 'ESG_MANAGER', 'DEPARTMENT_HEAD'), createGoal);
router.put('/goals/:id', authorize('ADMIN', 'ESG_MANAGER', 'DEPARTMENT_HEAD'), updateGoal);

// ── Product ESG Profiles ──────────────────────────────────
router.get('/products', getProducts);
router.post('/products', authorize('ADMIN', 'ESG_MANAGER'), createProduct);
router.put('/products/:id', authorize('ADMIN', 'ESG_MANAGER'), updateProduct);
router.delete('/products/:id', authorize('ADMIN'), deleteProduct);

module.exports = router;