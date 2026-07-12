// ============================================================
// EcoSphere ESG - Main Server Entry Point
// Express application with middleware stack and route mounting
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const departmentRoutes = require('./routes/department.routes');
const environmentalRoutes = require('./routes/environmental.routes');
const socialRoutes = require('./routes/social.routes');
const governanceRoutes = require('./routes/governance.routes');
const gamificationRoutes = require('./routes/gamification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');

// Import cron jobs
const detectOverdueIssues = require('./cron/overdueDetection');
const autoAwardBadges = require('./cron/badgeAutoAward');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate Limiting ────────────────────────────────────
// General API limiter (lenient in dev)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  skip: (req) => req.method === 'GET', // Never rate-limit GET requests in dev
});
app.use('/api/', limiter);

// Auth-specific limiter (stricter — protects against brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Static Files (uploads) ───────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🌍 EcoSphere ESG API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/environmental', environmentalRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Error Handling ───────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Cron Jobs ────────────────────────────────────────────────
// Run overdue detection daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log('\n📅 [CRON] Daily overdue detection triggered');
  detectOverdueIssues();
});

// Run badge auto-award every hour
cron.schedule('0 * * * *', () => {
  console.log('\n📅 [CRON] Hourly badge auto-award triggered');
  autoAwardBadges();
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🌍 EcoSphere ESG API Server                    ║
  ║   ────────────────────────────────                ║
  ║   Port:        ${PORT}                              ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}     ║
  ║   Health:      http://localhost:${PORT}/api/health   ║
  ║   Cron:        Overdue (daily), Badges (hourly)   ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;