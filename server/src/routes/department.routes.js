// ============================================================
// EcoSphere ESG - Department Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getAllDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/department.controller');

// All routes require authentication
router.use(authenticate);

// GET - accessible to all authenticated users
router.get('/', getAllDepartments);
router.get('/:id', getDepartment);

// CUD - restricted to Admin and ESG Manager
router.post('/', authorize('ADMIN', 'ESG_MANAGER'), createDepartment);
router.put('/:id', authorize('ADMIN', 'ESG_MANAGER'), updateDepartment);
router.delete('/:id', authorize('ADMIN'), deleteDepartment);

module.exports = router;
