# Neostat — NeoConnect Platform

> An internal staff feedback, complaint management, and engagement platform built for Neostat — designed to replace informal, untracked feedback channels with a structured, transparent, and accountable digital workflow.

---

## What Is This Project?

NeoConnect is a full-stack web application that gives Neostat employees a formal channel to raise workplace concerns, track their resolution, and see real outcomes — while giving management the tools to respond efficiently, transparently, and on time.

Before NeoConnect, complaints and feedback were handled through informal emails and verbal conversations — no tracking, no accountability, no visibility. NeoConnect changes that entirely.

Staff can submit a case (complaint, safety issue, HR concern, policy violation) through a structured form, receive a unique tracking ID, and follow the resolution process in real time. Management gets an inbox, analytics, and automated escalation. Admins get full system control.

---

## Proposed Work

The platform was designed across 5 feature areas:

| Area | What Was Proposed |
|------|------------------|
| **Case Submission** | Structured form with category, severity, department, location, anonymous toggle, file attachments, auto-generated tracking ID |
| **Case Management** | Full lifecycle workflow — inbox, assignment, status updates, internal notes, info requests, reassignment, escalation |
| **Analytics & Oversight** | Department heatmap, category breakdowns, SLA tracking, hotspot detection, audit log |
| **Engagement** | Staff polling system (one vote per user), announcements, Public Hub with impact records and meeting minutes |
| **Administration** | User management, department management, system health monitoring, role change history, audit log export |

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express 4 | REST API server |
| PostgreSQL (Neon) + Prisma 5 | Relational data — users, cases, assignments, polls |
| MongoDB (Atlas) + Mongoose 8 | Document data — logs, comments, snapshots, reminders |
| Redis (Upstash) + BullMQ 5 | Background job queues — escalation, analytics, hotspot detection |
| Socket.io 4 | Real-time notifications and case updates |
| JWT + bcryptjs | Stateless authentication, refresh token rotation, password hashing |
| Multer | File upload handling (JPEG, PNG, PDF) |
| Winston | Structured logging |
| Helmet + express-rate-limit | HTTP security headers and brute-force protection |

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 14 (App Router) | React framework with server + client components |
| TypeScript 5 | Static type safety across all frontend code |
| Tailwind CSS 3 + shadcn/ui | Styling and 22-component accessible design system |
| Zustand | Lightweight global state for auth |
| Axios | HTTP client with automatic token refresh interceptor |
| Socket.io-client | Real-time event subscriptions |
| Recharts | Analytics charts and system health sparklines |
| jose | JWT verification in Next.js edge middleware |

### Infrastructure
| Service | Provider |
|---------|---------|
| Frontend | Vercel |
| Backend API | Render |
| PostgreSQL | Neon (serverless) |
| MongoDB | MongoDB Atlas (M0) |
| Redis | Upstash (serverless, TLS) |

---

## How It Stands Out

Most feedback platforms are either simple Google Forms with no tracking, or expensive enterprise tools that are overkill for an internal team. NeoConnect sits in the middle — purpose-built, lean, and genuinely useful.

### 1. Dual Database Architecture
Rather than forcing every data type into one database, NeoConnect uses the right tool for each job. PostgreSQL handles transactional, relational data (users, cases, assignments) where ACID guarantees matter. MongoDB handles high-volume, append-heavy data (logs, comments, snapshots) where flexibility and write speed matter more. This is a deliberate architectural decision, not just complexity for its own sake.

### 2. Automatic Escalation via Background Jobs
Cases that go unresponded to don't just sit there. A BullMQ delayed job is scheduled the moment a case is assigned. If the manager doesn't update the case within the configured window (default: 7 working days, skipping weekends), the system automatically escalates it, updates the status, logs it, and notifies both the manager and secretariat. No manual chasing required.

### 3. Immutable Audit Trail
The MongoDB `CaseLog` collection uses a Mongoose pre-save middleware that throws an error on any update operation. Every case action is recorded permanently and cannot be altered — not even by an admin. This is a compliance-grade audit trail built into the data model itself, not bolted on as an afterthought.

### 4. Anonymous Submissions with Accountability
Staff can submit cases anonymously. The system stores `submitterId = null` when anonymity is toggled, meaning case managers never see who submitted the case — but the case still gets tracked, assigned, escalated, and resolved through the same workflow. You get honest reporting without losing accountability on the resolution side.

### 5. Real-Time Across the Board
Socket.io is wired into every significant event — case assignments, status changes, escalations, new announcements, poll creation. Users don't need to refresh anything. Notifications appear instantly, the unread badge updates live, and managers see new cases without polling.

### 6. Role-Based at Every Layer
Access control isn't just a frontend check. Every API route is protected by two middleware layers: JWT verification (who are you?) and role enforcement (are you allowed to do this?). The service layer adds a third check for business rules. A staff member genuinely cannot access manager-only endpoints — it is enforced at the database query level too, not just blocked in the UI.

### 7. Public Transparency Hub
Most complaint systems are black boxes — staff submit and never know what happened. NeoConnect has a Public Hub where secretariat publishes quarterly impact records (issue raised → action taken → outcome change), meeting minutes, and a digest of case resolution statistics by quarter. Staff can see that their feedback actually led to something.

---

## Development Sprints — Built in 10 Hours

The entire platform was designed and built iteratively across focused sprints:

### Sprint 1 — Foundation (1.5 hrs)
- Project scaffolding: monorepo with `backend/` and `frontend/` subdirectories
- PostgreSQL schema design and Prisma setup
- JWT authentication (login, refresh token, logout)
- User roles and middleware pipeline
- Next.js App Router setup, Zustand auth store, Axios interceptors

### Sprint 2 — Core Case Flow (2 hrs)
- Case submission form (category, severity, department, location, anonymous toggle)
- File upload with Multer (JPEG, PNG, PDF, max 5 files)
- Tracking ID generation (NEO-YYYY-NNN format)
- Case list with filters, case detail view
- Case status lifecycle and transitions (NEW → ASSIGNED → IN_PROGRESS → PENDING → RESOLVED)
- Case assignment by Secretariat

### Sprint 3 — Real-time & Notifications (1 hr)
- Socket.io integration (JWT-authenticated rooms)
- Notification system (DB-backed + real-time delivery)
- Unread badge, notification centre page
- Real-time case updates pushed to management room

### Sprint 4 — Case Manager Tooling (1 hr)
- Internal notes (hidden from staff)
- Request more info from submitter
- Reassign case with reason
- Follow-up reminders with date and note
- Workload summary page (open / closed this month / escalated)

### Sprint 5 — Escalation Worker (0.5 hrs)
- BullMQ queue setup with Redis
- `assignCaseService` calculates deadline using business days (skips weekends)
- Delayed job scheduled on assignment, cancelled on reassignment
- Escalation worker as a separate Node.js process
- Automatic status update, audit log, and notification on fire

### Sprint 6 — Admin Panel & Secretariat Features (1.5 hrs)
- User management (create, update role, deactivate, reactivate, reset password)
- Department management (add, rename, toggle active)
- Escalation rule configuration per category
- Audit log viewer and CSV export
- Role change history
- Bulk case assignment
- Priority flagging
- SLA target configuration

### Sprint 7 — Analytics & Public Hub (1 hr)
- Department heatmap
- Case status and category breakdown charts
- Hotspot detection (5+ cases same dept + category)
- Quarterly digest (SQL aggregation grouped by quarter + category)
- Impact records and meeting minutes (Public Hub)

### Sprint 8 — Polls & Announcements (0.5 hrs)
- Poll creation with multiple options
- One-vote-per-user enforcement (DB unique constraint)
- Vote percentage charts
- Scheduled announcements with send/cancel

### Sprint 9 — System Health Dashboard & UI Overhaul (0.5 hrs)
- Real-time system health page (PostgreSQL, MongoDB, Redis, JWT, API)
- 5-second auto-polling with sparkline charts and latency badges
- Full UI redesign — brand identity, dark mode, gradient navbar, animated stat cards
- Split-panel login page with demo credential quick-fill

### Sprint 10 — Hardening & Deployment (0.5 hrs)
- Fix hydration mismatches (greeting moved to `useEffect`, Recharts via `next/dynamic`)
- Fix `@apply` arbitrary value PostCSS issue in globals.css
- Fix Express route ordering (static routes before `/:param`)
- Deploy backend to Render, frontend to Vercel
- Configure Neon, Atlas, Upstash in production environment

---

## Resources & References

### Official Documentation
- [Next.js 14 App Router](https://nextjs.org/docs/app) — routing, layouts, server/client components, middleware
- [Prisma ORM](https://www.prisma.io/docs) — schema definition, migrations, `$queryRaw`, transactions
- [Mongoose](https://mongoosejs.com/docs/) — schema design, middleware (pre-save hooks), indexes
- [BullMQ](https://docs.bullmq.io/) — queue setup, delayed jobs, workers, retry/backoff
- [Socket.io](https://socket.io/docs/v4/) — rooms, JWT auth middleware, namespaces
- [shadcn/ui](https://ui.shadcn.com/) — component installation, theming, Tailwind integration
- [Tailwind CSS](https://tailwindcss.com/docs) — utilities, `@layer`, CSS variables, dark mode
- [Recharts](https://recharts.org/en-US/) — LineChart, ResponsiveContainer, Tooltip
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction) — store setup, persist middleware
- [jose](https://github.com/panva/jose) — JWT signing and verification in edge runtime

### Libraries & Tools
- [ioredis](https://github.com/redis/ioredis) — Redis client for BullMQ and direct commands (`INFO memory`, `PING`)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — password hashing (pure JS, no native bindings needed)
- [Multer](https://github.com/expressjs/multer) — multipart/form-data file handling in Express
- [Helmet](https://helmetjs.github.io/) — HTTP security headers (CSP, X-Frame-Options, HSTS)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) — rate limiting middleware
- [Joi](https://joi.dev/api/) — schema-based request validation
- [Winston](https://github.com/winstonjs/winston) — structured logging with transports
- [Neon](https://neon.tech/docs) — serverless PostgreSQL, connection pooling
- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted) — serverless Redis with TLS, REST and ioredis compatible
- [pdfkit](https://pdfkit.org/) — programmatic PDF generation in Node.js

### Architecture Patterns
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html) — used for `OutboxEvent` to decouple DB writes from async processing
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html) — data access abstraction separating business logic from DB queries
- [BullMQ Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed) — scheduling escalation deadlines
- [JWT Refresh Token Rotation](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/) — short-lived access tokens with rotating refresh tokens
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html) — case lifecycle, permissions, and rules in isolated domain files

### Deployment References
- [Render Node.js deploy guide](https://render.com/docs/deploy-node-express-app)
- [Vercel Next.js deployment](https://vercel.com/docs/frameworks/nextjs)
- [Prisma on Neon](https://neon.tech/docs/guides/prisma)
- [Git LFS](https://git-lfs.com/) — used for storing the demo video in this repository

---

## Repository Structure

```
Neostat/
├── neo-connect/
│   ├── backend/               Express API, Prisma schema, workers, services
│   ├── frontend/              Next.js app, pages, components, hooks
│   ├── working.mp4            Demo walkthrough video
│   └── README.md              Full project documentation
├── samples/
│   ├── .claude/               Project tooling configuration
│   └── .specify/              Feature specification templates
├── specs/                     Feature specification documents
└── README.md                  ← You are here
```

---

## Author

**Syed Abrar C**
Built for Neostat — 2025
