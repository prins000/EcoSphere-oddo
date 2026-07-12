// ============================================================
// EcoSphere ESG - Department Controller (Plain PostgreSQL)
// ============================================================

const { query } = require('../config/db');

const getAllDepartments = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    let sql = `
      SELECT d.*,
        (SELECT COUNT(*) FROM users WHERE department_id = d.id) as user_count,
        (SELECT COUNT(*) FROM carbon_transactions WHERE department_id = d.id) as carbon_count,
        (SELECT COUNT(*) FROM environmental_goals WHERE department_id = d.id) as goal_count,
        (SELECT COUNT(*) FROM csr_activities WHERE department_id = d.id) as csr_count
      FROM departments d WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      sql += ` AND (d.name ILIKE $${idx} OR d.code ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (isActive !== undefined) {
      sql += ` AND d.is_active = $${idx}`;
      params.push(isActive === 'true');
      idx++;
    }
    sql += ' ORDER BY d.name ASC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getDepartment = async (req, res, next) => {
  try {
    const deptResult = await query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
    if (deptResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const usersResult = await query(
      'SELECT id, first_name, last_name, email, role, xp, avatar FROM users WHERE department_id = $1 ORDER BY xp DESC',
      [req.params.id]
    );

    const scoresResult = await query(
      'SELECT * FROM department_scores WHERE department_id = $1 ORDER BY calculated_at DESC LIMIT 4',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...deptResult.rows[0],
        users: usersResult.rows,
        departmentScores: scoresResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required.' });
    }

    const result = await query(
      'INSERT INTO departments (name, code, description) VALUES ($1, $2, $3) RETURNING *',
      [name, code.toUpperCase(), description]
    );

    res.status(201).json({ success: true, message: 'Department created.', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { name, code, description, isActive } = req.body;
    const sets = [];
    const params = [];
    let idx = 1;

    if (name) { sets.push(`name = $${idx++}`); params.push(name); }
    if (code) { sets.push(`code = $${idx++}`); params.push(code.toUpperCase()); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
    if (isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(isActive); }
    sets.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const result = await query(
      `UPDATE departments SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    res.json({ success: true, message: 'Department updated.', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    await query('UPDATE departments SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Department deactivated.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
