// ============================================================
// EcoSphere ESG - Gamification Routes
// Challenges, Badges, Rewards, Leaderboard
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getChallenges,
  createChallenge,
  joinChallenge,
  updateProgress,
  updateChallengeStatus,
  getBadges,
  getRewards,
  redeemReward,
  getLeaderboard,
} = require('../controllers/gamification.controller');

router.use(authenticate);

// ── Challenges ────────────────────────────────────────────
router.get('/challenges', getChallenges);
router.post('/challenges', authorize('ADMIN', 'ESG_MANAGER'), createChallenge);
router.post('/challenges/:id/join', joinChallenge);
router.put('/challenges/:challengeId/progress', updateProgress);
router.patch('/challenges/:challengeId/progress', updateProgress); // alias (frontend uses PATCH)
router.put('/challenges/:id/status', authorize('ADMIN', 'ESG_MANAGER'), updateChallengeStatus);

// ── Badges ────────────────────────────────────────────────
router.get('/badges', getBadges);

// ── Rewards ───────────────────────────────────────────────
router.get('/rewards', getRewards);
router.post('/rewards/:id/redeem', redeemReward);

// ── Leaderboard ───────────────────────────────────────────
router.get('/leaderboard', getLeaderboard);

module.exports = router;