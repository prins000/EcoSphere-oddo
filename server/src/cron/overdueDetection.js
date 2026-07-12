// ============================================================
// EcoSphere ESG - Overdue Detection Cron
// Runs daily to flag overdue compliance issues
// ============================================================

const { query, getClient } = require('../config/db');

/**
 * Check all open compliance issues and flag those past their due date.
 * Creates notifications for owners of newly overdue issues.
 */
async function detectOverdueIssues() {
  console.log('⏰ [CRON] Running overdue detection...');

  try {
    // Find issues that are past due but not yet flagged
    const result = await query(`
      SELECT ci.id, ci.title, ci.due_date, ci.owner_id,
             u.first_name, u.last_name
      FROM compliance_issues ci
      LEFT JOIN users u ON ci.owner_id = u.id
      WHERE ci.status IN ('OPEN', 'IN_PROGRESS')
        AND ci.due_date < NOW()
        AND ci.is_overdue = false
    `);

    const newlyOverdue = result.rows;

    if (newlyOverdue.length === 0) {
      console.log('  ✅ No new overdue issues found.');
      return;
    }

    console.log(`  ⚠️ Found ${newlyOverdue.length} newly overdue issues.`);

    // Flag each issue and create notification in a transaction
    for (const issue of newlyOverdue) {
      const client = await getClient();
      try {
        await client.query('BEGIN');

        await client.query(
          'UPDATE compliance_issues SET is_overdue = true, updated_at = NOW() WHERE id = $1',
          [issue.id]
        );

        await client.query(`
          INSERT INTO notifications (user_id, type, title, message, link)
          VALUES ($1, 'OVERDUE_ISSUE', '🚨 Overdue Compliance Issue', $2, '/governance/audits')
        `, [
          issue.owner_id,
          `"${issue.title}" is past its due date (${new Date(issue.due_date).toLocaleDateString()}). Immediate action required.`
        ]);

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    console.log(`  📬 Notifications sent for ${newlyOverdue.length} overdue issues.`);
  } catch (error) {
    console.error('  ❌ [CRON] Overdue detection failed:', error.message);
  }
}

module.exports = detectOverdueIssues;
