// ============================================================
// EcoSphere ESG - Notification Controller (Plain PostgreSQL)
// ============================================================

const { query } = require('../config/db');

const getNotifications = async (req, res, next) => {
  try {
    const { isRead, type, limit = 50 } = req.query;
    let where = 'user_id = $1'; const params = [req.user.id]; let idx = 2;
    if (isRead !== undefined) { where += ` AND is_read = $${idx++}`; params.push(isRead === 'true'); }
    if (type) { where += ` AND type = $${idx++}`; params.push(type); }

    const [result, unread] = await Promise.all([
      query(`SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT ${parseInt(limit)}`, params),
      query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]),
    ]);

    res.json({ success: true, data: result.rows, unreadCount: parseInt(unread.rows[0].count) });
  } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) { next(error); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) { next(error); }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };