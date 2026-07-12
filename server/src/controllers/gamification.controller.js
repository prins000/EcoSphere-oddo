// ============================================================
// EcoSphere ESG - Gamification Controller (Plain PostgreSQL)
// ============================================================

const { query, getClient } = require('../config/db');

// ── CHALLENGES ────────────────────────────────────────────────

const getChallenges = async (req, res, next) => {
  try {
    const { status, type, departmentId } = req.query;
    let where = '1=1'; const params = []; let idx = 1;
    if (status) { where += ` AND ch.status=$${idx++}`; params.push(status); }
    if (type) { where += ` AND ch.type=$${idx++}`; params.push(type); }
    if (departmentId) { where += ` AND ch.department_id=$${idx++}`; params.push(departmentId); }

    const result = await query(`
      SELECT ch.*, d.name as dept_name,
        b.name as badge_name, b.icon as badge_icon, b.color as badge_color,
        (SELECT COUNT(*) FROM challenge_participations WHERE challenge_id = ch.id) as participant_count
      FROM challenges ch
      LEFT JOIN departments d ON ch.department_id = d.id
      LEFT JOIN badges b ON ch.badge_id = b.id
      WHERE ${where} ORDER BY ch.start_date DESC
    `, params);

    // Get user's participation status
    const userParts = await query(
      'SELECT challenge_id, progress, is_completed, status FROM challenge_participations WHERE user_id = $1',
      [req.user.id]
    );
    const partMap = {};
    userParts.rows.forEach(p => { partMap[p.challenge_id] = p; });

    const enriched = result.rows.map(c => ({
      ...c,
      myParticipation: partMap[c.id] || null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
};

const createChallenge = async (req, res, next) => {
  try {
    const { title, description, type, departmentId, xpReward, targetValue, unit, maxParticipants, startDate, endDate, badgeId } = req.body;
    if (!title || !description || !type || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Title, description, type, start/end dates required.' });
    }
    const autoStatus = new Date(startDate) <= new Date() ? 'ACTIVE' : 'UPCOMING';
    const result = await query(`
      INSERT INTO challenges (title, description, type, department_id, status, xp_reward, target_value, unit, max_participants, start_date, end_date, badge_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [title, description, type, departmentId||null, autoStatus, parseInt(xpReward||100), targetValue?parseFloat(targetValue):null, unit, maxParticipants?parseInt(maxParticipants):null, startDate, endDate, badgeId||null]);

    res.status(201).json({ success: true, message: 'Challenge created.', data: result.rows[0] });
  } catch (error) { next(error); }
};

const joinChallenge = async (req, res, next) => {
  try {
    const ch = await query(`
      SELECT ch.*, (SELECT COUNT(*) FROM challenge_participations WHERE challenge_id = ch.id) as pcount
      FROM challenges ch WHERE ch.id = $1
    `, [req.params.id]);
    if (ch.rows.length === 0) return res.status(404).json({ success: false, message: 'Challenge not found.' });
    const c = ch.rows[0];
    if (c.status !== 'ACTIVE') return res.status(400).json({ success: false, message: 'Challenge not active.' });
    if (c.max_participants && parseInt(c.pcount) >= c.max_participants) return res.status(400).json({ success: false, message: 'Challenge full.' });

    const result = await query(`
      INSERT INTO challenge_participations (user_id, challenge_id, status)
      VALUES ($1, $2, 'SUBMITTED') RETURNING *
    `, [req.user.id, req.params.id]);

    res.status(201).json({ success: true, message: `Joined "${c.title}"!`, data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateProgress = async (req, res, next) => {
  try {
    const { progress, evidence } = req.body;
    const part = await query(`
      SELECT cp.*, ch.target_value, ch.xp_reward, ch.title as ch_title, ch.badge_id
      FROM challenge_participations cp
      JOIN challenges ch ON cp.challenge_id = ch.id
      WHERE cp.user_id = $1 AND cp.challenge_id = $2
    `, [req.user.id, req.params.challengeId]);

    if (part.rows.length === 0) return res.status(404).json({ success: false, message: 'Not participating.' });
    const p = part.rows[0];
    const newProgress = parseFloat(progress);
    const isCompleted = p.target_value ? newProgress >= parseFloat(p.target_value) : false;

    if (isCompleted && !p.is_completed) {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await client.query(`
          UPDATE challenge_participations SET progress=$1, is_completed=true, completed_at=NOW(), xp_awarded=$2, status='APPROVED', evidence=$3, updated_at=NOW()
          WHERE id=$4
        `, [newProgress, p.xp_reward, evidence, p.id]);
        await client.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [p.xp_reward, req.user.id]);
        await client.query(`INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, 'CHALLENGE_APPROVAL', '🎉 Challenge Completed!', $2, '/gamification/challenges')`, [req.user.id, `Completed "${p.ch_title}" — ${p.xp_reward} XP earned!`]);

        // Auto-award badge
        if (p.badge_id) {
          const existing = await client.query('SELECT id FROM user_badges WHERE user_id=$1 AND badge_id=$2', [req.user.id, p.badge_id]);
          if (existing.rows.length === 0) {
            await client.query('INSERT INTO user_badges (user_id, badge_id, awarded_by) VALUES ($1,$2,$3)', [req.user.id, p.badge_id, 'system']);
            const badge = await client.query('SELECT name, icon, description FROM badges WHERE id=$1', [p.badge_id]);
            if (badge.rows.length > 0) {
              const b = badge.rows[0];
              await client.query(`INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, 'BADGE_UNLOCK', $2, $3, '/gamification/leaderboard')`, [req.user.id, `🏅 Badge: ${b.icon} ${b.name}`, b.description]);
            }
          }
        }
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }

      return res.json({ success: true, message: `Challenge completed! +${p.xp_reward} XP` });
    }

    // Just update progress
    await query(`UPDATE challenge_participations SET progress=$1, evidence=$2, updated_at=NOW() WHERE id=$3`, [newProgress, evidence, p.id]);
    res.json({ success: true, message: 'Progress updated.' });
  } catch (error) { next(error); }
};

// ── BADGES ────────────────────────────────────────────────────

const getBadges = async (req, res, next) => {
  try {
    const badges = await query(`
      SELECT b.*, (SELECT COUNT(*) FROM user_badges WHERE badge_id = b.id) as earned_count
      FROM badges b WHERE b.is_active = true ORDER BY b.category ASC
    `);

    const myBadges = await query('SELECT badge_id, awarded_at FROM user_badges WHERE user_id = $1', [req.user.id]);
    const myMap = {};
    myBadges.rows.forEach(b => { myMap[b.badge_id] = b.awarded_at; });

    const enriched = badges.rows.map(b => ({
      ...b,
      earned: !!myMap[b.id],
      earnedAt: myMap[b.id] || null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) { next(error); }
};

// ── REWARDS ───────────────────────────────────────────────────

const getRewards = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM rewards WHERE is_active = true ORDER BY xp_cost ASC');
    res.json({ success: true, data: result.rows, userXP: req.user.xp || 0 });
  } catch (error) { next(error); }
};

const redeemReward = async (req, res, next) => {
  try {
    const reward = await query('SELECT * FROM rewards WHERE id = $1 AND is_active = true', [req.params.id]);
    if (reward.rows.length === 0) return res.status(404).json({ success: false, message: 'Reward not found.' });
    const r = reward.rows[0];

    if (r.stock <= 0) return res.status(400).json({ success: false, message: 'Out of stock.' });

    const user = await query('SELECT xp FROM users WHERE id = $1', [req.user.id]);
    if (user.rows[0].xp < r.xp_cost) {
      return res.status(400).json({ success: false, message: `Need ${r.xp_cost} XP, have ${user.rows[0].xp} XP.` });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const redemption = await client.query('INSERT INTO reward_redemptions (user_id, reward_id, xp_spent) VALUES ($1,$2,$3) RETURNING *', [req.user.id, req.params.id, r.xp_cost]);
      await client.query('UPDATE users SET xp = xp - $1 WHERE id = $2', [r.xp_cost, req.user.id]);
      await client.query('UPDATE rewards SET stock = stock - 1 WHERE id = $1', [req.params.id]);
      await client.query(`INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, 'REWARD_REDEEMED', '🎁 Reward Redeemed!', $2, '/gamification/leaderboard')`, [req.user.id, `Redeemed "${r.name}" for ${r.xp_cost} XP.`]);
      await client.query('COMMIT');
      res.json({ success: true, message: `Redeemed "${r.name}"!`, data: redemption.rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (error) { next(error); }
};

// ── LEADERBOARD ───────────────────────────────────────────────

const getLeaderboard = async (req, res, next) => {
  try {
    const { type = 'individual', limit = 20 } = req.query;

    if (type === 'department') {
      const result = await query(`
        SELECT DISTINCT ON (ds.department_id) ds.*, d.name as dept_name, d.code as dept_code,
          (SELECT COUNT(*) FROM users WHERE department_id = ds.department_id) as user_count
        FROM department_scores ds
        JOIN departments d ON ds.department_id = d.id
        ORDER BY ds.department_id, ds.calculated_at DESC
      `);
      // Re-sort by overall_score desc
      result.rows.sort((a, b) => parseFloat(b.overall_score) - parseFloat(a.overall_score));
      const ranked = result.rows.slice(0, parseInt(limit)).map((r, i) => ({ rank: i + 1, ...r }));
      return res.json({ success: true, data: ranked });
    }

    // Individual leaderboard
    const result = await query(`
      SELECT u.id, u.first_name, u.last_name, u.avatar, u.xp, u.role,
             d.name as dept_name, d.code as dept_code,
             (SELECT COUNT(*) FROM challenge_participations WHERE user_id = u.id AND is_completed = true) as challenges_done,
             (SELECT COUNT(*) FROM employee_participations WHERE user_id = u.id AND status = 'APPROVED') as csr_done
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.is_active = true
      ORDER BY u.xp DESC LIMIT $1
    `, [parseInt(limit)]);

    // Get badges for top users
    const userIds = result.rows.map(r => r.id);
    let badgeMap = {};
    if (userIds.length > 0) {
      const badgeResult = await query(`
        SELECT ub.user_id, b.id, b.name, b.icon, b.color
        FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
        WHERE ub.user_id = ANY($1) ORDER BY ub.awarded_at DESC
      `, [userIds]);
      badgeResult.rows.forEach(b => {
        if (!badgeMap[b.user_id]) badgeMap[b.user_id] = [];
        if (badgeMap[b.user_id].length < 5) badgeMap[b.user_id].push(b);
      });
    }

    const ranked = result.rows.map((u, i) => ({
      rank: i + 1,
      ...u,
      badges: badgeMap[u.id] || [],
    }));

    res.json({ success: true, data: ranked });
  } catch (error) { next(error); }
};

module.exports = { getChallenges, createChallenge, joinChallenge, updateProgress, getBadges, getRewards, redeemReward, getLeaderboard };