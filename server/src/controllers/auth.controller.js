// ============================================================
// EcoSphere ESG - Auth Controller (Plain PostgreSQL)
// Registration, login, profile management
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

/** POST /api/auth/register */
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, departmentId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'Email, password, first name, and last name are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query(`
      INSERT INTO users (email, password, first_name, last_name, role, department_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, department_id, xp, is_active, created_at
    `, [email, hashedPassword, firstName, lastName, role || 'EMPLOYEE', departmentId || null]);

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({ success: true, message: 'Account created successfully.', data: { token, user } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/auth/login */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await query(`
      SELECT u.*, d.id as dept_id, d.name as dept_name, d.code as dept_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);

    // Build clean user object (no password)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatar: user.avatar,
      xp: user.xp,
      isActive: user.is_active,
      departmentId: user.department_id,
      department: user.dept_id ? { id: user.dept_id, name: user.dept_name, code: user.dept_code } : null,
      createdAt: user.created_at,
    };

    res.json({ success: true, message: 'Login successful.', data: { token, user: userData } });
  } catch (error) {
    next(error);
  }
};

/** GET /api/auth/me */
const getProfile = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar, u.xp, u.is_active,
             u.department_id, u.created_at,
             d.name as dept_name, d.code as dept_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const u = result.rows[0];

    // Get badges
    const badgeResult = await query(`
      SELECT b.id, b.name, b.icon, b.color, b.description, ub.awarded_at
      FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.awarded_at DESC
    `, [req.user.id]);

    // Get counts
    const counts = await query(`
      SELECT
        (SELECT COUNT(*) FROM carbon_transactions WHERE user_id = $1) as carbon_count,
        (SELECT COUNT(*) FROM employee_participations WHERE user_id = $1) as participation_count,
        (SELECT COUNT(*) FROM challenge_participations WHERE user_id = $1) as challenge_count,
        (SELECT COUNT(*) FROM policy_acknowledgements WHERE user_id = $1) as policy_count,
        (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false) as unread_count
    `, [req.user.id]);

    const c = counts.rows[0];

    res.json({
      success: true,
      data: {
        id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name,
        role: u.role, avatar: u.avatar, xp: u.xp, isActive: u.is_active,
        departmentId: u.department_id, createdAt: u.created_at,
        department: u.department_id ? { id: u.department_id, name: u.dept_name, code: u.dept_code } : null,
        badges: badgeResult.rows,
        _count: {
          carbonTransactions: parseInt(c.carbon_count),
          employeeParticipations: parseInt(c.participation_count),
          challengeParticipations: parseInt(c.challenge_count),
          policyAcknowledgements: parseInt(c.policy_count),
          unreadNotifications: parseInt(c.unread_count),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/auth/profile */
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, avatar } = req.body;
    const sets = [];
    const params = [];
    let idx = 1;

    if (firstName) { sets.push(`first_name = $${idx++}`); params.push(firstName); }
    if (lastName) { sets.push(`last_name = $${idx++}`); params.push(lastName); }
    if (avatar !== undefined) { sets.push(`avatar = $${idx++}`); params.push(avatar); }
    sets.push(`updated_at = NOW()`);
    params.push(req.user.id);

    const result = await query(`
      UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}
      RETURNING id, email, first_name, last_name, role, avatar, xp, department_id
    `, params);

    res.json({ success: true, message: 'Profile updated.', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/auth/change-password */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const userResult = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
