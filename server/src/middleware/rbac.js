// ============================================================
// EcoSphere ESG - RBAC Middleware
// Role-based access control for API endpoints
// ============================================================

/**
 * Middleware factory that restricts access to specific roles.
 * Must be used AFTER the authenticate middleware.
 *
 * @param  {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize('ADMIN'), handler);
 *   router.get('/managers', authenticate, authorize('ADMIN', 'ESG_MANAGER'), handler);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware that restricts access to the user's own department data.
 * Allows ADMIN and ESG_MANAGER to access any department.
 * DEPARTMENT_HEAD and EMPLOYEE can only access their own department.
 *
 * Expects departmentId in req.params or req.query.
 */
const departmentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  // Admins and ESG Managers can access all departments
  if (['ADMIN', 'ESG_MANAGER'].includes(req.user.role)) {
    return next();
  }

  const requestedDeptId = req.params.departmentId || req.query.departmentId || req.body.departmentId;

  if (requestedDeptId && requestedDeptId !== req.user.departmentId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own department data.',
    });
  }

  next();
};

module.exports = { authorize, departmentAccess };
