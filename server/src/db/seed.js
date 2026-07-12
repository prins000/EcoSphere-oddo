// ============================================================
// EcoSphere ESG - Database Seed Script
// Populates the database with demo data using raw SQL
// ============================================================

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ecosphere_esg',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function seed() {
  console.log('🌱 Seeding EcoSphere ESG database...\n');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Clean existing data ─────────────────────────────
    console.log('🧹 Cleaning existing data...');
    await client.query(`
      TRUNCATE notifications, reward_redemptions, user_badges, challenge_participations,
      employee_participations, policy_acknowledgements, compliance_issues, department_scores,
      carbon_transactions, product_esg_profiles, environmental_goals, audits, challenges,
      csr_activities, esg_policies, emission_factors, rewards, badges, categories, users, departments
      CASCADE
    `);

    // ── Departments ─────────────────────────────────────
    console.log('🏢 Creating departments...');
    const deptRes = await client.query(`
      INSERT INTO departments (name, code, description) VALUES
        ('Engineering', 'ENG', 'Software and hardware engineering teams'),
        ('Operations', 'OPS', 'Manufacturing and logistics operations'),
        ('Human Resources', 'HR', 'People operations and employee wellbeing'),
        ('Finance', 'FIN', 'Financial planning and accounting'),
        ('Marketing', 'MKT', 'Brand management and communications'),
        ('Research & Development', 'RND', 'Innovation and product development')
      RETURNING id, code
    `);
    const depts = {};
    deptRes.rows.forEach(r => { depts[r.code] = r.id; });

    // ── Users ───────────────────────────────────────────
    console.log('👥 Creating users...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const mgrHash = await bcrypt.hash('manager123', 10);
    const headHash = await bcrypt.hash('head123', 10);
    const empHash = await bcrypt.hash('emp123', 10);

    const userRes = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, department_id, xp) VALUES
        ('admin@ecosphere.com', $1, 'Arjun', 'Patel', 'ADMIN', $7, 0),
        ('manager@ecosphere.com', $2, 'Priya', 'Sharma', 'ESG_MANAGER', $8, 0),
        ('head@ecosphere.com', $3, 'Rajesh', 'Kumar', 'DEPARTMENT_HEAD', $7, 0),
        ('employee@ecosphere.com', $4, 'Ananya', 'Desai', 'EMPLOYEE', $7, 350),
        ('ops.head@ecosphere.com', $5, 'Vikram', 'Singh', 'DEPARTMENT_HEAD', $8, 0),
        ('hr.head@ecosphere.com', $6, 'Meera', 'Nair', 'DEPARTMENT_HEAD', $9, 0),
        ('dev1@ecosphere.com', $4, 'Karan', 'Mehta', 'EMPLOYEE', $7, 720),
        ('dev2@ecosphere.com', $4, 'Sneha', 'Gupta', 'EMPLOYEE', $7, 540),
        ('ops1@ecosphere.com', $4, 'Amit', 'Verma', 'EMPLOYEE', $8, 480),
        ('mkt1@ecosphere.com', $4, 'Divya', 'Reddy', 'EMPLOYEE', $10, 290)
      RETURNING id, email
    `, [adminHash, mgrHash, headHash, empHash, headHash, headHash, depts.ENG, depts.OPS, depts.HR, depts.MKT]);

    const users = {};
    userRes.rows.forEach(r => { users[r.email.split('@')[0]] = r.id; });

    // ── Categories ──────────────────────────────────────
    console.log('📂 Creating categories...');
    const catRes = await client.query(`
      INSERT INTO categories (name, type, description, icon, color) VALUES
        ('Energy Consumption', 'environmental', 'Electricity, gas, and fuel usage', '⚡', '#F59E0B'),
        ('Transportation', 'environmental', 'Fleet and logistics emissions', '🚗', '#3B82F6'),
        ('Waste Management', 'environmental', 'Waste generation and disposal', '♻️', '#10B981'),
        ('Water Usage', 'environmental', 'Water consumption and treatment', '💧', '#06B6D4'),
        ('Community Service', 'social', 'Volunteer and community outreach', '🤝', '#8B5CF6'),
        ('Education & Training', 'social', 'Employee and community education', '📚', '#EC4899'),
        ('Health & Safety', 'governance', 'Workplace health and safety policies', '🏥', '#EF4444'),
        ('Data Privacy', 'governance', 'Data protection and privacy compliance', '🔒', '#6366F1')
      RETURNING id, name
    `);
    const cats = {};
    catRes.rows.forEach(r => { cats[r.name] = r.id; });

    // ── Emission Factors ────────────────────────────────
    console.log('🏭 Creating emission factors...');
    const efRes = await client.query(`
      INSERT INTO emission_factors (name, category_id, source, unit, factor, description) VALUES
        ('Grid Electricity', $1, 'ENERGY', 'kWh', 0.42, 'Average grid electricity emission factor'),
        ('Natural Gas', $1, 'ENERGY', 'm³', 2.0, 'Natural gas combustion'),
        ('Diesel Fuel', $2, 'FLEET', 'liter', 2.68, 'Diesel vehicle fuel combustion'),
        ('Petrol Fuel', $2, 'FLEET', 'liter', 2.31, 'Petrol vehicle fuel combustion'),
        ('Air Travel (Domestic)', $2, 'EXPENSE', 'km', 0.255, 'Domestic flight per passenger-km'),
        ('Air Travel (International)', $2, 'EXPENSE', 'km', 0.195, 'International flight per passenger-km'),
        ('General Waste', $3, 'OTHER', 'kg', 0.46, 'Mixed general waste to landfill'),
        ('Paper Procurement', $3, 'PURCHASE', 'kg', 1.84, 'Virgin paper production'),
        ('Steel (Manufacturing)', $1, 'MANUFACTURING', 'kg', 1.85, 'Steel production emission factor'),
        ('Water Supply', $4, 'OTHER', 'm³', 0.344, 'Municipal water supply and treatment')
      RETURNING id, name, factor
    `, [cats['Energy Consumption'], cats['Transportation'], cats['Waste Management'], cats['Water Usage']]);
    const efs = {};
    efRes.rows.forEach(r => { efs[r.name] = { id: r.id, factor: parseFloat(r.factor) }; });

    // ── Carbon Transactions ─────────────────────────────
    console.log('📊 Creating carbon transactions...');
    const txData = [
      [users.admin, depts.ENG, efs['Grid Electricity'].id, 'ENERGY', 15000, 'Monthly office electricity', '2026-06-01'],
      [users['ops.head'], depts.OPS, efs['Diesel Fuel'].id, 'FLEET', 2500, 'Delivery fleet fuel', '2026-06-01'],
      [users.employee, depts.ENG, efs['Air Travel (Domestic)'].id, 'EXPENSE', 3200, 'Conference travel - Mumbai', '2026-06-01'],
      [users.ops1, depts.OPS, efs['Steel (Manufacturing)'].id, 'MANUFACTURING', 5000, 'Monthly steel processing', '2026-06-01'],
      [users.admin, depts.ENG, efs['Grid Electricity'].id, 'ENERGY', 16200, 'Monthly office electricity', '2026-05-01'],
      [users['ops.head'], depts.OPS, efs['Diesel Fuel'].id, 'FLEET', 2800, 'Delivery fleet fuel', '2026-05-01'],
      [users.mkt1, depts.MKT, efs['Air Travel (International)'].id, 'EXPENSE', 8500, 'International conference trip', '2026-05-01'],
      [users.dev1, depts.ENG, efs['Paper Procurement'].id, 'PURCHASE', 200, 'Paper supplies procurement', '2026-06-01'],
    ];

    for (const tx of txData) {
      const efName = Object.entries(efs).find(([_, v]) => v.id === tx[2]);
      const carbonKg = tx[4] * (efName ? efName[1].factor : 1);
      await client.query(`
        INSERT INTO carbon_transactions (user_id, department_id, emission_factor_id, source, quantity, carbon_kg, description, transaction_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [tx[0], tx[1], tx[2], tx[3], tx[4], carbonKg, tx[5], tx[6]]);
    }

    // ── Product ESG Profiles ────────────────────────────
    console.log('📦 Creating product ESG profiles...');
    await client.query(`
      INSERT INTO product_esg_profiles (product_name, product_code, carbon_footprint, recyclable_percent, sustainable_source, eco_label, lifecycle_stage) VALUES
        ('EcoWidget Pro', 'EW-001', 12.5, 85, true, 'Grade A', 'manufacturing'),
        ('GreenBoard X1', 'GB-001', 8.3, 92, true, 'Grade A+', 'distribution'),
        ('Standard Chassis', 'SC-001', 45.2, 60, false, 'Grade C', 'raw_material')
    `);

    // ── Environmental Goals ─────────────────────────────
    console.log('🎯 Creating environmental goals...');
    await client.query(`
      INSERT INTO environmental_goals (title, description, department_id, target_value, current_value, unit, start_date, end_date, status) VALUES
        ('Reduce Energy Consumption by 20%', 'Decrease office electricity usage through smart building controls', $1, 20, 12, '%', '2026-01-01', '2026-12-31', 'ON_TRACK'),
        ('Zero Waste to Landfill', 'Achieve 100% waste diversion through recycling and composting', $2, 100, 78, '%', '2026-01-01', '2026-12-31', 'ON_TRACK'),
        ('Fleet Electrification', 'Convert 50% of delivery fleet to electric vehicles', $2, 50, 15, '%', '2026-01-01', '2026-12-31', 'AT_RISK'),
        ('Carbon Neutral Office', 'Offset all office emissions through verified carbon credits', $3, 500, 200, 'tCO2e', '2026-01-01', '2026-06-30', 'BEHIND')
    `, [depts.ENG, depts.OPS, depts.FIN]);

    // ── ESG Policies ────────────────────────────────────
    console.log('📋 Creating ESG policies...');
    const polRes = await client.query(`
      INSERT INTO esg_policies (title, content, version, category, creator_id, requires_ack, reminder_days) VALUES
        ('Environmental Sustainability Policy', 'This policy outlines our commitment to reducing environmental impact across all operations.', '2.1', 'environmental', $1, true, 90),
        ('Diversity & Inclusion Policy', 'We are committed to building a diverse and inclusive workplace.', '1.3', 'social', $1, true, 180),
        ('Anti-Bribery & Corruption Policy', 'Zero tolerance policy for bribery and corruption.', '3.0', 'governance', $1, true, 365),
        ('Data Privacy & Protection Policy', 'Comprehensive data protection framework aligned with GDPR.', '2.0', 'governance', $2, true, 180),
        ('Green Procurement Policy', 'Guidelines for sustainable procurement practices.', '1.0', 'environmental', $2, false, 30)
      RETURNING id
    `, [users.admin, users.manager]);
    const policyIds = polRes.rows.map(r => r.id);

    // ── Policy Acknowledgements ─────────────────────────
    console.log('✅ Creating policy acknowledgements...');
    await client.query(`INSERT INTO policy_acknowledgements (user_id, policy_id) VALUES ($1, $2)`, [users.employee, policyIds[0]]);
    await client.query(`INSERT INTO policy_acknowledgements (user_id, policy_id) VALUES ($1, $2)`, [users.dev1, policyIds[0]]);
    await client.query(`INSERT INTO policy_acknowledgements (user_id, policy_id) VALUES ($1, $2)`, [users.dev1, policyIds[1]]);
    await client.query(`INSERT INTO policy_acknowledgements (user_id, policy_id) VALUES ($1, $2)`, [users.employee, policyIds[2]]);
    await client.query(`INSERT INTO policy_acknowledgements (user_id, policy_id) VALUES ($1, $2)`, [users.ops1, policyIds[0]]);


    // ── Badges ──────────────────────────────────────────
    console.log('🏅 Creating badges...');
    const badgeRes = await client.query(`
      INSERT INTO badges (name, description, icon, color, criteria, xp_required, category) VALUES
        ('Green Pioneer', 'Complete your first environmental challenge', '🌱', '#10B981', '{"type":"challenges_completed","category":"environmental","count":1}', 0, 'environmental'),
        ('Carbon Crusher', 'Reduce personal carbon footprint by 10%', '💪', '#059669', '{"type":"carbon_reduction","percentage":10}', 200, 'environmental'),
        ('Community Champion', 'Participate in 5 CSR activities', '🏆', '#3B82F6', '{"type":"csr_participations","count":5}', 0, 'social'),
        ('Policy Pro', 'Acknowledge all active policies', '📜', '#8B5CF6', '{"type":"policies_acknowledged","count":"all"}', 0, 'governance'),
        ('Rising Star', 'Earn 500 XP', '⭐', '#F59E0B', '{"type":"xp_earned","amount":500}', 500, 'special'),
        ('ESG Warrior', 'Earn 1000 XP', '🛡️', '#EF4444', '{"type":"xp_earned","amount":1000}', 1000, 'special'),
        ('Tree Hugger', 'Participate in a tree planting event', '🌳', '#22C55E', '{"type":"activity_type","activityName":"tree"}', 0, 'environmental'),
        ('Zero Waste Hero', 'Achieve zero waste for a month', '♻️', '#14B8A6', '{"type":"zero_waste","months":1}', 0, 'environmental')
      RETURNING id, name
    `);
    const badges = {};
    badgeRes.rows.forEach(r => { badges[r.name] = r.id; });

    // ── Award some badges ───────────────────────────────
    await client.query(`
      INSERT INTO user_badges (user_id, badge_id, awarded_by) VALUES
        ($1, $3, 'system'), ($1, $4, 'system'), ($2, $3, 'system'), ($5, $4, 'system')
    `, [users.dev1, users.employee, badges['Green Pioneer'], badges['Rising Star'], users.dev2]);

    // ── CSR Activities ──────────────────────────────────
    console.log('🤝 Creating CSR activities...');
    const csrRes = await client.query(`
      INSERT INTO csr_activities (title, description, category_id, department_id, creator_id, approver_id, status, hours_required, max_participants, xp_reward, start_date, end_date, location, impact_metric, impact_value) VALUES
        ('Tree Planting Drive', 'Plant 500 trees in the local community park', $1, $3, $4, $5, 'APPROVED', 4, 50, 100, '2026-07-15', '2026-07-15', 'Green Valley Community Park', 'trees planted', 500),
        ('STEM Workshop for Students', 'Conduct coding workshops for underprivileged students', $2, $3, $6, NULL, 'APPROVED', 6, 20, 150, '2026-07-20', '2026-07-20', 'City Public School', 'students reached', 120),
        ('Beach Cleanup Campaign', 'Monthly beach cleanup to remove plastic waste', $1, NULL, $7, NULL, 'SUBMITTED', 3, NULL, 75, '2026-08-01', NULL, 'Juhu Beach', NULL, NULL),
        ('Blood Donation Camp', 'Annual blood donation drive with Red Cross', $1, $8, $9, $5, 'APPROVED', 2, NULL, 80, '2026-07-25', NULL, 'Company Campus', 'units collected', 200)
      RETURNING id
    `, [cats['Community Service'], cats['Education & Training'], depts.ENG, users.manager, users.admin, users.head, users.employee, depts.HR, users['hr.head']]);
    const csrIds = csrRes.rows.map(r => r.id);

    // ── Employee Participations ─────────────────────────
    console.log('🙋 Creating employee participations...');
    await client.query(`
      INSERT INTO employee_participations (user_id, activity_id, hours_logged, status, xp_awarded) VALUES
        ($1, $5, 4, 'APPROVED', 100), ($2, $5, 4, 'APPROVED', 100),
        ($3, $6, 6, 'APPROVED', 150), ($4, $7, 2, 'SUBMITTED', 0)
    `, [users.dev1, users.dev2, users.employee, users.ops1, csrIds[0], csrIds[1], csrIds[3]]);

    // ── Challenges ──────────────────────────────────────
    console.log('🏋️ Creating challenges...');
    const chRes = await client.query(`
      INSERT INTO challenges (title, description, type, department_id, status, xp_reward, target_value, unit, start_date, end_date, badge_id) VALUES
        ('Bike to Work Week', 'Use cycling or public transport for your daily commute', 'environmental', NULL, 'ACTIVE', 200, 5, 'days', '2026-07-10', '2026-07-20', $1),
        ('Energy Saving Sprint', 'Reduce your department electricity usage by 10%', 'environmental', $5, 'ACTIVE', 300, 10, '% reduction', '2026-07-01', '2026-07-31', NULL),
        ('100 Hours of Service', 'Collectively volunteer 100 hours', 'social', NULL, 'ACTIVE', 250, 100, 'hours', '2026-07-01', '2026-08-31', $2),
        ('Policy Compliance Blitz', 'All employees acknowledge latest policies', 'governance', NULL, 'UPCOMING', 150, 100, '% compliance', '2026-08-01', '2026-08-15', $3),
        ('Zero Paper Month', 'Go completely paperless for a month', 'environmental', $6, 'ACTIVE', 180, 0, 'pages printed', '2026-07-01', '2026-07-31', $4)
      RETURNING id
    `, [badges['Green Pioneer'], badges['Community Champion'], badges['Policy Pro'], badges['Zero Waste Hero'], depts.ENG, depts.FIN]);
    const chIds = chRes.rows.map(r => r.id);

    // ── Challenge Participations ────────────────────────
    await client.query(`
      INSERT INTO challenge_participations (user_id, challenge_id, progress, is_completed, status, xp_awarded, completed_at) VALUES
        ($1, $5, 3, false, 'APPROVED', 0, NULL),
        ($2, $5, 5, true, 'APPROVED', 200, NOW()),
        ($3, $6, 7, false, 'APPROVED', 0, NULL),
        ($4, $7, 12, false, 'APPROVED', 0, NULL)
    `, [users.dev1, users.dev2, users.employee, users.ops1, chIds[0], chIds[1], chIds[2]]);

    // ── Rewards ─────────────────────────────────────────
    console.log('🎁 Creating rewards...');
    await client.query(`
      INSERT INTO rewards (name, description, xp_cost, stock, category) VALUES
        ('Eco-Friendly Water Bottle', 'Premium stainless steel reusable water bottle', 200, 50, 'merchandise'),
        ('Plant-a-Tree Certificate', 'We plant a tree in your name', 100, 999, 'donation'),
        ('Extra Day Off', 'One additional paid day off', 1000, 10, 'benefit'),
        ('Sustainable Gift Box', 'Curated box of eco-friendly products', 500, 25, 'merchandise'),
        ('Carbon Offset Credit', '1 tonne of verified carbon offset credits', 300, 100, 'donation')
    `);

    // ── Audits ──────────────────────────────────────────
    console.log('🔍 Creating audits...');
    const audRes = await client.query(`
      INSERT INTO audits (title, description, type, scope, department_id, auditor_id, creator_id, status, scheduled_date, completed_date, findings, score) VALUES
        ('Q2 2026 Environmental Audit', 'Quarterly review of environmental compliance', 'internal', 'environmental', $1, $3, $4, 'COMPLETED', '2026-06-15', '2026-06-20', 'Overall good compliance. Fleet emissions above target.', 78),
        ('Annual Governance Review', 'Comprehensive review of governance policies', 'external', 'governance', NULL, $4, $4, 'SCHEDULED', '2026-08-01', NULL, NULL, NULL),
        ('Social Impact Assessment', 'Assessment of CSR program effectiveness', 'internal', 'social', $2, $5, $3, 'IN_PROGRESS', '2026-07-01', NULL, 'Review in progress. Strong volunteer participation.', NULL)
      RETURNING id
    `, [depts.OPS, depts.HR, users.manager, users.admin, users['hr.head']]);
    const auditIds = audRes.rows.map(r => r.id);

    // ── Compliance Issues ───────────────────────────────
    console.log('⚠️ Creating compliance issues...');
    await client.query(`INSERT INTO compliance_issues (title, description, audit_id, owner_id, severity, status, due_date, is_overdue, resolved_at, resolution) VALUES ($1, 'Q2 fleet emissions exceeded target by 15%.', $2, $3, 'HIGH', 'IN_PROGRESS', '2026-07-31', false, NULL, NULL)`, ['Fleet Emission Target Exceeded', auditIds[0], users['ops.head']]);
    await client.query(`INSERT INTO compliance_issues (title, description, audit_id, owner_id, severity, status, due_date, is_overdue, resolved_at, resolution) VALUES ($1, '12 employees have not completed mandatory training.', $2, $3, 'MEDIUM', 'OPEN', '2026-07-15', false, NULL, NULL)`, ['Missing Safety Training Records', auditIds[0], users['hr.head']]);
    await client.query(`INSERT INTO compliance_issues (title, description, audit_id, owner_id, severity, status, due_date, is_overdue, resolved_at, resolution) VALUES ($1, 'Customer data found beyond 24-month retention limit.', NULL, $2, 'CRITICAL', 'OPEN', '2026-07-10', true, NULL, NULL)`, ['Data Retention Policy Violation', users.head]);
    await client.query(`INSERT INTO compliance_issues (title, description, audit_id, owner_id, severity, status, due_date, is_overdue, resolved_at, resolution) VALUES ($1, 'Factory floor waste bins not properly labeled.', $2, $3, 'LOW', 'RESOLVED', '2026-06-30', false, '2026-06-28', 'New bins installed. Staff training completed.')`, ['Waste Segregation Non-Compliance', auditIds[0], users['ops.head']]);

    // ── Department Scores ───────────────────────────────
    console.log('📈 Creating department scores...');
    const periods = ['2026-Q1', '2026-Q2'];
    for (const deptCode of Object.keys(depts)) {
      for (const period of periods) {
        const envScore = (60 + Math.random() * 30).toFixed(1);
        const socScore = (55 + Math.random() * 35).toFixed(1);
        const govScore = (65 + Math.random() * 25).toFixed(1);
        const overall = (envScore * 0.4 + socScore * 0.3 + govScore * 0.3).toFixed(1);
        await client.query(`
          INSERT INTO department_scores (department_id, environmental_score, social_score, governance_score, overall_score, period)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [depts[deptCode], envScore, socScore, govScore, overall, period]);
      }
    }

    // ── Notifications ───────────────────────────────────
    console.log('🔔 Creating notifications...');
    await client.query(`
      INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES
        ($1, 'BADGE_UNLOCK', '🏅 Badge Unlocked!', 'You earned the "Green Pioneer" badge!', '/gamification/leaderboard', false),
        ($2, 'COMPLIANCE_ISSUE', '⚠️ New Compliance Issue', 'Fleet Emission Target Exceeded assigned to you.', '/governance/audits', false),
        ($3, 'CSR_APPROVAL', '✅ CSR Activity Approved', 'Your STEM Workshop participation approved. 150 XP awarded!', '/social/csr', true),
        ($4, 'OVERDUE_ISSUE', '🚨 Overdue Compliance Issue', 'Data Retention Policy Violation is past due date.', '/governance/audits', false),
        ($5, 'CHALLENGE_APPROVAL', '🎉 Challenge Completed!', 'You completed Bike to Work Week! 200 XP awarded.', '/gamification/challenges', true),
        ($6, 'GENERAL', '📊 Monthly ESG Report Ready', 'Q2 2026 ESG summary report is available.', '/reports', false)
    `, [users.dev1, users['ops.head'], users.employee, users.head, users.dev2, users.admin]);

    await client.query('COMMIT');

    console.log('\n✅ Seeding completed successfully!');
    console.log('──────────────────────────────────────');
    console.log('  Demo accounts:');
    console.log('  Admin:     admin@ecosphere.com / admin123');
    console.log('  Manager:   manager@ecosphere.com / manager123');
    console.log('  Dept Head: head@ecosphere.com / head123');
    console.log('  Employee:  employee@ecosphere.com / emp123');
    console.log('──────────────────────────────────────');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
