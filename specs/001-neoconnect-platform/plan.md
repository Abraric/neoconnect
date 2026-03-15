# Implementation Plan: NeoConnect Platform

**Branch**: `001-neoconnect-platform` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-neoconnect-platform/spec.md`

---

## Summary

NeoConnect is a full-stack staff feedback and complaint management platform. The backend is a Node.js/Express REST API with PostgreSQL (via Prisma) for transactional data and MongoDB (via Mongoose) for audit logs and attachments. A BullMQ/Redis queue handles 7-working-day escalation jobs. The frontend is Next.js 14 (App Router) with Tailwind CSS and shadcn/ui. Authentication uses JWT access tokens (memory) + refresh tokens (HttpOnly cookie) with role-based access control enforced at both middleware and API layers. Real-time notifications use Socket.io with Redis adapter.

---

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), JavaScript ESM (backend — can migrate to TS incrementally)
**Primary Dependencies**: Express 4, Prisma 5, Mongoose 8, BullMQ 5, Socket.io 4, Next.js 14, shadcn/ui, Tailwind CSS 3, jose (JWT edge), Multer, business-days-js, Recharts (charts)
**Storage**: PostgreSQL 15 (Prisma) + MongoDB 6 (Mongoose) + Redis (Upstash, BullMQ + Socket.io adapter)
**Testing**: Jest + Supertest (backend), Jest + React Testing Library (frontend), Playwright (E2E)
**Target Platform**: Local development (Windows/Linux/Mac); production-ready structure
**Project Type**: Web application (REST API + Next.js SPA)
**Performance Goals**: API p95 < 200ms; page initial render < 2s; analytics dashboard load < 5s
**Constraints**: JS bundle ≤ 250 KB gzipped initial load; no N+1 queries on user-facing paths; anonymous submissions must never leak submitter identity
**Scale/Scope**: Single-organisation, ~500 staff, ~50 concurrent users at peak

---

## Constitution Check

*GATE: Evaluated against Neostat Constitution v1.0.0*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — Readability, single responsibility, no dead code, linter | **PASS** | ESLint + Prettier configured; modules follow single responsibility (routes/controllers/services/repositories split) |
| I. Code Quality — Files ≤ 300 lines, functions ≤ 40 lines | **PASS** | Enforced via layered architecture; each file has one responsibility |
| I. Code Quality — Review gate (no self-merge to main) | **PASS** | Enforced via branch protection on main |
| II. Testing Standards — TDD, Red-Green-Refactor | **PASS** | Tasks specify tests-first for each service |
| II. Testing Standards — 80% unit coverage floor | **PASS** | Jest coverage threshold set in config |
| II. Testing Standards — Three-tier testing (unit + integration + E2E) | **PASS** | Unit (Jest), integration (Supertest), E2E (Playwright) all planned |
| II. Testing Standards — `given_when_then` test naming | **PASS** | Enforced by convention in tasks |
| III. UX Consistency — Design system (shadcn/ui only) | **PASS** | All UI components from shadcn/ui; custom components require justification |
| III. UX Consistency — Actionable error messages | **PASS** | API error codes mapped to user-friendly messages on frontend |
| III. UX Consistency — WCAG 2.1 AA accessibility | **PASS** | shadcn/ui components are accessible by default; audit planned pre-launch |
| III. UX Consistency — 100ms UI feedback on actions | **PASS** | Loading states on all form submissions and status changes |
| IV. Performance — API p95 < 200ms | **PASS** | Prisma queries optimised; analytics served from cache/snapshots |
| IV. Performance — Page load < 2s | **PASS** | Next.js App Router with server components for initial data; bundle budget enforced |
| IV. Performance — No N+1 queries | **PASS** | Prisma `include` for relations; analytics use aggregation queries |
| IV. Performance — JS bundle ≤ 250 KB gzipped | **PASS** | Recharts + shadcn tree-shaken; bundle analysed in CI |

**Result**: All gates pass. No violations requiring justification. ✅

---

## Project Structure

### Documentation (this feature)

```text
specs/001-neoconnect-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code

```text
neo-connect/
│
├── README.md
├── .gitignore
├── package.json                     # Root workspace config
│
├── scripts/
│   ├── seedUsers.js
│   ├── seedDepartments.js
│   └── generateEmbeddings.js
│
├── backend/
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma            # PostgreSQL schema (Prisma)
│   │
│   └── src/
│       ├── server.js                # Entry point — HTTP + Socket.io
│       ├── app.js                   # Express app factory
│       ├── socket.js                # Socket.io setup
│       │
│       ├── config/
│       │   ├── mongo.config.js      # Mongoose connection
│       │   ├── redis.config.js      # BullMQ + Socket.io adapter
│       │   ├── env.config.js        # Validated env vars
│       │   └── socket.config.js     # Socket.io config
│       │
│       ├── domain/
│       │   ├── case/
│       │   │   ├── case.lifecycle.js    # State machine transitions
│       │   │   ├── case.rules.js        # Business rules
│       │   │   └── case.permissions.js  # Who can do what
│       │   ├── poll/
│       │   │   └── poll.rules.js
│       │   └── analytics/
│       │       └── hotspot.rules.js
│       │
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── case.routes.js
│       │   ├── poll.routes.js
│       │   ├── analytics.routes.js
│       │   ├── notification.routes.js
│       │   ├── public.routes.js
│       │   └── admin.routes.js
│       │
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── case.controller.js
│       │   ├── poll.controller.js
│       │   ├── analytics.controller.js
│       │   ├── notification.controller.js
│       │   ├── public.controller.js
│       │   └── admin.controller.js
│       │
│       ├── services/
│       │   ├── auth/
│       │   │   └── auth.service.js
│       │   ├── cases/
│       │   │   ├── createCase.service.js
│       │   │   ├── assignCase.service.js
│       │   │   ├── updateCaseStatus.service.js
│       │   │   └── closeCase.service.js
│       │   ├── polls/
│       │   │   ├── createPoll.service.js
│       │   │   ├── votePoll.service.js
│       │   │   └── pollResults.service.js
│       │   ├── analytics/
│       │   │   ├── dashboard.service.js
│       │   │   ├── departmentStats.service.js
│       │   │   └── hotspot.service.js
│       │   └── notifications/
│       │       └── notification.service.js
│       │
│       ├── repositories/
│       │   ├── user.repository.js
│       │   ├── case.repository.js
│       │   ├── assignment.repository.js
│       │   ├── poll.repository.js
│       │   ├── vote.repository.js
│       │   ├── notification.repository.js
│       │   ├── analytics.repository.js
│       │   ├── attachment.repository.js   # MongoDB
│       │   └── caseLog.repository.js      # MongoDB
│       │
│       ├── models/
│       │   └── mongo/
│       │       ├── attachment.schema.js
│       │       ├── caseLog.schema.js
│       │       ├── analyticsSnapshot.schema.js
│       │       └── systemLog.schema.js
│       │
│       ├── middleware/
│       │   ├── auth.middleware.js       # JWT verification
│       │   ├── role.middleware.js       # Role-based access control
│       │   ├── rateLimit.middleware.js
│       │   ├── error.middleware.js
│       │   └── validate.middleware.js
│       │
│       ├── validators/
│       │   ├── auth.validator.js
│       │   ├── case.validator.js
│       │   └── poll.validator.js
│       │
│       ├── queues/
│       │   ├── escalation.queue.js
│       │   ├── analytics.queue.js
│       │   └── notification.queue.js
│       │
│       ├── workers/
│       │   ├── escalation.worker.js     # 7-day escalation processor
│       │   ├── analytics.worker.js
│       │   ├── notification.worker.js
│       │   └── hotspot.worker.js
│       │
│       ├── realtime/
│       │   ├── case.socket.js
│       │   └── notification.socket.js
│       │
│       ├── utils/
│       │   ├── logger.js
│       │   ├── response.js
│       │   ├── pagination.js
│       │   ├── trackingId.js            # NEO-YYYY-NNN generation
│       │   └── date.utils.js            # Working day calculation
│       │
│       └── constants/
│           ├── roles.constants.js
│           ├── caseStatus.constants.js
│           └── notificationType.constants.js
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.local
│   ├── middleware.ts                    # JWT validation + route protection
│   │
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                 # Redirect to /dashboard or /login
│       │   ├── login/page.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── submit-case/page.tsx
│       │   ├── cases/
│       │   │   ├── page.tsx             # Cases list / inbox
│       │   │   └── [caseId]/page.tsx    # Case detail + timeline
│       │   ├── polls/page.tsx
│       │   ├── analytics/page.tsx
│       │   ├── public-hub/page.tsx
│       │   └── admin/page.tsx
│       │
│       ├── components/
│       │   ├── CaseCard.tsx
│       │   ├── CaseTimeline.tsx
│       │   ├── PollCard.tsx
│       │   ├── DashboardCharts.tsx
│       │   ├── DepartmentHeatmap.tsx
│       │   ├── Navbar.tsx
│       │   └── Sidebar.tsx
│       │
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useSocket.ts
│       │   └── useCases.ts
│       │
│       ├── services/
│       │   ├── api.ts                   # Axios instance + interceptors
│       │   ├── auth.service.ts
│       │   ├── case.service.ts
│       │   ├── poll.service.ts
│       │   └── analytics.service.ts
│       │
│       ├── store/
│       │   ├── auth.store.ts            # Zustand store (access token)
│       │   └── dashboard.store.ts
│       │
│       ├── types/
│       │   ├── case.types.ts
│       │   └── user.types.ts
│       │
│       └── utils/
│           ├── formatDate.ts
│           └── constants.ts
```

**Structure Decision**: Web application (Option 2) — `backend/` for Express API, `frontend/` for Next.js. Chosen because the spec defines a clear frontend/backend split with separate concerns, separate auth flows, and different deployment targets.

---

## Complexity Tracking

No constitution violations — no complexity justification required.

---

## Design Decisions Summary

| Decision | Choice | Reference |
|----------|--------|-----------|
| PostgreSQL ORM | Prisma | research.md — Decision 1 |
| Escalation jobs | BullMQ delayed jobs, one per assignment | research.md — Decision 2 |
| JWT strategy | Access token in memory + refresh in HttpOnly cookie | research.md — Decision 3 |
| Cross-DB transactions | PostgreSQL-primary + Transactional Outbox to MongoDB | research.md — Decision 4 |
| File uploads | Multer + local disk, abstracted via storage service | research.md — Decision 5 |
| Real-time | Socket.io with Redis adapter | research.md — Decision 6 |

---

## Implementation Phases (for /speckit.tasks)

### Phase 1: Foundation
- Project scaffolding (backend + frontend)
- Environment configuration
- PostgreSQL schema (Prisma) + MongoDB models
- Database connections + health checks
- ESLint + Prettier + Jest configuration

### Phase 2: Authentication
- JWT auth service (login, refresh, logout)
- Auth middleware + role middleware
- Next.js middleware (route protection)
- Auth store (Zustand) + token refresh interceptor
- Login page UI

### Phase 3: Case Submission & Lifecycle
- Case creation API (with file upload)
- Tracking ID generator
- Case list + case detail APIs
- Case assignment API (Secretariat)
- Case status update API (Case Manager)
- State machine enforcement
- Activity log (CaseStatusLog + MongoDB caseLogs)

### Phase 4: Escalation System
- BullMQ queue + Redis connection
- Escalation job scheduling on assignment
- Working-day calculator
- Escalation worker (status update + notifications)
- Job cancellation on status update

### Phase 5: Polling System
- Poll CRUD API
- Vote API (one-vote enforcement)
- Poll results calculation
- Poll UI (PollCard + results chart)

### Phase 6: Notifications + Real-time
- Notification service + repository
- Socket.io server setup (Redis adapter)
- Notification socket emitter
- Frontend useSocket hook + notification bell

### Phase 7: Public Hub
- Impact records API (CRUD)
- Meeting minutes upload + download API
- Quarterly digest API
- Public Hub page UI

### Phase 8: Analytics Dashboard
- Department stats aggregation
- Hotspot detection job
- Analytics snapshot service
- Dashboard API
- DashboardCharts + DepartmentHeatmap components

### Phase 9: Admin Panel
- User management API (create, update, deactivate)
- Admin page UI

### Phase 10: Polish & Quality
- End-to-end Playwright tests
- Accessibility audit (WCAG 2.1 AA)
- Bundle size audit (≤ 250 KB gzipped)
- Performance profiling (API p95)
- README finalisation
- .env.example review
