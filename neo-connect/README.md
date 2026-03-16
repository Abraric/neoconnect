# NeoConnect — Staff Feedback & Complaint Management Platform

> A full-stack internal platform for Neostat employees to submit complaints, track cases, vote on polls, and view organisational impact — with real-time updates and role-based access control.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [User Roles](#user-roles)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Author](#author)

---

## Overview

NeoConnect is a staff-facing complaint and feedback management system built for Neostat. It provides a secure, role-aware platform where employees can raise issues anonymously or openly, track case resolution in real time, participate in workplace polls, and view the organisation's published impact outcomes.

**Core problem it solves:** Unstructured, informal feedback processes with no accountability, no tracking, and no visibility into outcomes.

**Solution:** A structured case lifecycle (NEW → ASSIGNED → IN_PROGRESS → PENDING → RESOLVED / ESCALATED) with automated escalation, role-based dashboards, and a public transparency hub.

---

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | Deployed on Vercel |
| Backend API | https://neoconnect-api-ghz4.onrender.com |
| Health Check | https://neoconnect-api-ghz4.onrender.com/health |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@neostat.com | Admin@123 |
| Secretariat | secretary@neostat.com | Secretary@123 |
| Case Manager | manager@neostat.com | Manager@123 |
| Staff | staff@neostat.com | Staff@123 |

---

## Features

### Staff
- Submit cases with category, severity, department, location, file attachments (JPEG/PNG/PDF)
- Anonymous submission option
- Auto-generated tracking ID (format: `NEO-2025-001`)
- Track case status with a visual progress stepper
- Add comments to own cases
- Withdraw pending cases
- Rate resolved cases (1–5 stars)
- Vote on active polls (one vote per user)
- View Public Hub (impact records, meeting minutes, quarterly digest)
- Real-time notifications via Socket.io

### Case Manager
- View assigned cases with full details
- Update case status (IN_PROGRESS → PENDING → RESOLVED)
- Add internal notes (hidden from staff)
- Request more information from submitter
- Reassign a case to another manager with reason
- Set custom follow-up reminders
- View personal workload summary (open/closed/escalated counts)

### Secretariat / Management
- Full case inbox with filters (status, category, department, severity)
- Assign cases to case managers (single or bulk)
- Mark cases as priority
- Create and manage announcements
- Create polls and close them
- Configure SLA targets per category and severity
- View department performance analytics
- Export case data
- Manage impact records and meeting minutes (Public Hub)

### Admin (IT)
- All Secretariat capabilities
- Manage users: create, update role, deactivate, reactivate, reset password
- Manage departments: add, rename, toggle active status
- View full audit log with export to CSV
- View role change history per user
- Configure escalation window rules per case category
- Real-time system health dashboard (PostgreSQL, MongoDB, Redis, JWT, API server — with sparkline latency charts)

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18 | HTTP framework |
| PostgreSQL | 15 | Relational data (users, cases, assignments) |
| Prisma | 5.10 | ORM for PostgreSQL |
| MongoDB | 7 | Document data (logs, comments, snapshots) |
| Mongoose | 8.2 | ODM for MongoDB |
| Redis (Upstash) | — | Caching, BullMQ queues |
| ioredis | 5.3 | Redis client |
| BullMQ | 5.4 | Background job queues |
| Socket.io | 4.7 | Real-time communication |
| JWT | 9.0 | Authentication tokens |
| bcryptjs | 2.4 | Password hashing |
| Multer | 1.4 | File upload handling |
| Winston | 3.12 | Logging |
| Joi | 17.12 | Request validation |
| Helmet | 7.1 | HTTP security headers |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.1 | React framework (App Router) |
| React | 18.2 | UI library |
| TypeScript | 5.4 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| shadcn/ui | latest | Component library (Radix UI) |
| Zustand | 4.5 | Global state management |
| Axios | 1.6 | HTTP client with interceptors |
| Socket.io-client | 4.7 | Real-time client |
| Recharts | 2.12 | Charts and sparklines |
| Lucide React | 0.344 | Icons |
| jose | 5.2 | JWT edge verification |

### Infrastructure
| Service | Provider |
|---------|---------|
| Frontend hosting | Vercel |
| Backend hosting | Render (Node web service) |
| PostgreSQL | Neon (serverless Postgres) |
| MongoDB | MongoDB Atlas |
| Redis | Upstash (serverless Redis) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                     │
│              Next.js 14 — TypeScript — Tailwind          │
│                                                          │
│  Pages: Login, Dashboard, Cases, Submit, Analytics,      │
│  Admin, Workload, Polls, Public Hub, System Health       │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS + WebSocket
┌──────────────────────▼───────────────────────────────────┐
│                   BACKEND (Render)                        │
│              Node.js + Express 4 — REST API               │
│                                                          │
│  Middleware: JWT Auth → Role Check → Validate → Handle   │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │Controllers│  │ Services │  │   Socket.io Server   │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐    │
│  │             Repository Layer (DAL)                │    │
│  └────────────┬─────────────────────────────────────┘    │
└───────────────┼──────────────────────────────────────────┘
                │
     ┌──────────┴──────────────────────────┐
     │                                     │
┌────▼────────────┐              ┌─────────▼────────────┐
│  PostgreSQL     │              │  MongoDB Atlas        │
│  (Neon)         │              │                       │
│                 │              │  • CaseComments       │
│  • Users        │              │  • InternalNotes      │
│  • Cases        │              │  • CaseLogs           │
│  • Assignments  │              │  • Reminders          │
│  • Polls/Votes  │              │  • Announcements      │
│  • Notifications│              │  • AnalyticsSnapshots │
│  • ImpactRecords│              │  • EscalationRules    │
└─────────────────┘              └──────────────────────┘
                                          │
                              ┌───────────▼──────────────┐
                              │   Redis (Upstash)         │
                              │                           │
                              │  • BullMQ Queues          │
                              │  • Escalation Jobs        │
                              │  • Analytics Jobs         │
                              │  • Hotspot Detection      │
                              └──────────────────────────┘
```

---

## Database Design

### PostgreSQL (Relational — via Prisma)

Core transactional data with strict relationships.

```
User ────────────── Department
  │
  ├── Case (submitter)
  │     ├── CaseAssignment ── User (manager)
  │     ├── CaseStatusLog
  │     ├── Notification
  │     └── OutboxEvent
  │
  ├── Poll (creator)
  │     ├── PollOption
  │     └── Vote ── User
  │
  ├── ImpactRecord
  └── MeetingMinute
```

**Case Status Lifecycle:**
```
NEW → ASSIGNED → IN_PROGRESS → PENDING → RESOLVED
                                    └──────────── ESCALATED
```

### MongoDB (Document — via Mongoose)

Write-heavy and time-series data.

| Collection | Purpose |
|-----------|---------|
| CaseComment | Public discussion on cases |
| CaseInternalNote | Manager-only notes (hidden from staff) |
| CaseLog | Immutable audit trail (insert-only) |
| CaseReminder | Manager follow-up reminders |
| CaseRating | Post-resolution satisfaction score |
| Attachment | File upload metadata |
| EscalationRule | Per-category SLA escalation windows |
| SlaTarget | Resolution time targets by severity |
| Announcement | Scheduled/sent announcements |
| AnalyticsSnapshot | Cached dashboard data (TTL: 90 days) |
| RoleChangeLog | User role change audit history |
| SystemLog | System-level event logs |

---

## User Roles

| Role | Access Level |
|------|-------------|
| `STAFF` | Submit cases, view own cases, vote, view public hub |
| `CASE_MANAGER` | Manage assigned cases, internal notes, workload |
| `SECRETARIAT` | Full case inbox, analytics, announcements, polls |
| `ADMIN` | All of the above + user management, system health |

Role hierarchy: STAFF < CASE_MANAGER < SECRETARIAT < ADMIN

---

## API Endpoints

Base URL: `https://neoconnect-api-ghz4.onrender.com/api`

### Authentication
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/auth/login` | Login with email + password |
| POST | `/auth/verify-otp` | OTP verification |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |

### Cases
| Method | Endpoint | Role | Description |
|--------|---------|------|-------------|
| POST | `/cases` | All | Submit new case |
| GET | `/cases` | All | List cases (filtered) |
| GET | `/cases/summary` | All | Case stats summary |
| GET | `/cases/:id` | All | Case detail |
| PATCH | `/cases/:id/status` | CASE_MANAGER | Update status |
| PATCH | `/cases/:id/assign` | SECRETARIAT, ADMIN | Assign to manager |
| POST | `/cases/bulk-assign` | SECRETARIAT, ADMIN | Bulk assign |
| PATCH | `/cases/:id/priority` | SECRETARIAT, ADMIN | Toggle priority |
| PATCH | `/cases/:id/withdraw` | STAFF | Withdraw case |
| POST | `/cases/:id/comments` | All | Add comment |
| POST | `/cases/:id/rating` | STAFF | Rate resolved case |
| GET | `/cases/:id/internal-notes` | MANAGER+ | Internal notes |
| POST | `/cases/:id/internal-notes` | MANAGER+ | Add internal note |
| POST | `/cases/:id/request-info` | MANAGER+ | Request info from submitter |
| PATCH | `/cases/:id/reassign` | MANAGER+ | Reassign case |
| POST | `/cases/:id/reminders` | CASE_MANAGER | Set follow-up reminder |
| GET | `/cases/workload/summary` | CASE_MANAGER | Workload stats |

### Admin (ADMIN only)
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/admin/users` | List all users |
| POST | `/admin/users` | Create user |
| PATCH | `/admin/users/:id` | Update user role/dept |
| PATCH | `/admin/users/:id/deactivate` | Deactivate user |
| PATCH | `/admin/users/:id/reactivate` | Reactivate user |
| PATCH | `/admin/users/:id/reset-password` | Reset password |
| GET | `/admin/users/:id/role-history` | Role change log |
| GET | `/admin/departments` | List departments |
| POST | `/admin/departments` | Create department |
| PATCH | `/admin/departments/:id` | Rename department |
| PATCH | `/admin/departments/:id/toggle` | Toggle active status |
| GET | `/admin/health` | System health |
| GET | `/admin/escalation-rules` | List rules |
| POST | `/admin/escalation-rules` | Upsert escalation rule |
| GET | `/admin/audit-log/export` | Export audit log as CSV |

### Other Endpoints
| Method | Endpoint | Role | Description |
|--------|---------|------|-------------|
| GET | `/polls` | All | List polls |
| POST | `/polls` | SECRETARIAT, ADMIN | Create poll |
| POST | `/polls/:id/vote` | All | Cast vote |
| PATCH | `/polls/:id/close` | SECRETARIAT, ADMIN | Close poll |
| GET | `/analytics/dashboard` | MANAGER+ | Dashboard metrics |
| GET | `/analytics/export` | MANAGER+ | Export data |
| GET | `/public/digest` | All | Quarterly digest |
| GET | `/public/impact` | All | Impact records |
| POST | `/public/impact` | SECRETARIAT, ADMIN | Add impact record |
| GET | `/notifications` | All | User notifications |
| PATCH | `/notifications/read-all` | All | Mark all read |
| GET | `/announcements` | All | View announcements |
| POST | `/announcements` | SECRETARIAT, ADMIN | Create announcement |
| GET | `/sla` | All | SLA targets |
| PUT | `/sla` | SECRETARIAT, ADMIN | Update SLA target |
| GET | `/audit-logs` | ADMIN | View audit logs |

---

## Project Structure

```
neo-connect/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma           # PostgreSQL schema (12 models)
│   ├── src/
│   │   ├── app.js                  # Express app setup
│   │   ├── server.js               # Entry point
│   │   ├── socket.js               # Socket.io configuration
│   │   ├── config/                 # DB and Redis configs
│   │   ├── constants/              # Enums, roles, status values
│   │   ├── controllers/            # Request handlers (9 controllers)
│   │   ├── domain/case/            # Case business logic (lifecycle, rules)
│   │   ├── middleware/             # Auth, RBAC, validation, upload
│   │   ├── models/mongo/           # Mongoose schemas (12 collections)
│   │   ├── queues/                 # BullMQ queue setup
│   │   ├── repositories/           # Data access layer (9 repositories)
│   │   ├── routes/                 # Express route files (11 files)
│   │   ├── seeds/                  # Database seeders
│   │   ├── services/               # Business logic services
│   │   ├── utils/                  # Logger, pagination, tracking ID
│   │   ├── validators/             # Joi validation schemas
│   │   └── workers/                # Background workers (3)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages (15 pages)
│   │   │   ├── dashboard/
│   │   │   ├── cases/[caseId]/
│   │   │   ├── submit-case/
│   │   │   ├── analytics/
│   │   │   ├── admin/
│   │   │   ├── workload/
│   │   │   ├── polls/
│   │   │   ├── public-hub/
│   │   │   ├── system-health/
│   │   │   ├── notifications/
│   │   │   ├── announcements/
│   │   │   ├── sla-settings/
│   │   │   └── audit-log/
│   │   ├── components/             # Reusable UI components
│   │   │   └── ui/                 # 22 shadcn/ui components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/               # API service layer (Axios)
│   │   ├── store/                  # Zustand global state
│   │   ├── types/                  # TypeScript interfaces
│   │   └── utils/                  # Helper functions
│   ├── middleware.ts               # Next.js edge auth middleware
│   └── package.json
│
├── README.md
└── package.json                    # Monorepo root
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Neon account)
- MongoDB 7+ (or Atlas account)
- Redis 7+ (or Upstash account)

### 1. Clone the Repository

```bash
git clone https://github.com/Abraric/neoconnect.git
cd neoconnect/neo-connect
```

### 2. Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Configure Environment Variables

Create `backend/.env` and `frontend/.env.local` using the variables listed below.

### 4. Set Up Databases

```bash
cd backend

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# Seed initial users and departments
npm run db:seed
npm run db:seed:data
```

### 5. Run the Application

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development

POSTGRES_URL=postgresql://user:password@localhost:5432/NeoConnect
MONGODB_URI=mongodb://localhost:27017/NeoConnect
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## Deployment

### Backend — Render

1. Connect GitHub repo to Render → New Web Service
2. Root Directory: `neo-connect/backend`
3. Build Command: `npm install && npx prisma generate`
4. Start Command: `npm start`
5. Add environment variables in Render dashboard

### Frontend — Vercel

1. Connect GitHub repo to Vercel → New Project
2. Root Directory: `neo-connect/frontend`
3. Framework: Next.js (auto-detected)
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → `https://your-render-url.onrender.com/api`
   - `NEXT_PUBLIC_SOCKET_URL` → `https://your-render-url.onrender.com`

### Background Workers (separate Render services)

```bash
npm run worker:escalation   # Auto-escalates overdue cases
npm run worker:analytics    # Generates analytics snapshots
npm run worker:hotspot      # Detects complaint hotspots
```

---

## Key Implementation Highlights

- **Dual Database Architecture** — PostgreSQL (Prisma) for transactional data, MongoDB (Mongoose) for event logs and documents, chosen to match data access patterns
- **Real-time Updates** — Socket.io with JWT-authenticated rooms for instant notifications and case updates across all connected clients
- **Background Job Processing** — BullMQ + Redis workers run independently from the HTTP server to handle escalation enforcement, analytics, and hotspot detection
- **Automatic Escalation** — Cases not updated within the configured window (default 7 days, configurable per category) are automatically escalated via BullMQ scheduled jobs
- **Immutable Audit Trail** — MongoDB CaseLog uses Mongoose pre-save middleware to block all updates — records are insert-only by design
- **Anonymous Submissions** — Submitter identity hidden from case managers; only audit-trail references are kept for compliance
- **Role-Based Access Control** — Every API route protected at middleware level; service layer enforces additional business rules
- **System Health Monitoring** — Admin-only dashboard with 5-second auto-polling and sparkline latency charts for all infrastructure services

---

## Author

**Syed Abrar C**
NeoConnect — Built for Neostat
