# NeoConnect

Staff feedback and complaint management platform.

## Stack

**Backend**: Node.js · Express · PostgreSQL (Prisma) · MongoDB (Mongoose) · BullMQ/Redis · Socket.io
**Frontend**: Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Recharts · Zustand

## Quick Start

### Prerequisites

- Node.js 18+, npm 9+
- PostgreSQL 15 running on `localhost:5432` — create DB `NeoConnect`
- MongoDB 6 running on `localhost:27017`
- Redis (Upstash) — get connection URL from [upstash.com](https://upstash.com)

### Backend

```bash
cd backend
npm install
cp .env.example .env          # fill in DB URLs and secrets
npx prisma migrate dev --name init
npx prisma generate
node ../scripts/seedDepartments.js
node ../scripts/seedUsers.js
npm run dev                   # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL
npm run dev                   # http://localhost:3000
```

### Background Workers (optional, dev)

```bash
cd backend
npm run worker:escalation     # 7-day escalation processor
npm run worker:analytics      # analytics snapshot generator
```

Or run everything together:

```bash
npm run dev:all               # from repo root (uses concurrently)
```

## Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@neoconnect.com | Admin@123 |
| Secretariat | secretariat@neoconnect.com | Secret@123 |
| Case Manager | manager@neoconnect.com | Manager@123 |
| Staff | staff@neoconnect.com | Staff@123 |

## Features

- **Case Submission** — file uploads, anonymous option, auto tracking ID (NEO-YYYY-NNN)
- **Case Management** — inbox, assignment, 7-working-day auto-escalation via BullMQ
- **Polling System** — create polls, one vote per user, live results charts
- **Public Hub** — quarterly digest, impact records, meeting minutes archive
- **Analytics Dashboard** — department heatmap, hotspot flagging (5+ open cases same dept+category)
- **Real-time Notifications** — Socket.io with per-user rooms
- **Role-based Access** — Staff · Secretariat · Case Manager · Admin

## Roles

| Role | Capabilities |
|------|-------------|
| Staff | Submit cases, track own cases, vote on polls |
| Secretariat | View all cases, assign to managers, create polls, manage public hub |
| Case Manager | Manage assigned cases, update status, resolve |
| Admin | Full user management, all views |
