// ============================================================
// EcoSphere ESG - Social Controller (Plain PostgreSQL)
// ============================================================

const { query, getClient } = require('../config/db');

const getCSRActivities = async (req, res, next) => {
  try {
    const { status, departmentId, categoryId, search, page = 1, limit = 20 } = req.query;
    let where = '1=1'; const params = []; let idx = 1;
    if (status) { where += ` AND a.status=$${idx++}`; params.push(status); }
    if (departmentId) { where += ` AND a.department_id=$${idx++}`; params.push(departmentId); }
    if (categoryId) { where += ` AND a.category_id=$${idx++}`; params.push(categoryId); }
    if (search) { where += ` AND (a.title ILIKE $${idx} OR a.description ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const sql = `
      SELECT a.*, c.name as cat_name, c.icon as cat_icon, c.color as cat_color,
             d.name as dept_name, cr.first_name as creator_first, cr.last_name as creator_last,
             ap.first_name as approver_first, ap.last_name as approver_last,
             (SELECT COUNT(*) FROM employee_participations WHERE activity_id = a.id) as participant_count
      FROM csr_activities a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN users cr ON a.creator_id = cr.id
      LEFT JOIN users ap ON a.approver_id = ap.id
      WHERE ${where} ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;
    const countSql = `SELECT COUNT(*) as total FROM csr_activities a WHERE ${where}`;
    const [result, countResult] = await Promise.all([query(sql, params), query(countSql, params)]);

    const userParts = await query('SELECT activity_id, status FROM employee_participations WHERE user_id = $1', [req.user.id]);
    const partMap = {};
    userParts.rows.forEach(p => { partMap[p.activity_id] = p.status; });

    const enriched = result.rows.map(a => ({
      ...a,
      my_status: partMap[a.id] || null
    }));

    res.json({ success: true, data: enriched, pagination: { total: parseInt(countResult.rows[0].total), page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
};

const getCSRActivity = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT a.*, c.name as cat_name, c.icon as cat_icon, d.name as dept_name,
             cr.first_name as creator_first, cr.last_name as creator_last
      FROM csr_activities a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN users cr ON a.creator_id = cr.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Activity not found.' });

    const parts = await query(`
      SELECT ep.*, u.first_name, u.last_name, u.avatar
      FROM employee_participations ep JOIN users u ON ep.user_id = u.id
      WHERE ep.activity_id = $1 ORDER BY ep.participated_at DESC
    `, [req.params.id]);

    res.json({ success: true, data: { ...result.rows[0], participations: parts.rows } });
  } catch (error) { next(error); }
};

const createCSRActivity = async (req, res, next) => {
  try {
    const { title, description, categoryId, departmentId, evidenceRequired, hoursRequired, maxParticipants, xpReward, startDate, endDate, location, impactMetric, impactValue } = req.body;
    if (!title || !description || !startDate) return res.status(400).json({ success: false, message: 'Title, description, and start date required.' });

    const result = await query(`
      INSERT INTO csr_activities (title, description, category_id, department_id, creator_id, status, evidence_required, hours_required, max_participants, xp_reward, start_date, end_date, location, impact_metric, impact_value)
      VALUES ($1,$2,$3,$4,$5,'DRAFT',$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
    `, [title, description, categoryId||null, departmentId||req.user.departmentId, req.user.id, evidenceRequired||false, parseFloat(hoursRequired||0), maxParticipants?parseInt(maxParticipants):null, parseInt(xpReward||50), startDate, endDate||null, location, impactMetric, impactValue?parseFloat(impactValue):null]);

    res.status(201).json({ success: true, message: 'CSR activity created as draft.', data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateCSRStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const activity = await query('SELECT * FROM csr_activities WHERE id = $1', [req.params.id]);
    if (activity.rows.length === 0) return res.status(404).json({ success: false, message: 'Activity not found.' });

    const valid = { DRAFT: ['SUBMITTED'], SUBMITTED: ['APPROVED', 'REJECTED'], REJECTED: ['DRAFT'] };
    if (!valid[activity.rows[0].status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot transition from ${activity.rows[0].status} to ${status}.` });
    }

    const updated = await query(`
      UPDATE csr_activities SET status=$1, approver_id=$2, updated_at=NOW() WHERE id=$3 RETURNING *
    `, [status, ['APPROVED','REJECTED'].includes(status) ? req.user.id : activity.rows[0].approver_id, req.params.id]);

    if (['APPROVED', 'REJECTED'].includes(status)) {
      await query(`
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES ($1, 'CSR_APPROVAL', $2, $3, '/social/csr')
      `, [activity.rows[0].creator_id, status === 'APPROVED' ? '✅ CSR Activity Approved' : '❌ CSR Activity Rejected', `Your activity "${activity.rows[0].title}" has been ${status.toLowerCase()}.`]);
    }

    res.json({ success: true, message: `Activity ${status.toLowerCase()}.`, data: updated.rows[0] });
  } catch (error) { next(error); }
};

const participateInActivity = async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const { hoursLogged, evidence, evidenceType, feedback } = req.body;

    const activity = await query(`
      SELECT a.*, (SELECT COUNT(*) FROM employee_participations WHERE activity_id = a.id) as pcount
      FROM csr_activities a WHERE a.id = $1
    `, [activityId]);
    if (activity.rows.length === 0) return res.status(404).json({ success: false, message: 'Activity not found.' });
    const a = activity.rows[0];
    if (a.status !== 'APPROVED') return res.status(400).json({ success: false, message: 'Activity not approved.' });
    if (a.max_participants && parseInt(a.pcount) >= a.max_participants) return res.status(400).json({ success: false, message: 'Activity full.' });
    if (a.evidence_required && !evidence) return res.status(400).json({ success: false, message: 'Evidence required.' });

    const result = await query(`
      INSERT INTO employee_participations (user_id, activity_id, hours_logged, evidence, evidence_type, feedback, status)
      VALUES ($1,$2,$3,$4,$5,$6,'SUBMITTED') RETURNING *
    `, [req.user.id, activityId, parseFloat(hoursLogged||0), evidence, evidenceType, feedback]);

    res.status(201).json({ success: true, message: 'Participation recorded.', data: result.rows[0] });
  } catch (error) { next(error); }
};

const approveParticipation = async (req, res, next) => {
  try {
    const part = await query(`
      SELECT ep.*, a.xp_reward, a.title FROM employee_participations ep
      JOIN csr_activities a ON ep.activity_id = a.id WHERE ep.id = $1
    `, [req.params.id]);
    if (part.rows.length === 0) return res.status(404).json({ success: false, message: 'Participation not found.' });

    const p = part.rows[0];
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE employee_participations SET status=$1, xp_awarded=$2, updated_at=NOW() WHERE id=$3', ['APPROVED', p.xp_reward, req.params.id]);
      await client.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [p.xp_reward, p.user_id]);
      await client.query(`INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, 'XP_EARNED', '🎉 XP Earned!', $2, '/social/participation')`, [p.user_id, `You earned ${p.xp_reward} XP for "${p.title}".`]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }

    res.json({ success: true, message: `Approved. ${p.xp_reward} XP awarded.` });
  } catch (error) { next(error); }
};

const getMyParticipations = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT ep.*, a.title as activity_title, a.xp_reward, c.name as cat_name, c.icon as cat_icon
      FROM employee_participations ep
      JOIN csr_activities a ON ep.activity_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE ep.user_id = $1 ORDER BY ep.participated_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

const getDiversityMetrics = async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    let where = 'is_active = true'; const params = []; let idx = 1;
    if (departmentId) { where += ` AND department_id=$${idx++}`; params.push(departmentId); }

    const [roles, depts, totals] = await Promise.all([
      query(`SELECT role, COUNT(*) as count FROM users WHERE ${where} GROUP BY role`, params),
      query(`SELECT d.name, COUNT(*) as count FROM users u JOIN departments d ON u.department_id = d.id WHERE u.${where.replace('is_active','u.is_active').replace('department_id','u.department_id')} GROUP BY d.name`, params),
      query(`SELECT COUNT(*) as total, (SELECT COUNT(*) FROM employee_participations WHERE status='APPROVED') as csr_parts, (SELECT COALESCE(SUM(hours_logged),0) FROM employee_participations WHERE status='APPROVED') as csr_hours`),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees: parseInt(totals.rows[0].total),
        totalCSRParticipations: parseInt(totals.rows[0].csr_parts),
        totalCSRHours: parseFloat(totals.rows[0].csr_hours),
        roleDistribution: roles.rows,
        departmentDistribution: depts.rows,
      },
    });
  } catch (error) { next(error); }
};

module.exports = { getCSRActivities, getCSRActivity, createCSRActivity, updateCSRStatus, participateInActivity, approveParticipation, getMyParticipations, getDiversityMetrics };