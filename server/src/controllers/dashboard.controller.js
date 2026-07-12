// ============================================================
// EcoSphere ESG - Dashboard Controller (Plain PostgreSQL)
// ============================================================

const { query } = require('../config/db');

const getOverview = async (req, res, next) => {
  try {
    const { departmentId } = req.query;

    let deptFilter = '';
    const deptParams = [];
    if (departmentId) {
      deptFilter = ' AND department_id = $1';
      deptParams.push(departmentId);
    } else if (!['ADMIN', 'ESG_MANAGER'].includes(req.user.role) && req.user.departmentId) {
      deptFilter = ' AND department_id = $1';
      deptParams.push(req.user.departmentId);
    }

    // Carbon this month vs last month
    const [carbonThis, carbonLast] = await Promise.all([
      query(`SELECT COALESCE(SUM(carbon_kg),0) as total FROM carbon_transactions WHERE transaction_date >= DATE_TRUNC('month', NOW())${deptFilter}`, deptParams),
      query(`SELECT COALESCE(SUM(carbon_kg),0) as total FROM carbon_transactions WHERE transaction_date >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND transaction_date < DATE_TRUNC('month', NOW())${deptFilter}`, deptParams),
    ]);
    const curr = parseFloat(carbonThis.rows[0].total);
    const prev = parseFloat(carbonLast.rows[0].total) || 1;
    const carbonChange = (((curr - prev) / prev) * 100).toFixed(1);

    // Aggregate stats
    const [stats] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM csr_activities WHERE status = 'APPROVED') as active_csr,
          (SELECT COUNT(*) FROM employee_participations WHERE status = 'APPROVED') as csr_participations,
          (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
          (SELECT COUNT(*) FROM esg_policies WHERE is_active = true AND requires_ack = true) as active_policies,
          (SELECT COUNT(*) FROM policy_acknowledgements) as total_acks,
          (SELECT COUNT(*) FROM compliance_issues WHERE status IN ('OPEN','IN_PROGRESS')) as open_issues,
          (SELECT COUNT(*) FROM compliance_issues WHERE is_overdue = true) as overdue_issues,
          (SELECT COUNT(*) FROM challenges WHERE status = 'ACTIVE') as active_challenges
      `),
    ]);
    const s = stats.rows[0];
    const expectedAcks = parseInt(s.total_users) * parseInt(s.active_policies);
    const complianceRate = expectedAcks > 0 ? ((parseInt(s.total_acks) / expectedAcks) * 100).toFixed(1) : '100.0';

    // ESG scores (average of latest per department)
    const scoresResult = await query(`
      SELECT AVG(environmental_score) as env, AVG(social_score) as soc,
             AVG(governance_score) as gov, AVG(overall_score) as overall
      FROM (SELECT DISTINCT ON (department_id) * FROM department_scores ORDER BY department_id, calculated_at DESC) latest
    `);
    const sc = scoresResult.rows[0];

    // Goals
    const goalStats = await query('SELECT status, COUNT(*) as count FROM environmental_goals GROUP BY status');
    const goals = {};
    goalStats.rows.forEach(g => { goals[g.status.toLowerCase()] = parseInt(g.count); });

    res.json({
      success: true,
      data: {
        esgScore: {
          environmental: sc.env ? parseFloat(sc.env).toFixed(1) : '0',
          social: sc.soc ? parseFloat(sc.soc).toFixed(1) : '0',
          governance: sc.gov ? parseFloat(sc.gov).toFixed(1) : '0',
          overall: sc.overall ? parseFloat(sc.overall).toFixed(1) : '0',
        },
        carbon: {
          currentMonthKg: curr,
          currentMonthTonnes: (curr / 1000).toFixed(2),
          changePercent: carbonChange,
          trend: parseFloat(carbonChange) <= 0 ? 'down' : 'up',
        },
        social: { activeCSR: parseInt(s.active_csr), totalParticipations: parseInt(s.csr_participations) },
        governance: { complianceRate, openIssues: parseInt(s.open_issues), overdueIssues: parseInt(s.overdue_issues), activePolicies: parseInt(s.active_policies) },
        gamification: { activeChallenges: parseInt(s.active_challenges) },
        goals,
        totalEmployees: parseInt(s.total_users),
      },
    });
  } catch (error) { next(error); }
};

const getDepartmentRankings = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT DISTINCT ON (ds.department_id) ds.*, d.name as dept_name, d.code as dept_code
      FROM department_scores ds JOIN departments d ON ds.department_id = d.id
      ORDER BY ds.department_id, ds.calculated_at DESC
    `);
    result.rows.sort((a, b) => parseFloat(b.overall_score) - parseFloat(a.overall_score));
    const ranked = result.rows.map((r, i) => ({ rank: i + 1, ...r }));
    res.json({ success: true, data: ranked });
  } catch (error) { next(error); }
};

const getActivityFeed = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    let where = '1=1';
    const params = [];
    if (!['ADMIN', 'ESG_MANAGER'].includes(req.user.role)) {
      where = 'n.user_id = $1';
      params.push(req.user.id);
    }
    const result = await query(`
      SELECT n.*, u.first_name, u.last_name, u.avatar
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE ${where} ORDER BY n.created_at DESC LIMIT ${parseInt(limit)}
    `, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

module.exports = { getOverview, getDepartmentRankings, getActivityFeed };