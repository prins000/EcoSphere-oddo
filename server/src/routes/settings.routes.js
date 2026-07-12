const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { getSettings, updateSettings, getCategories, createCategory, updateCategory, deleteCategory, getUsers } = require('../controllers/settings.controller');

router.use(authenticate);

// ── Org Settings ──────────────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings', authorize('ADMIN', 'ESG_MANAGER'), updateSettings);

// ── Categories ────────────────────────────────────────────────
router.get('/categories', getCategories);
router.post('/categories', authorize('ADMIN', 'ESG_MANAGER'), createCategory);
router.put('/categories/:id', authorize('ADMIN', 'ESG_MANAGER'), updateCategory);
router.delete('/categories/:id', authorize('ADMIN'), deleteCategory);

// ── Users (admin view) ────────────────────────────────────────
router.get('/users', authorize('ADMIN', 'ESG_MANAGER'), getUsers);

module.exports = router;