// ============================================================
// EcoSphere ESG - Auth Middleware (Plain PostgreSQL)
// JWT token verification and user injection
// ============================================================

const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(`
      SELECT id, email, first_name, last_name, role, department_id, is_active, xp
      FROM users WHERE id = $1
    `, [decoded.userId]);

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Invalid token or user deactivated.' });
    }

    const u = result.rows[0];
    req.user = {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      departmentId: u.department_id,
      isActive: u.is_active,
      xp: u.xp,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

module.exports = { authenticate };
