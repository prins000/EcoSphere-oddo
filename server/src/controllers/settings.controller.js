// ============================================================
// EcoSphere ESG - Settings Controller
// Org settings: ESG weights, feature toggles, notifications
// Categories CRUD
// ============================================================

const { query } = require('../config/db');

// ── Org Settings ──────────────────────────────────────────────

const getSettings = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM org_settings LIMIT 1');
    if (result.rows.length === 0) {
      // Insert default if missing
      const def = await query(`INSERT INTO org_settings (org_name) VALUES ('EcoSphere') RETURNING *`);
      return res.json({ success: true, data: def.rows[0] });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateSettings = async (req, res, next) => {
  try {
    const {
      orgName, envWeight, socialWeight, governanceWeight,
      autoEmissionCalc, evidenceRequired, badgeAutoAward,
      notifyCompliance, notifyCsrApproval, notifyPolicyReminder,
      notifyBadgeUnlock, notifyChallenge,
    } = req.body;

    // Validate weights sum to 100
    const total = parseFloat(envWeight || 40) + parseFloat(socialWeight || 30) + parseFloat(governanceWeight || 30);
    if (Math.abs(total - 100) > 0.01) {
      return res.status(400).json({ success: false, message: `ESG weights must sum to 100. Current sum: ${total.toFixed(1)}` });
    }

    const result = await query(`
      UPDATE org_settings SET
        org_name = COALESCE($1, org_name),
        env_weight = COALESCE($2, env_weight),
        social_weight = COALESCE($3, social_weight),
        governance_weight = COALESCE($4, governance_weight),
        auto_emission_calc = COALESCE($5, auto_emission_calc),
        evidence_required = COALESCE($6, evidence_required),
        badge_auto_award = COALESCE($7, badge_auto_award),
        notify_compliance = COALESCE($8, notify_compliance),
        notify_csr_approval = COALESCE($9, notify_csr_approval),
        notify_policy_reminder = COALESCE($10, notify_policy_reminder),
        notify_badge_unlock = COALESCE($11, notify_badge_unlock),
        notify_challenge = COALESCE($12, notify_challenge),
        updated_at = NOW()
      WHERE id = (SELECT id FROM org_settings LIMIT 1)
      RETURNING *
    `, [
      orgName, envWeight, socialWeight, governanceWeight,
      autoEmissionCalc, evidenceRequired, badgeAutoAward,
      notifyCompliance, notifyCsrApproval, notifyPolicyReminder,
      notifyBadgeUnlock, notifyChallenge,
    ]);

    res.json({ success: true, message: 'Settings updated.', data: result.rows[0] });
  } catch (error) { next(error); }
};

// ── Categories CRUD ───────────────────────────────────────────

const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM categories';
    const params = [];
    if (type) { sql += ' WHERE type = $1'; params.push(type); }
    sql += ' ORDER BY type, name';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, type, description, icon, color } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, message: 'Name and type are required.' });
    const result = await query(
      `INSERT INTO categories (name, type, description, icon, color) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, type, description || null, icon || '📋', color || '#64748B']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, type, description, icon, color, isActive } = req.body;
    const result = await query(`
      UPDATE categories SET
        name = COALESCE($1, name), type = COALESCE($2, type),
        description = COALESCE($3, description), icon = COALESCE($4, icon),
        color = COALESCE($5, color), is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [name, type, description, icon, color, isActive, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Category not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

const deleteCategory = async (req, res, next) => {
  try {
    await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Category deleted.' });
  } catch (error) { next(error); }
};

// ── User Management (admin only) ──────────────────────────────

const getUsers = async (req, res, next) => {
  try {
    const { search, role, departmentId } = req.query;
    let where = '1=1'; const params = []; let idx = 1;
    if (search) { where += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    if (role) { where += ` AND u.role = $${idx++}`; params.push(role); }
    if (departmentId) { where += ` AND u.department_id = $${idx++}`; params.push(departmentId); }
    const result = await query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.xp, u.is_active,
             u.created_at, d.name as dept_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.id
      WHERE ${where} ORDER BY u.created_at DESC
    `, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

module.exports = { getSettings, updateSettings, getCategories, createCategory, updateCategory, deleteCategory, getUsers };