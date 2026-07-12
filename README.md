# EcoSphere ESG Management Platform 🌍

A comprehensive ESG (Environmental, Social, Governance) Management Platform with gamification, AI insights, and beautiful dashboards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 4, Recharts |
| Backend | Node.js 20+, Express 4, Prisma ORM |
| Database | PostgreSQL 15+ |
| Auth | JWT + bcrypt |

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd EcoSphere-oddo
```

2. **Setup the server**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npx prisma migrate dev
npx prisma db seed
npm run dev
```

3. **Setup the client**
```bash
cd client
npm install
npm run dev
```

4. **Open the app**
Navigate to `http://localhost:5173`

## Modules

### 🌿 Environmental
Track carbon emissions, manage emission factors, set environmental goals, and monitor product ESG profiles.

### 🤝 Social
Manage CSR activities, track employee participation, monitor diversity metrics, and training completion.

### 🏛️ Governance
Create ESG policies, track audits, manage compliance issues, and automate overdue detection.

### 🎮 Gamification
Challenges, XP system, auto-awarded badges, rewards marketplace, and department leaderboards.

### 📊 Dashboard
ESG scorecards, KPI cards, interactive charts (pie, bar, line), sustainability heatmap, and trend predictions.

## Security Roles

| Role | Access |
|------|--------|
| Admin | Full system access |
| ESG Manager | All ESG data management |
| Department Head | Own department data |
| Employee | Participation & viewing |

## License
MIT
