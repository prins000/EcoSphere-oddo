// ============================================================
// EcoSphere ESG - Reports Controller
// Environmental, Social, Governance, Summary, Custom reports
// ============================================================

const { query } = require('../config/db');

// ── Environmental Report ──────────────────────────────────────
const getEnvironmentalReport = async (req, res, next) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const params = []; let idx = 1;
    let dateWhere = '1=1';
    if (startDate) { dateWhere += ` AND ct.transaction_date >= $${idx++}`; params.push(startDate); }
    if (endDate)   { dateWhere += ` AND ct.transaction_date <= $${idx++}`; params.push(endDate); }
    let deptWhere = departmentId ? ` AND ct.department_id = $${idx++}` : '';
    if (departmentId) params.push(departmentId);

    const [carbonSummary, carbonBySource, carbonByDept, goals] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int as total_transactions,
          COALESCE(SUM(carbon_kg), 0) as total_co2,
          COALESCE(AVG(carbon_kg), 0) as avg_co2,
          MIN(transaction_date) as from_date,
          MAX(transaction_date) as to_date
        FROM carbon_transactions ct WHERE ${dateWhere}${deptWhere}
      `, params),
      query(`
        SELECT ct.source, COUNT(*)::int as count, COALESCE(SUM(ct.carbon_kg),0) as total_co2
        FROM carbon_transactions ct WHERE ${dateWhere}${deptWhere}
        GROUP BY ct.source ORDER BY total_co2 DESC
      `, params),
      query(`
        SELECT d.name as dept_name, COUNT(ct.id)::int as transactions,
               COALESCE(SUM(ct.carbon_kg),0) as total_co2
        FROM carbon_transactions ct
        JOIN departments d ON ct.department_id = d.id
        WHERE ${dateWhere}${deptWhere}
        GROUP BY d.name ORDER BY total_co2 DESC
      `, params),
      query(`
        SELECT g.title, g.status, g.target_value, g.current_value, g.unit,
               g.start_date, g.end_date,
               CASE WHEN g.target_value > 0
                 THEN ROUND((g.current_value / g.target_value * 100)::numeric, 1)
                 ELSE 0 END as progress_pct,
               d.name as dept_name
        FROM environmental_goals g
        LEFT JOIN departments d ON g.department_id = d.id
        ORDER BY g.created_at DESC
      `),
    ]);

    res.json({
      success: true,
      data: {
        summary: carbonSummary.rows[0],
        bySource: carbonBySource.rows,
        byDepartment: carbonByDept.rows,
        goals: goals.rows,
      },
    });
  } catch (error) { next(error); }
};

// ── Social Report ─────────────────────────────────────────────
const getSocialReport = async (req, res, next) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const params = []; let idx = 1;
    let dateWhere = '1=1';
    if (startDate) { dateWhere += ` AND a.start_date >= $${idx++}`; params.push(startDate); }
    if (endDate)   { dateWhere += ` AND a.start_date <= $${idx++}`; params.push(endDate); }
    let deptWhere = departmentId ? ` AND a.department_id = $${idx++}` : '';
    if (departmentId) params.push(departmentId);

    const [csrSummary, participation, diversityRoles, diversityDepts, topParticipants] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int as total_activities,
          COUNT(CASE WHEN a.status='APPROVED' THEN 1 END)::int as approved,
          COUNT(CASE WHEN a.status='SUBMITTED' THEN 1 END)::int as submitted,
          COUNT(CASE WHEN a.status='DRAFT' THEN 1 END)::int as draft,
          COALESCE(SUM(a.max_participants), 0) as total_capacity,
          (SELECT COUNT(*)::int FROM employee_participations WHERE status='APPROVED') as total_participations,
          (SELECT COALESCE(SUM(hours_logged),0) FROM employee_participations WHERE status='APPROVED') as total_hours,
          (SELECT COALESCE(SUM(xp_awarded),0) FROM employee_participations WHERE status='APPROVED') as total_xp
        FROM csr_activities a WHERE ${dateWhere}${deptWhere}
      `, params),
      query(`
        SELECT ep.status, COUNT(*)::int as count,
               COALESCE(SUM(ep.hours_logged),0) as hours,
               COALESCE(SUM(ep.xp_awarded),0) as xp
        FROM employee_participations ep
        JOIN csr_activities a ON ep.activity_id = a.id
        WHERE ${dateWhere}${deptWhere}
        GROUP BY ep.status
      `, params),
      query(`SELECT role, COUNT(*)::int as count FROM users WHERE is_active=true GROUP BY role ORDER BY count DESC`),
      query(`
        SELECT d.name, COUNT(u.id)::int as employees
        FROM users u JOIN departments d ON u.department_id = d.id
        WHERE u.is_active=true GROUP BY d.name ORDER BY employees DESC
      `),
      query(`
        SELECT u.first_name, u.last_name, COUNT(ep.id)::int as activities,
               COALESCE(SUM(ep.hours_logged),0) as hours,
               COALESCE(SUM(ep.xp_awarded),0) as xp
        FROM employee_participations ep
        JOIN users u ON ep.user_id = u.id
        WHERE ep.status='APPROVED'
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY activities DESC LIMIT 10
      `),
    ]);

    res.json({
      success: true,
      data: {
        summary: { ...csrSummary.rows[0], total_participants: csrSummary.rows[0]?.total_participations },
        csrSummary: csrSummary.rows[0],
        participationByStatus: participation.rows,
        diversityByRole: diversityRoles.rows,
        diversityByDept: diversityDepts.rows,
        topParticipants: topParticipants.rows,
      },
    });
  } catch (error) { next(error); }
};

// ── Governance Report ─────────────────────────────────────────
const getGovernanceReport = async (req, res, next) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const params = []; let idx = 1;
    let dateWhere = '1=1';
    if (startDate) { dateWhere += ` AND a.scheduled_date >= $${idx++}`; params.push(startDate); }
    if (endDate)   { dateWhere += ` AND a.scheduled_date <= $${idx++}`; params.push(endDate); }
    let deptWhere = departmentId ? ` AND a.department_id = $${idx++}` : '';
    if (departmentId) params.push(departmentId);

    const [auditSummary, issuesBySeverity, policyStats, overdueIssues, recentAudits] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int as total_audits,
          COUNT(CASE WHEN a.status='COMPLETED' THEN 1 END)::int as completed,
          COUNT(CASE WHEN a.status='IN_PROGRESS' THEN 1 END)::int as in_progress,
          COUNT(CASE WHEN a.status='SCHEDULED' THEN 1 END)::int as scheduled
        FROM audits a WHERE ${dateWhere}${deptWhere}
      `, params),
      query(`
        SELECT ci.severity, ci.status, COUNT(*)::int as count
        FROM compliance_issues ci WHERE 1=1
        GROUP BY ci.severity, ci.status ORDER BY ci.severity, ci.status
      `),
      query(`
        SELECT
          COUNT(*)::int as total_policies,
          COUNT(CASE WHEN p.requires_ack THEN 1 END)::int as require_ack,
          (SELECT COUNT(DISTINCT pa.policy_id)::int FROM policy_acknowledgements pa) as acknowledged_policies,
          (SELECT COUNT(DISTINCT pa.user_id)::int FROM policy_acknowledgements pa) as acknowledged_users
        FROM esg_policies p
      `),
      query(`
        SELECT ci.title, ci.severity, ci.due_date, ci.status,
               u.first_name as owner_first, u.last_name as owner_last,
               d.name as dept_name
        FROM compliance_issues ci
        LEFT JOIN users u ON ci.owner_id = u.id
        LEFT JOIN audits a ON ci.audit_id = a.id
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE ci.due_date < NOW() AND ci.status NOT IN ('RESOLVED','CLOSED')
        ORDER BY ci.due_date ASC
      `),
      query(`
        SELECT a.title, a.status, a.type, a.scope, a.scheduled_date,
               d.name as dept_name
        FROM audits a LEFT JOIN departments d ON a.department_id = d.id
        ORDER BY a.scheduled_date DESC LIMIT 10
      `),
    ]);

    res.json({
      success: true,
      data: {
        auditSummary: auditSummary.rows[0],
        issuesBySeverity: issuesBySeverity.rows,
        policyStats: policyStats.rows[0],
        overdueIssues: overdueIssues.rows,
        recentAudits: recentAudits.rows,
      },
    });
  } catch (error) { next(error); }
};

// ── ESG Summary Report ────────────────────────────────────────
const getSummaryReport = async (req, res, next) => {
  try {
    const settings = await query('SELECT * FROM org_settings LIMIT 1');
    const s = settings.rows[0] || { env_weight: 40, social_weight: 30, governance_weight: 30 };

    const [deptScores, topDepts, recentActivity] = await Promise.all([
      query(`
        SELECT ds.*, d.name as dept_name,
               ROUND((ds.environmental_score * $1 + ds.social_score * $2 + ds.governance_score * $3) / 100, 2) as weighted_total
        FROM department_scores ds
        JOIN departments d ON ds.department_id = d.id
        ORDER BY weighted_total DESC
      `, [s.env_weight, s.social_weight, s.governance_weight]),
      query(`
        SELECT d.name, ds.environmental_score, ds.social_score, ds.governance_score, ds.overall_score
        FROM department_scores ds JOIN departments d ON ds.department_id = d.id
        ORDER BY ds.overall_score DESC LIMIT 5
      `),
      query(`
        SELECT n.type, n.title, n.created_at
        FROM notifications n
        ORDER BY n.created_at DESC LIMIT 10
      `),
    ]);

    const envAvg = deptScores.rows.length
      ? deptScores.rows.reduce((s, r) => s + parseFloat(r.environmental_score || 0), 0) / deptScores.rows.length
      : 0;
    const socAvg = deptScores.rows.length
      ? deptScores.rows.reduce((s, r) => s + parseFloat(r.social_score || 0), 0) / deptScores.rows.length
      : 0;
    const govAvg = deptScores.rows.length
      ? deptScores.rows.reduce((s, r) => s + parseFloat(r.governance_score || 0), 0) / deptScores.rows.length
      : 0;
    const overallScore = (envAvg * parseFloat(s.env_weight) + socAvg * parseFloat(s.social_weight) + govAvg * parseFloat(s.governance_weight)) / 100;

    res.json({
      success: true,
      data: {
        weights: { environmental: s.env_weight, social: s.social_weight, governance: s.governance_weight },
        scores: { environmental: envAvg.toFixed(1), social: socAvg.toFixed(1), governance: govAvg.toFixed(1), overall: overallScore.toFixed(1) },
        departmentScores: deptScores.rows,
        topDepartments: topDepts.rows,
        recentActivity: recentActivity.rows,
      },
    });
  } catch (error) { next(error); }
};

// ── Custom Report Builder ─────────────────────────────────────
const getCustomReport = async (req, res, next) => {
  try {
    const { module, departmentId, employeeId, challengeId, categoryId, startDate, endDate } = req.query;

    if (!module) return res.status(400).json({ success: false, message: 'module is required (environmental|social|governance|gamification)' });

    const params = []; let idx = 1;
    let rows = [];

    if (module === 'environmental') {
      let where = '1=1';
      if (departmentId) { where += ` AND ct.department_id=$${idx++}`; params.push(departmentId); }
      if (startDate)    { where += ` AND ct.transaction_date>=$${idx++}`; params.push(startDate); }
      if (endDate)      { where += ` AND ct.transaction_date<=$${idx++}`; params.push(endDate); }
      const r = await query(`
        SELECT ct.transaction_date as date, ef.name as factor, ct.source, ct.quantity, ef.unit,
               ct.carbon_kg as co2_kg, d.name as department
        FROM carbon_transactions ct
        LEFT JOIN emission_factors ef ON ct.emission_factor_id = ef.id
        LEFT JOIN departments d ON ct.department_id = d.id
        WHERE ${where} ORDER BY ct.transaction_date DESC
      `, params);
      rows = r.rows;

    } else if (module === 'social') {
      let where = '1=1';
      if (departmentId) { where += ` AND a.department_id=$${idx++}`; params.push(departmentId); }
      if (employeeId)   { where += ` AND ep.user_id=$${idx++}`; params.push(employeeId); }
      if (categoryId)   { where += ` AND a.category_id=$${idx++}`; params.push(categoryId); }
      if (startDate)    { where += ` AND ep.participated_at>=$${idx++}`; params.push(startDate); }
      if (endDate)      { where += ` AND ep.participated_at<=$${idx++}`; params.push(endDate); }
      const r = await query(`
        SELECT ep.participated_at as date, a.title as activity, ep.status,
               ep.hours_logged, ep.xp_awarded,
               u.first_name||' '||u.last_name as employee,
               d.name as department, c.name as category
        FROM employee_participations ep
        JOIN csr_activities a ON ep.activity_id = a.id
        JOIN users u ON ep.user_id = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE ${where} ORDER BY ep.participated_at DESC
      `, params);
      rows = r.rows;

    } else if (module === 'governance') {
      let where = '1=1';
      if (departmentId) { where += ` AND a.department_id=$${idx++}`; params.push(departmentId); }
      if (startDate)    { where += ` AND a.scheduled_date>=$${idx++}`; params.push(startDate); }
      if (endDate)      { where += ` AND a.scheduled_date<=$${idx++}`; params.push(endDate); }
      const r = await query(`
        SELECT a.scheduled_date as date, a.title, a.type, a.status, a.scope,
               d.name as department,
               COUNT(ci.id)::int as issues
        FROM audits a
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN compliance_issues ci ON ci.audit_id = a.id
        WHERE ${where} GROUP BY a.id, d.name ORDER BY a.scheduled_date DESC
      `, params);
      rows = r.rows;

    } else if (module === 'gamification') {
      let where = '1=1';
      if (challengeId) { where += ` AND cp.challenge_id=$${idx++}`; params.push(challengeId); }
      if (employeeId)  { where += ` AND cp.user_id=$${idx++}`; params.push(employeeId); }
      if (startDate)   { where += ` AND cp.joined_at>=$${idx++}`; params.push(startDate); }
      if (endDate)     { where += ` AND cp.joined_at<=$${idx++}`; params.push(endDate); }
      const r = await query(`
        SELECT cp.joined_at as date, ch.title as challenge, cp.status,
               cp.progress, cp.xp_awarded,
               u.first_name||' '||u.last_name as employee
        FROM challenge_participations cp
        JOIN challenges ch ON cp.challenge_id = ch.id
        JOIN users u ON cp.user_id = u.id
        WHERE ${where} ORDER BY cp.joined_at DESC
      `, params);
      rows = r.rows;
    }

    res.json({ success: true, data: rows, count: rows.length, module });
  } catch (error) { next(error); }
};

module.exports = { getEnvironmentalReport, getSocialReport, getGovernanceReport, getSummaryReport, getCustomReport };