// ============================================================
// EcoSphere ESG - Governance Controller (Plain PostgreSQL)
// ============================================================

const { query, getClient } = require('../config/db');

// ── POLICIES ──────────────────────────────────────────────────

const getPolicies = async (req, res, next) => {
  try {
    const { category, isActive, search } = req.query;
    let where = '1=1'; const params = []; let idx = 1;
    if (category) { where += ` AND p.category=$${idx++}`; params.push(category); }
    if (isActive !== undefined) { where += ` AND p.is_active=$${idx++}`; params.push(isActive === 'true'); }
    if (search) { where += ` AND (p.title ILIKE $${idx} OR p.content ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    const result = await query(`
      SELECT p.*, u.first_name as creator_first, u.last_name as creator_last,
        (SELECT COUNT(*) FROM policy_acknowledgements WHERE policy_id = p.id) as ack_count
      FROM esg_policies p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE ${where} ORDER BY p.created_at DESC
    `, params);

    const totalUsers = await query('SELECT COUNT(*) as total FROM users WHERE is_active = true');
    const total = parseInt(totalUsers.rows[0].total);

    const enriched = result.rows.map(p => ({
      ...p,
      complianceRate: total > 0 ? ((parseInt(p.ack_count) / total) * 100).toFixed(1) : '0.0',
    }));

    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
};

const createPolicy = async (req, res, next) => {
  try {
    const { title, content, version, category, requiresAck, reminderDays, effectiveDate, expiryDate } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ success: false, message: 'Title, content, and category are required.' });
    }
    const result = await query(`
      INSERT INTO esg_policies (title, content, version, category, creator_id, requires_ack, reminder_days, effective_date, expiry_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [title, content, version || '1.0', category, req.user.id, requiresAck !== false, parseInt(reminderDays || 30), effectiveDate || new Date(), expiryDate || null]);

    res.status(201).json({ success: true, message: 'Policy created.', data: result.rows[0] });
  } catch (error) { next(error); }
};

const updatePolicy = async (req, res, next) => {
  try {
    const { title, content, version, category, requiresAck, reminderDays, isActive, effectiveDate, expiryDate } = req.body;
    const sets = []; const params = []; let idx = 1;
    if (title) { sets.push(`title=$${idx++}`); params.push(title); }
    if (content) { sets.push(`content=$${idx++}`); params.push(content); }
    if (version) { sets.push(`version=$${idx++}`); params.push(version); }
    if (category) { sets.push(`category=$${idx++}`); params.push(category); }
    if (requiresAck !== undefined) { sets.push(`requires_ack=$${idx++}`); params.push(requiresAck); }
    if (reminderDays !== undefined) { sets.push(`reminder_days=$${idx++}`); params.push(parseInt(reminderDays)); }
    if (isActive !== undefined) { sets.push(`is_active=$${idx++}`); params.push(isActive); }
    if (effectiveDate) { sets.push(`effective_date=$${idx++}`); params.push(effectiveDate); }
    if (expiryDate !== undefined) { sets.push(`expiry_date=$${idx++}`); params.push(expiryDate || null); }
    sets.push('updated_at=NOW()');
    params.push(req.params.id);

    const result = await query(`UPDATE esg_policies SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, params);
    res.json({ success: true, message: 'Policy updated.', data: result.rows[0] });
  } catch (error) { next(error); }
};

// ── ACKNOWLEDGEMENTS ──────────────────────────────────────────

const acknowledgePolicy = async (req, res, next) => {
  try {
    const { policyId } = req.params;
    const { signature, notes } = req.body;

    const policy = await query('SELECT * FROM esg_policies WHERE id=$1 AND is_active=true', [policyId]);
    if (policy.rows.length === 0) return res.status(404).json({ success: false, message: 'Active policy not found.' });

    // Upsert: insert or update on conflict
    const result = await query(`
      INSERT INTO policy_acknowledgements (user_id, policy_id, signature, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, policy_id) DO UPDATE SET acknowledged_at = NOW(), signature = $3, notes = $4
      RETURNING *
    `, [req.user.id, policyId, signature, notes]);

    // Award 10 XP
    await query('UPDATE users SET xp = xp + 10 WHERE id = $1', [req.user.id]);

    res.json({ success: true, message: 'Policy acknowledged. +10 XP', data: result.rows[0] });
  } catch (error) { next(error); }
};

const getMyAcknowledgements = async (req, res, next) => {
  try {
    const acks = await query(`
      SELECT pa.*, p.title, p.version, p.category
      FROM policy_acknowledgements pa JOIN esg_policies p ON pa.policy_id = p.id
      WHERE pa.user_id = $1 ORDER BY pa.acknowledged_at DESC
    `, [req.user.id]);

    const ackedIds = acks.rows.map(a => a.policy_id);
    let pendingSql = 'SELECT id, title, version, category, effective_date FROM esg_policies WHERE is_active=true AND requires_ack=true';
    const params = [];
    if (ackedIds.length > 0) {
      pendingSql += ` AND id NOT IN (${ackedIds.map((_, i) => `$${i + 1}`).join(',')})`;
      params.push(...ackedIds);
    }
    const pending = await query(pendingSql, params);

    const totalRequired = acks.rows.length + pending.rows.length;
    res.json({
      success: true,
      data: {
        acknowledged: acks.rows,
        pending: pending.rows,
        complianceRate: totalRequired > 0 ? ((acks.rows.length / totalRequired) * 100).toFixed(1) : '100.0',
      },
    });
  } catch (error) { next(error); }
};

// ── AUDITS ────────────────────────────────────────────────────

const getAudits = async (req, res, next) => {
  try {
    const { status, scope, departmentId } = req.query;
    let where = '1=1'; const params = []; let idx = 1;
    if (status) { where += ` AND a.status=$${idx++}`; params.push(status); }
    if (scope) { where += ` AND a.scope=$${idx++}`; params.push(scope); }
    if (departmentId) { where += ` AND a.department_id=$${idx++}`; params.push(departmentId); }

    const result = await query(`
      SELECT a.*, d.name as dept_name,
        au.first_name as auditor_first, au.last_name as auditor_last,
        cr.first_name as creator_first, cr.last_name as creator_last,
        (SELECT COUNT(*) FROM compliance_issues WHERE audit_id = a.id) as issue_count
      FROM audits a
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN users au ON a.auditor_id = au.id
      LEFT JOIN users cr ON a.creator_id = cr.id
      WHERE ${where} ORDER BY a.scheduled_date DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

const createAudit = async (req, res, next) => {
  try {
    const { title, description, type, scope, departmentId, auditorId, scheduledDate } = req.body;
    if (!title || !type || !scope || !auditorId || !scheduledDate) {
      return res.status(400).json({ success: false, message: 'Title, type, scope, auditor, and date are required.' });
    }
    const result = await query(`
      INSERT INTO audits (title, description, type, scope, department_id, auditor_id, creator_id, scheduled_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [title, description, type, scope, departmentId || null, auditorId, req.user.id, scheduledDate]);

    res.status(201).json({ success: true, message: 'Audit scheduled.', data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateAudit = async (req, res, next) => {
  try {
    const { status, findings, score, completedDate } = req.body;
    const sets = []; const params = []; let idx = 1;
    if (status) { sets.push(`status=$${idx++}`); params.push(status); }
    if (findings !== undefined) { sets.push(`findings=$${idx++}`); params.push(findings); }
    if (score !== undefined) { sets.push(`score=$${idx++}`); params.push(parseFloat(score)); }
    if (completedDate) { sets.push(`completed_date=$${idx++}`); params.push(completedDate); }
    else if (status === 'COMPLETED') { sets.push(`completed_date=NOW()`); }
    sets.push('updated_at=NOW()');
    params.push(req.params.id);

    const result = await query(`UPDATE audits SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, params);
    res.json({ success: true, message: 'Audit updated.', data: result.rows[0] });
  } catch (error) { next(error); }
};

// ── COMPLIANCE ISSUES ─────────────────────────────────────────

const getComplianceIssues = async (req, res, next) => {
  try {
    const { severity, status, ownerId, isOverdue } = req.query;
    let where = '1=1'; const params = []; let idx = 1;
    if (severity) { where += ` AND ci.severity=$${idx++}`; params.push(severity); }
    if (status) { where += ` AND ci.status=$${idx++}`; params.push(status); }
    if (ownerId) { where += ` AND ci.owner_id=$${idx++}`; params.push(ownerId); }
    if (isOverdue !== undefined) { where += ` AND ci.is_overdue=$${idx++}`; params.push(isOverdue === 'true'); }

    if (!['ADMIN', 'ESG_MANAGER'].includes(req.user.role)) {
      where += ` AND ci.owner_id=$${idx++}`; params.push(req.user.id);
    }

    const result = await query(`
      SELECT ci.*, a.title as audit_title, u.first_name as owner_first, u.last_name as owner_last
      FROM compliance_issues ci
      LEFT JOIN audits a ON ci.audit_id = a.id
      LEFT JOIN users u ON ci.owner_id = u.id
      WHERE ${where} ORDER BY ci.is_overdue DESC, ci.severity DESC, ci.due_date ASC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

const createComplianceIssue = async (req, res, next) => {
  try {
    const { title, description, auditId, ownerId, severity, dueDate } = req.body;
    if (!title || !description || !ownerId || !dueDate) {
      return res.status(400).json({ success: false, message: 'Title, description, owner, and due date required.' });
    }

    const result = await query(`
      INSERT INTO compliance_issues (title, description, audit_id, owner_id, severity, due_date)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [title, description, auditId || null, ownerId, severity || 'MEDIUM', dueDate]);

    await query(`
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES ($1, 'COMPLIANCE_ISSUE', '⚠️ New Compliance Issue', $2, '/governance/audits')
    `, [ownerId, `"${title}" (${severity || 'MEDIUM'}) assigned to you. Due: ${new Date(dueDate).toLocaleDateString()}.`]);

    res.status(201).json({ success: true, message: 'Compliance issue created.', data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateComplianceIssue = async (req, res, next) => {
  try {
    const { title, description, severity, status, resolution, evidence, dueDate } = req.body;
    const sets = []; const params = []; let idx = 1;
    if (title) { sets.push(`title=$${idx++}`); params.push(title); }
    if (description) { sets.push(`description=$${idx++}`); params.push(description); }
    if (severity) { sets.push(`severity=$${idx++}`); params.push(severity); }
    if (status) { sets.push(`status=$${idx++}`); params.push(status); }
    if (resolution !== undefined) { sets.push(`resolution=$${idx++}`); params.push(resolution); }
    if (evidence !== undefined) { sets.push(`evidence=$${idx++}`); params.push(evidence); }
    if (dueDate) { sets.push(`due_date=$${idx++}`); params.push(dueDate); }
    if (status === 'RESOLVED') { sets.push('resolved_at=NOW()'); sets.push('is_overdue=false'); }
    sets.push('updated_at=NOW()');
    params.push(req.params.id);

    const result = await query(`UPDATE compliance_issues SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, params);
    res.json({ success: true, message: 'Compliance issue updated.', data: result.rows[0] });
  } catch (error) { next(error); }
};

module.exports = {
  getPolicies, createPolicy, updatePolicy,
  acknowledgePolicy, getMyAcknowledgements,
  getAudits, createAudit, updateAudit,
  getComplianceIssues, createComplianceIssue, updateComplianceIssue,
};
