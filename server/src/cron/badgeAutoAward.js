// ============================================================
// EcoSphere ESG - Badge Auto-Award Cron
// Runs hourly to check and award badges based on criteria
// ============================================================

const { query, getClient } = require('../config/db');

/**
 * Auto-award badges based on criteria.
 * Supported criteria types:
 *   - xp_earned: Award when user reaches a certain XP level
 *   - csr_participations: Award after N approved CSR participations
 *   - challenges_completed: Award after completing challenges
 *   - policies_acknowledged: Award when all policies acknowledged
 */
async function autoAwardBadges() {
  console.log('🏅 [CRON] Running badge auto-award...');

  try {
    // Get all active badges
    const badgeResult = await query('SELECT * FROM badges WHERE is_active = true');
    const badges = badgeResult.rows;

    // Get all active users with their stats
    const usersResult = await query(`
      SELECT u.id, u.xp,
        (SELECT COUNT(*) FROM employee_participations WHERE user_id = u.id AND status = 'APPROVED') as csr_count,
        (SELECT COUNT(*) FROM challenge_participations WHERE user_id = u.id AND is_completed = true) as challenge_count,
        (SELECT COUNT(*) FROM policy_acknowledgements WHERE user_id = u.id) as policy_count
      FROM users u
      WHERE u.is_active = true
    `);
    const users = usersResult.rows;

    // Get each user's earned badge IDs
    const userBadgesResult = await query('SELECT user_id, badge_id FROM user_badges');
    const earnedMap = {};
    userBadgesResult.rows.forEach(ub => {
      if (!earnedMap[ub.user_id]) earnedMap[ub.user_id] = new Set();
      earnedMap[ub.user_id].add(ub.badge_id);
    });

    // Count active policies that require acknowledgement
    const policyCountResult = await query(
      'SELECT COUNT(*) as total FROM esg_policies WHERE is_active = true AND requires_ack = true'
    );
    const activePolicies = parseInt(policyCountResult.rows[0].total);

    let awarded = 0;

    for (const user of users) {
      const earnedBadgeIds = earnedMap[user.id] || new Set();

      for (const badge of badges) {
        // Skip if already earned
        if (earnedBadgeIds.has(badge.id)) continue;

        // Check XP requirement
        if (badge.xp_required > 0 && user.xp < badge.xp_required) continue;

        let criteria;
        try {
          criteria = typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria;
        } catch {
          continue;
        }

        let qualifies = false;

        switch (criteria.type) {
          case 'xp_earned':
            qualifies = user.xp >= (criteria.amount || 0);
            break;

          case 'csr_participations':
            qualifies = parseInt(user.csr_count) >= (criteria.count || 0);
            break;

          case 'challenges_completed':
            qualifies = parseInt(user.challenge_count) >= (criteria.count || 0);
            break;

          case 'policies_acknowledged':
            if (criteria.count === 'all') {
              qualifies = parseInt(user.policy_count) >= activePolicies && activePolicies > 0;
            } else {
              qualifies = parseInt(user.policy_count) >= (criteria.count || 0);
            }
            break;

          default:
            break;
        }

        if (qualifies) {
          const client = await getClient();
          try {
            await client.query('BEGIN');

            await client.query(
              'INSERT INTO user_badges (user_id, badge_id, awarded_by) VALUES ($1, $2, $3)',
              [user.id, badge.id, 'system']
            );

            await client.query(`
              INSERT INTO notifications (user_id, type, title, message, link)
              VALUES ($1, 'BADGE_UNLOCK', $2, $3, '/gamification/leaderboard')
            `, [
              user.id,
              `🏅 Badge Unlocked: ${badge.icon} ${badge.name}`,
              badge.description
            ]);

            await client.query('COMMIT');
          } catch (e) {
            await client.query('ROLLBACK');
            throw e;
          } finally {
            client.release();
          }
          awarded++;
        }
      }
    }

    console.log(`  ✅ Auto-awarded ${awarded} badges.`);
  } catch (error) {
    console.error('  ❌ [CRON] Badge auto-award failed:', error.message);
  }
}

module.exports = autoAwardBadges;
