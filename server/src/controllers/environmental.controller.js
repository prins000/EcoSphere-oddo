// ============================================================
// EcoSphere ESG - Environmental Controller (Plain PostgreSQL)
// ============================================================

const { query } = require('../config/db');

// ── EMISSION FACTORS ──────────────────────────────────────────

const getEmissionFactors = async (req, res, next) => {
  try {
    const { source, categoryId, search } = req.query;
    let sql = `
      SELECT ef.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
        (SELECT COUNT(*) FROM carbon_transactions WHERE emission_factor_id = ef.id) as usage_count
      FROM emission_factors ef
      LEFT JOIN categories c ON ef.category_id = c.id
      WHERE ef.is_active = true
    `;
    const params = [];
    let idx = 1;

    if (source) { sql += ` AND ef.source = $${idx++}`; params.push(source); }
    if (categoryId) { sql += ` AND ef.category_id = $${idx++}`; params.push(categoryId); }
    if (search) { sql += ` AND (ef.name ILIKE $${idx} OR ef.description ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    sql += ' ORDER BY ef.name ASC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

const createEmissionFactor = async (req, res, next) => {
  try {
    const { name, categoryId, source, unit, factor, description } = req.body;
    if (!name || !categoryId || !source || !unit || factor === undefined) {
      return res.status(400).json({ success: false, message: 'Name, category, source, unit, and factor are required.' });
    }
    const result = await query(`
      INSERT INTO emission_factors (name, category_id, source, unit, factor, description)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [name, categoryId, source, unit, parseFloat(factor), description]);

    res.status(201).json({ success: true, message: 'Emission factor created.', data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateEmissionFactor = async (req, res, next) => {
  try {
    const { name, categoryId, source, unit, factor, description, isActive } = req.body;
    const sets = []; const params = []; let idx = 1;
    if (name) { sets.push(`name=$${idx++}`); params.push(name); }
    if (categoryId) { sets.push(`category_id=$${idx++}`); params.push(categoryId); }
    if (source) { sets.push(`source=$${idx++}`); params.push(source); }
    if (unit) { sets.push(`unit=$${idx++}`); params.push(unit); }
    if (factor !== undefined) { sets.push(`factor=$${idx++}`); params.push(parseFloat(factor)); }
    if (description !== undefined) { sets.push(`description=$${idx++}`); params.push(description); }
    if (isActive !== undefined) { sets.push(`is_active=$${idx++}`); params.push(isActive); }
    sets.push('updated_at=NOW()');
    params.push(req.params.id);
    const result = await query(`UPDATE emission_factors SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, params);
    res.json({ success: true, message: 'Emission factor updated.', data: result.rows[0] });
  } catch (error) { next(error); }
};

// ── CARBON TRANSACTIONS ───────────────────────────────────────

const getCarbonTransactions = async (req, res, next) => {
  try {
    const { departmentId, userId, source, startDate, endDate, page = 1, limit = 20 } = req.query;
    let where = '1=1'; const params = []; let idx = 1;

    if (departmentId) { where += ` AND ct.department_id=$${idx++}`; params.push(departmentId); }
    if (userId) { where += ` AND ct.user_id=$${idx++}`; params.push(userId); }
    if (source) { where += ` AND ct.source=$${idx++}`; params.push(source); }
    if (startDate) { where += ` AND ct.transaction_date >= $${idx++}`; params.push(startDate); }
    if (endDate) { where += ` AND ct.transaction_date <= $${idx++}`; params.push(endDate); }

    if (!['ADMIN', 'ESG_MANAGER'].includes(req.user.role) && req.user.departmentId) {
      where += ` AND ct.department_id=$${idx++}`;
      params.push(req.user.departmentId);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const sql = `
      SELECT ct.*, u.first_name, u.last_name, d.name as dept_name, d.code as dept_code,
             ef.name as ef_name, ef.unit as ef_unit
      FROM carbon_transactions ct
      LEFT JOIN users u ON ct.user_id = u.id
      LEFT JOIN departments d ON ct.department_id = d.id
      LEFT JOIN emission_factors ef ON ct.emission_factor_id = ef.id
      WHERE ${where}
      ORDER BY ct.transaction_date DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;
    const countSql = `SELECT COUNT(*) as total, COALESCE(SUM(ct.carbon_kg),0) as total_carbon FROM carbon_transactions ct WHERE ${where}`;

    const [txResult, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, params),
    ]);

    const { total, total_carbon } = countResult.rows[0];

    res.json({
      success: true,
      data: txResult.rows,
      summary: {
        totalCarbonKg: parseFloat(total_carbon),
        totalCarbonTonnes: (parseFloat(total_carbon) / 1000).toFixed(2),
      },
      pagination: { total: parseInt(total), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(parseInt(total) / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const createCarbonTransaction = async (req, res, next) => {
  try {
    const { emissionFactorId, departmentId, source, quantity, description, referenceDoc, transactionDate } = req.body;
    if (!emissionFactorId || !quantity || !source) {
      return res.status(400).json({ success: false, message: 'Emission factor, quantity, and source are required.' });
    }

    const efResult = await query('SELECT factor FROM emission_factors WHERE id = $1', [emissionFactorId]);
    if (efResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Emission factor not found.' });
    }

    const carbonKg = parseFloat(quantity) * parseFloat(efResult.rows[0].factor);

    const result = await query(`
      INSERT INTO carbon_transactions (user_id, department_id, emission_factor_id, source, quantity, carbon_kg, description, reference_doc, transaction_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [req.user.id, departmentId || req.user.departmentId, emissionFactorId, source, parseFloat(quantity), carbonKg, description, referenceDoc, transactionDate || new Date()]);

    res.status(201).json({ success: true, message: `Carbon transaction recorded: ${carbonKg.toFixed(2)} kg CO₂e`, data: result.rows[0] });
  } catch (error) { next(error); }
};

const getCarbonSummary = async (req, res, next) => {
  try {
    const { departmentId, period = '6months' } = req.query;
    const months = { '1month': 1, '3months': 3, '6months': 6, '1year': 12 }[period] || 6;

    let where = `transaction_date >= NOW() - INTERVAL '${months} months'`;
    const params = [];
    let idx = 1;
    if (departmentId) { where += ` AND department_id=$${idx++}`; params.push(departmentId); }
    if (!['ADMIN', 'ESG_MANAGER'].includes(req.user.role) && req.user.departmentId) {
      where += ` AND department_id=$${idx++}`; params.push(req.user.departmentId);
    }

    const [bySource, byDept, monthly, total] = await Promise.all([
      query(`SELECT source, SUM(carbon_kg) as carbon_kg, COUNT(*) as count FROM carbon_transactions WHERE ${where} GROUP BY source`, params),
      query(`SELECT d.name as dept_name, d.code as dept_code, SUM(ct.carbon_kg) as carbon_kg, COUNT(*) as count FROM carbon_transactions ct JOIN departments d ON ct.department_id = d.id WHERE ${where.replace(/department_id/g, 'ct.department_id')} GROUP BY d.name, d.code`, params),
      query(`SELECT TO_CHAR(transaction_date, 'YYYY-MM') as month, SUM(carbon_kg) as carbon_kg FROM carbon_transactions WHERE ${where} GROUP BY month ORDER BY month`, params),
      query(`SELECT COALESCE(SUM(carbon_kg),0) as total_kg, COUNT(*) as count FROM carbon_transactions WHERE ${where}`, params),
    ]);

    res.json({
      success: true,
      data: {
        totalCarbonKg: parseFloat(total.rows[0].total_kg),
        totalCarbonTonnes: (parseFloat(total.rows[0].total_kg) / 1000).toFixed(2),
        transactionCount: parseInt(total.rows[0].count),
        bySource: bySource.rows,
        byDepartment: byDept.rows,
        monthlyTrend: monthly.rows,
      },
    });
  } catch (error) { next(error); }
};

// ── GOALS ─────────────────────────────────────────────────────

const getGoals = async (req, res, next) => {
  try {
    const { departmentId, status } = req.query;
    let sql = `SELECT eg.*, d.name as dept_name, d.code as dept_code FROM environmental_goals eg LEFT JOIN departments d ON eg.department_id = d.id WHERE 1=1`;
    const params = []; let idx = 1;
    if (departmentId) { sql += ` AND eg.department_id=$${idx++}`; params.push(departmentId); }
    if (status) { sql += ` AND eg.status=$${idx++}`; params.push(status); }
    if (!['ADMIN', 'ESG_MANAGER'].includes(req.user.role) && req.user.departmentId) {
      sql += ` AND eg.department_id=$${idx++}`; params.push(req.user.departmentId);
    }
    sql += ' ORDER BY eg.created_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

const createGoal = async (req, res, next) => {
  try {
    const { title, description, departmentId, targetValue, unit, startDate, endDate } = req.body;
    if (!title || !departmentId || !targetValue || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Title, department, target, start/end dates required.' });
    }
    const result = await query(`
      INSERT INTO environmental_goals (title, description, department_id, target_value, unit, start_date, end_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [title, description, departmentId, parseFloat(targetValue), unit || 'tCO2e', startDate, endDate]);
    res.status(201).json({ success: true, message: 'Goal created.', data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateGoal = async (req, res, next) => {
  try {
    const { title, description, targetValue, currentValue, unit, status, startDate, endDate } = req.body;
    const sets = []; const params = []; let idx = 1;
    if (title) { sets.push(`title=$${idx++}`); params.push(title); }
    if (description !== undefined) { sets.push(`description=$${idx++}`); params.push(description); }
    if (targetValue !== undefined) { sets.push(`target_value=$${idx++}`); params.push(parseFloat(targetValue)); }
    if (currentValue !== undefined) { sets.push(`current_value=$${idx++}`); params.push(parseFloat(currentValue)); }
    if (unit) { sets.push(`unit=$${idx++}`); params.push(unit); }
    if (status) { sets.push(`status=$${idx++}`); params.push(status); }
    if (startDate) { sets.push(`start_date=$${idx++}`); params.push(startDate); }
    if (endDate) { sets.push(`end_date=$${idx++}`); params.push(endDate); }
    sets.push('updated_at=NOW()');
    params.push(req.params.id);
    const result = await query(`UPDATE environmental_goals SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, params);
    res.json({ success: true, message: 'Goal updated.', data: result.rows[0] });
  } catch (error) { next(error); }
};

// ── PRODUCTS ──────────────────────────────────────────────────

const getProducts = async (req, res, next) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM product_esg_profiles WHERE 1=1';
    const params = [];
    if (search) { sql += ` AND (product_name ILIKE $1 OR product_code ILIKE $1)`; params.push(`%${search}%`); }
    sql += ' ORDER BY product_name ASC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

const createProduct = async (req, res, next) => {
  try {
    const { productName, productCode, emissionFactorId, carbonFootprint, recyclablePercent, sustainableSource, ecoLabel, lifecycleStage, description } = req.body;
    if (!productName || !productCode || carbonFootprint === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, code, and carbon footprint required.' });
    }
    const result = await query(`
      INSERT INTO product_esg_profiles (product_name, product_code, emission_factor_id, carbon_footprint, recyclable_percent, sustainable_source, eco_label, lifecycle_stage, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [productName, productCode, emissionFactorId || null, parseFloat(carbonFootprint), parseFloat(recyclablePercent || 0), sustainableSource || false, ecoLabel, lifecycleStage, description]);
    res.status(201).json({ success: true, message: 'Product ESG profile created.', data: result.rows[0] });
  } catch (error) { next(error); }
};

// ── CATEGORIES ────────────────────────────────────────────────

const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];
    if (type) { sql += ' AND type=$1'; params.push(type); }
    sql += ' ORDER BY name ASC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

module.exports = {
  getEmissionFactors, createEmissionFactor, updateEmissionFactor,
  getCarbonTransactions, createCarbonTransaction, getCarbonSummary,
  getGoals, createGoal, updateGoal,
  getProducts, createProduct, getCategories,
};
