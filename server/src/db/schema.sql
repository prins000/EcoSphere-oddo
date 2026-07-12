-- ============================================================
-- EcoSphere ESG - Database Schema
-- Plain PostgreSQL DDL for all tables
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ── ENUM Types ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'ESG_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE emission_source AS ENUM ('PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET', 'ENERGY', 'WASTE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE challenge_status AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'COMPLIANCE_ISSUE', 'BADGE_UNLOCK', 'CSR_APPROVAL', 'CHALLENGE_APPROVAL',
    'POLICY_REMINDER', 'OVERDUE_ISSUE', 'XP_EARNED', 'REWARD_REDEEMED', 'GENERAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE goal_status AS ENUM ('ON_TRACK', 'AT_RISK', 'BEHIND', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Departments ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) UNIQUE NOT NULL,
  code          VARCHAR(20)  UNIQUE NOT NULL,
  description   TEXT,
  head_id       UUID,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ── Users ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password       VARCHAR(255) NOT NULL,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  role           user_role DEFAULT 'EMPLOYEE',
  avatar         VARCHAR(500),
  xp             INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT true,
  department_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- ── Categories ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) UNIQUE NOT NULL,
  type         VARCHAR(50) NOT NULL,  -- 'environmental', 'social', 'governance'
  description  TEXT,
  icon         VARCHAR(50),
  color        VARCHAR(20),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ── Emission Factors ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emission_factors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  source       emission_source NOT NULL,
  unit         VARCHAR(50) NOT NULL,
  factor       DECIMAL(12,6) NOT NULL,
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, source)
);

CREATE INDEX IF NOT EXISTS idx_ef_source ON emission_factors(source);
CREATE INDEX IF NOT EXISTS idx_ef_category ON emission_factors(category_id);

-- ── Carbon Transactions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS carbon_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id     UUID REFERENCES departments(id) ON DELETE SET NULL,
  emission_factor_id UUID REFERENCES emission_factors(id) ON DELETE SET NULL,
  source            emission_source NOT NULL,
  quantity          DECIMAL(12,4) NOT NULL,
  carbon_kg         DECIMAL(12,4) NOT NULL,
  description       TEXT,
  reference_doc     VARCHAR(255),
  transaction_date  TIMESTAMP DEFAULT NOW(),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ct_dept ON carbon_transactions(department_id);
CREATE INDEX IF NOT EXISTS idx_ct_user ON carbon_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ct_source ON carbon_transactions(source);
CREATE INDEX IF NOT EXISTS idx_ct_date ON carbon_transactions(transaction_date);

-- ── Product ESG Profiles ────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_esg_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name        VARCHAR(255) NOT NULL,
  product_code        VARCHAR(100) UNIQUE NOT NULL,
  emission_factor_id  UUID REFERENCES emission_factors(id) ON DELETE SET NULL,
  carbon_footprint    DECIMAL(12,4) NOT NULL,
  recyclable_percent  DECIMAL(5,2) DEFAULT 0,
  sustainable_source  BOOLEAN DEFAULT false,
  eco_label           VARCHAR(100),
  lifecycle_stage     VARCHAR(50),
  description         TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- ── Environmental Goals ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS environmental_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  target_value  DECIMAL(12,4) NOT NULL,
  current_value DECIMAL(12,4) DEFAULT 0,
  unit          VARCHAR(50) DEFAULT 'tCO2e',
  start_date    TIMESTAMP NOT NULL,
  end_date      TIMESTAMP NOT NULL,
  status        goal_status DEFAULT 'ON_TRACK',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eg_dept ON environmental_goals(department_id);
CREATE INDEX IF NOT EXISTS idx_eg_status ON environmental_goals(status);

-- ── ESG Policies ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esg_policies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  content        TEXT NOT NULL,
  version        VARCHAR(20) DEFAULT '1.0',
  category       VARCHAR(50) NOT NULL,
  creator_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active      BOOLEAN DEFAULT true,
  requires_ack   BOOLEAN DEFAULT true,
  reminder_days  INTEGER DEFAULT 30,
  effective_date TIMESTAMP DEFAULT NOW(),
  expiry_date    TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pol_category ON esg_policies(category);
CREATE INDEX IF NOT EXISTS idx_pol_active ON esg_policies(is_active);

-- ── Policy Acknowledgements ─────────────────────────────────

CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  policy_id       UUID REFERENCES esg_policies(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP DEFAULT NOW(),
  signature       TEXT,
  notes           TEXT,
  UNIQUE(user_id, policy_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_policy ON policy_acknowledgements(policy_id);

-- ── CSR Activities ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS csr_activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(255) NOT NULL,
  description       TEXT NOT NULL,
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  department_id     UUID REFERENCES departments(id) ON DELETE SET NULL,
  creator_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  approver_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  status            approval_status DEFAULT 'DRAFT',
  evidence_required BOOLEAN DEFAULT false,
  hours_required    DECIMAL(8,2) DEFAULT 0,
  max_participants  INTEGER,
  xp_reward         INTEGER DEFAULT 50,
  start_date        TIMESTAMP NOT NULL,
  end_date          TIMESTAMP,
  location          VARCHAR(255),
  impact_metric     VARCHAR(255),
  impact_value      DECIMAL(12,4),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csr_status ON csr_activities(status);
CREATE INDEX IF NOT EXISTS idx_csr_dept ON csr_activities(department_id);

-- ── Employee Participations ─────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_participations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_id     UUID REFERENCES csr_activities(id) ON DELETE CASCADE,
  hours_logged    DECIMAL(8,2) DEFAULT 0,
  evidence        VARCHAR(500),
  evidence_type   VARCHAR(50),
  feedback        TEXT,
  status          approval_status DEFAULT 'SUBMITTED',
  xp_awarded      INTEGER DEFAULT 0,
  participated_at TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_ep_activity ON employee_participations(activity_id);
CREATE INDEX IF NOT EXISTS idx_ep_status ON employee_participations(status);

-- ── Badges ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon        VARCHAR(50) NOT NULL,
  color       VARCHAR(20) DEFAULT '#10B981',
  criteria    JSONB NOT NULL,
  xp_required INTEGER DEFAULT 0,
  category    VARCHAR(50) NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── User Badges (junction) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id   UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP DEFAULT NOW(),
  awarded_by VARCHAR(100),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_ub_user ON user_badges(user_id);

-- ── Challenges ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  description      TEXT NOT NULL,
  type             VARCHAR(50) NOT NULL,
  department_id    UUID REFERENCES departments(id) ON DELETE SET NULL,
  status           challenge_status DEFAULT 'UPCOMING',
  xp_reward        INTEGER DEFAULT 100,
  target_value     DECIMAL(12,4),
  unit             VARCHAR(50),
  max_participants INTEGER,
  start_date       TIMESTAMP NOT NULL,
  end_date         TIMESTAMP NOT NULL,
  badge_id         UUID REFERENCES badges(id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ch_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_ch_type ON challenges(type);

-- ── Challenge Participations ────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_participations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress     DECIMAL(12,4) DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  status       approval_status DEFAULT 'SUBMITTED',
  evidence     VARCHAR(500),
  xp_awarded   INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  joined_at    TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_challenge ON challenge_participations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_cp_completed ON challenge_participations(is_completed);

-- ── Rewards ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rewards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  xp_cost     INTEGER NOT NULL,
  stock       INTEGER DEFAULT 0,
  category    VARCHAR(50) NOT NULL,
  image       VARCHAR(500),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ── Reward Redemptions ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_id   UUID REFERENCES rewards(id) ON DELETE CASCADE,
  xp_spent    INTEGER NOT NULL,
  status      VARCHAR(20) DEFAULT 'PENDING',
  redeemed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rr_user ON reward_redemptions(user_id);

-- ── Audits ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  type           VARCHAR(50) NOT NULL,
  scope          VARCHAR(50) NOT NULL,
  department_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
  auditor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  status         audit_status DEFAULT 'SCHEDULED',
  scheduled_date TIMESTAMP NOT NULL,
  completed_date TIMESTAMP,
  findings       TEXT,
  score          DECIMAL(5,2),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aud_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_aud_dept ON audits(department_id);

-- ── Compliance Issues ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  audit_id    UUID REFERENCES audits(id) ON DELETE SET NULL,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  severity    severity_level DEFAULT 'MEDIUM',
  status      VARCHAR(20) DEFAULT 'OPEN',
  due_date    TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  is_overdue  BOOLEAN DEFAULT false,
  resolution  TEXT,
  evidence    VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_severity ON compliance_issues(severity);
CREATE INDEX IF NOT EXISTS idx_ci_status ON compliance_issues(status);
CREATE INDEX IF NOT EXISTS idx_ci_owner ON compliance_issues(owner_id);
CREATE INDEX IF NOT EXISTS idx_ci_overdue ON compliance_issues(is_overdue);

-- ── Department Scores ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS department_scores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id        UUID REFERENCES departments(id) ON DELETE CASCADE,
  environmental_score  DECIMAL(5,2) DEFAULT 0,
  social_score         DECIMAL(5,2) DEFAULT 0,
  governance_score     DECIMAL(5,2) DEFAULT 0,
  overall_score        DECIMAL(5,2) DEFAULT 0,
  environmental_weight DECIMAL(5,2) DEFAULT 40,
  social_weight        DECIMAL(5,2) DEFAULT 30,
  governance_weight    DECIMAL(5,2) DEFAULT 30,
  period               VARCHAR(20) NOT NULL,
  calculated_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(department_id, period)
);

CREATE INDEX IF NOT EXISTS idx_ds_dept ON department_scores(department_id);
CREATE INDEX IF NOT EXISTS idx_ds_period ON department_scores(period);
CREATE INDEX IF NOT EXISTS idx_ds_score ON department_scores(overall_score);

-- ── Notifications ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  link       VARCHAR(500),
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);
