# Tasks: NeoConnect Platform

**Input**: Design documents from `/specs/001-neoconnect-platform/`
**Branch**: `001-neoconnect-platform` | **Date**: 2026-03-15
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md) | **Contracts**: [contracts/api.md](contracts/api.md)

**Tests**: Included — Constitution v1.0.0 mandates TDD (Red-Green-Refactor). Tests MUST be written first and confirmed to FAIL before implementation.

**Organization**: Tasks grouped by user story. Each story is independently implementable and testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependency)
- **[Story]**: Which user story this task belongs to (US1–US8)
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the full project structure before any feature work begins.

- [X] T001 Create `neo-connect/` directory with `backend/`, `frontend/`, and `scripts/` subdirectories per plan.md structure
- [X] T002 Initialise backend: create `neo-connect/backend/package.json` with dependencies — express, prisma, @prisma/client, mongoose, bullmq, ioredis, socket.io, jsonwebtoken, bcryptjs, multer, cors, helmet, express-rate-limit, business-days-js, joi, winston, uuid; devDependencies — jest, supertest, nodemon, eslint, prettier
- [X] T003 [P] Initialise frontend: scaffold Next.js 14 App Router project in `neo-connect/frontend/` with TypeScript, Tailwind CSS, and install shadcn/ui, zustand, axios, socket.io-client, recharts, jose; devDependencies — jest, @testing-library/react, @testing-library/jest-dom, playwright, eslint, prettier
- [X] T004 [P] Configure ESLint + Prettier for backend — create `neo-connect/backend/.eslintrc.js` (Node/CommonJS rules, no unused vars, max 300 lines per file) and `neo-connect/backend/.prettierrc`
- [X] T005 [P] Configure ESLint + Prettier + TypeScript strict mode for frontend — create `neo-connect/frontend/.eslintrc.js` and `neo-connect/frontend/.prettierrc`
- [X] T006 [P] Configure Jest for backend — create `neo-connect/backend/jest.config.js` with coverage threshold `{ lines: 80, functions: 80, branches: 80 }`, test pattern `**/*.test.js`, setup file for test DB
- [X] T007 [P] Configure Jest + React Testing Library for frontend — create `neo-connect/frontend/jest.config.ts` and `neo-connect/frontend/jest.setup.ts`
- [X] T008 Create root workspace `neo-connect/package.json` with scripts: `dev:all` (concurrently backend + frontend + workers), `test:all`, `lint:all`
- [X] T009 Create `neo-connect/backend/.env.example` with all required variables: PORT, NODE_ENV, DATABASE_URL, MONGODB_URI, REDIS_URL, JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, UPLOAD_DIR, MAX_FILE_SIZE_MB, FRONTEND_URL
- [X] T010 [P] Create `neo-connect/frontend/.env.local` and `neo-connect/frontend/.env.example` with NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL

**Checkpoint**: Project structure scaffolded. Both `npm install` commands run successfully with no errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before ANY user story can be built.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database & Connections

- [X] T011 Create `neo-connect/backend/src/config/env.config.js` — validate and export all environment variables using joi; throw at startup if required vars are missing
- [X] T012 Write complete Prisma schema in `neo-connect/backend/prisma/schema.prisma` — define all models: User (with Role enum), Department, Case (with Category, Severity, CaseStatus enums), CaseAssignment, CaseStatusLog, Poll, PollOption, Vote (unique constraint pollId+userId), Notification (with NotificationType enum), ImpactRecord, MeetingMinute, OutboxEvent; include all foreign keys and indexes per data-model.md
- [X] T013 Run `npx prisma migrate dev --name init` in `neo-connect/backend/` to create database tables and generate Prisma client; verify all tables created in PostgreSQL NeoConnect database
- [X] T014 [P] Create MongoDB schemas in `neo-connect/backend/src/models/mongo/`: `attachment.schema.js` (caseId, originalName, storedName, mimeType, sizeBytes, storagePath, uploadedById, uploadedAt), `caseLog.schema.js` (insert-only, caseId, actorId, actorRole, action, details, timestamp), `analyticsSnapshot.schema.js` (with 90-day TTL index), `systemLog.schema.js` (with 30-day TTL index)
- [X] T015 Create `neo-connect/backend/src/config/mongo.config.js` — Mongoose connection with retry logic and graceful disconnect on SIGINT/SIGTERM
- [X] T016 [P] Create `neo-connect/backend/src/config/redis.config.js` — IORedis connection to Upstash (TLS `rediss://`), export single IORedis instance reused by BullMQ and Socket.io adapter

### Utilities & Constants

- [X] T017 [P] Create `neo-connect/backend/src/constants/roles.constants.js` (STAFF, SECRETARIAT, CASE_MANAGER, ADMIN), `caseStatus.constants.js` (NEW, ASSIGNED, IN_PROGRESS, PENDING, RESOLVED, ESCALATED), `notificationType.constants.js` (CASE_ASSIGNED, STATUS_UPDATED, ESCALATION_REMINDER, ESCALATION_ALERT, POLL_CREATED)
- [X] T018 [P] Implement `neo-connect/backend/src/utils/response.js` — `sendSuccess(res, data, statusCode=200)` and `sendError(res, code, message, statusCode)` helpers matching API contract conventions
- [X] T019 [P] Implement `neo-connect/backend/src/utils/logger.js` — Winston logger with console transport (dev) and MongoDB systemLog transport (production); log levels: info, warn, error
- [X] T020 [P] Implement `neo-connect/backend/src/utils/pagination.js` — `paginate(query, page, limit)` helper that returns `{ data, pagination: { page, limit, total } }`

### Middleware

- [X] T021 Implement `neo-connect/backend/src/middleware/error.middleware.js` — global Express error handler; maps known error codes to HTTP status; logs unexpected errors via logger; returns `{ success: false, error: { code, message } }` — never exposes stack traces in production
- [X] T022 [P] Implement `neo-connect/backend/src/middleware/validate.middleware.js` — Joi schema validation factory; returns `400 VALIDATION_ERROR` with field-level messages on failure
- [X] T023 [P] Implement `neo-connect/backend/src/middleware/rateLimit.middleware.js` — express-rate-limit: 100 req/15min general, 10 req/15min for auth routes

### Authentication (Foundational — required by all stories)

- [X] T024 Implement `neo-connect/backend/src/repositories/user.repository.js` — `findByEmail(email)`, `findById(id)`, `create(data)`, `updateById(id, data)`, `deactivate(id)`, `listAll()` using Prisma client
- [X] T025 Write unit tests for user repository in `neo-connect/backend/src/repositories/__tests__/user.repository.test.js` — given_valid_email_when_findByEmail_then_returns_user, given_invalid_email_when_findByEmail_then_returns_null; confirm tests FAIL before T024 is complete
- [X] T026 Implement `neo-connect/backend/src/services/auth/auth.service.js` — `login(email, password)`: bcrypt compare, generate access JWT (15m) + refresh JWT (7d), store refresh token hash; `refresh(refreshToken)`: validate, rotate tokens; `logout(userId)`: invalidate refresh token
- [X] T027 Write unit tests for auth service in `neo-connect/backend/src/services/auth/__tests__/auth.service.test.js` — given_valid_credentials_when_login_then_returns_tokens, given_wrong_password_when_login_then_throws_INVALID_CREDENTIALS, given_expired_refresh_when_refresh_then_throws_REFRESH_TOKEN_EXPIRED; confirm tests FAIL first
- [X] T028 Implement `neo-connect/backend/src/middleware/auth.middleware.js` — verify Bearer JWT using jsonwebtoken; attach `req.user = { id, role, departmentId }` on success; return `401 UNAUTHORIZED` on failure
- [X] T029 [P] Implement `neo-connect/backend/src/middleware/role.middleware.js` — `requireRole(...roles)` factory; returns `403 FORBIDDEN` if `req.user.role` not in allowed roles
- [X] T030 Implement `neo-connect/backend/src/validators/auth.validator.js` — Joi schemas for login (`email`, `password` required)
- [X] T031 Implement `neo-connect/backend/src/controllers/auth.controller.js` — `login`, `refresh`, `logout` handlers; set HttpOnly Secure SameSite=Strict cookie for refresh token; clear cookie on logout
- [X] T032 Create `neo-connect/backend/src/routes/auth.routes.js` — POST /auth/login (rate-limited), POST /auth/refresh, POST /auth/logout (authenticated)
- [X] T033 Create `neo-connect/backend/src/app.js` — Express app factory: register helmet, cors (FRONTEND_URL), express.json, express.urlencoded, rate limiter, all route modules, error middleware; export app (no listen)
- [X] T034 Create `neo-connect/backend/src/server.js` — import app, connect Mongoose, start HTTP server on PORT, initialise Socket.io; graceful shutdown on SIGINT/SIGTERM
- [X] T035 Configure Socket.io in `neo-connect/backend/src/socket.js` — attach to HTTP server, use Redis adapter (socket.io-redis), JWT handshake auth, place each user in room `user:<userId>` on connect
- [X] T036 Create seed scripts: `neo-connect/scripts/seedDepartments.js` (HR, IT, Facilities, Safety, Operations, Other) and `neo-connect/scripts/seedUsers.js` (one user per role with seeded passwords per quickstart.md)

### Frontend Foundation

- [X] T037 Implement `neo-connect/frontend/src/services/api.ts` — Axios instance with baseURL from env; request interceptor adds `Authorization: Bearer <accessToken>` from auth store; response interceptor handles 401 by calling `/auth/refresh`, updates store, retries original request; on refresh failure redirects to /login
- [X] T038 [P] Implement `neo-connect/frontend/src/store/auth.store.ts` — Zustand store: `{ user, accessToken, setAuth, clearAuth }`; access token in memory only (not persisted)
- [X] T039 [P] Implement `neo-connect/frontend/src/hooks/useAuth.ts` — `useAuth()` hook: exposes `user`, `login(email, password)`, `logout()`, `isAuthenticated`, `hasRole(role)`
- [X] T040 Create `neo-connect/frontend/middleware.ts` — Next.js edge middleware using `jose` to verify JWT from auth store (passed as cookie `accessToken` for SSR); redirect unauthenticated to /login; redirect authenticated /login to /dashboard; role-based route guards for /analytics and /admin
- [X] T041 Create main app layout `neo-connect/frontend/src/app/layout.tsx` — wraps all pages with auth provider, Sidebar, Navbar from shadcn/ui; global font and Tailwind base styles
- [X] T042 [P] Create `neo-connect/frontend/src/components/Navbar.tsx` — top navigation bar with NeoConnect logo, current user name, role badge, notification bell (placeholder), logout button using shadcn/ui components
- [X] T043 [P] Create `neo-connect/frontend/src/components/Sidebar.tsx` — role-aware sidebar: Staff sees (Submit Case, My Cases, Polls, Public Hub); Secretariat adds (Inbox, Analytics); Case Manager adds (My Assigned Cases); Admin adds (Admin Panel); active route highlighted
- [X] T044 Create login page `neo-connect/frontend/src/app/login/page.tsx` — shadcn/ui Card with email + password fields, submit button with loading state, error message display; calls `useAuth().login()`; redirects to /dashboard on success; no access if already authenticated
- [X] T045 Create dashboard redirect page `neo-connect/frontend/src/app/page.tsx` — redirect authenticated users to /dashboard; redirect unauthenticated to /login
- [X] T046 [P] Create `neo-connect/frontend/src/app/dashboard/page.tsx` — role-aware welcome page: Staff sees quick-submit button + recent case status; Secretariat sees unassigned case count + hotspot summary; Case Manager sees assigned case count + overdue cases count

**Checkpoint**: Foundation complete. `npm run dev:all` starts both servers. Seed scripts populate DB. Login page works. Authenticated routes redirect correctly. Role middleware blocks wrong roles.

---

## Phase 3: US1 — Staff Submits a Complaint (Priority: P1) 🎯 MVP

**Goal**: Any staff member can fill in the submission form, optionally attach files, toggle anonymity, and receive a unique tracking ID.

**Independent Test**: Submit a case via the form → verify NEO-2026-001 tracking ID returned → verify anonymous case shows no submitter identity anywhere.

### Tests for US1 ⚠️ Write FIRST — confirm FAIL before implementing

- [X] T047 [P] [US1] Write unit tests for `createCase.service.js` in `neo-connect/backend/src/services/cases/__tests__/createCase.service.test.js` — given_valid_payload_when_createCase_then_returns_NEO_tracking_id, given_anonymous_true_when_createCase_then_submitterId_is_null, given_invalid_category_when_createCase_then_throws_VALIDATION_ERROR
- [X] T048 [P] [US1] Write integration tests for POST /cases in `neo-connect/backend/src/routes/__tests__/case.routes.test.js` — given_authenticated_staff_when_POST_cases_then_201_with_trackingId, given_unauthenticated_when_POST_cases_then_401, given_missing_required_field_when_POST_cases_then_400_VALIDATION_ERROR, given_oversized_file_when_POST_cases_then_413

### Implementation for US1

- [X] T049 [US1] Implement `neo-connect/backend/src/utils/trackingId.js` — `generateTrackingId()`: query Prisma for COUNT of cases in current year, return `NEO-{YEAR}-{padded 3-digit sequential}` e.g. NEO-2026-001; handle concurrent submissions with a database sequence or retry
- [X] T050 [US1] Implement case domain rules in `neo-connect/backend/src/domain/case/case.lifecycle.js` — export `VALID_TRANSITIONS` map and `isValidTransition(fromStatus, toStatus)` function; `case.rules.js` — `canSubmit(user)`, `isResolved(caseStatus)` helpers
- [X] T051 [P] [US1] Implement `neo-connect/backend/src/repositories/case.repository.js` — `create(data)`, `findById(id)`, `findAll(filters, pagination)`, `updateStatus(id, status)`, `countByYearForTracking(year)` using Prisma with appropriate includes (department, submitter masked if anonymous)
- [X] T052 [P] [US1] Implement `neo-connect/backend/src/repositories/attachment.repository.js` — MongoDB: `save(attachmentDoc)`, `findByCaseId(caseId)`, `findById(id)`
- [X] T053 [P] [US1] Implement `neo-connect/backend/src/repositories/caseLog.repository.js` — MongoDB insert-only: `log({ caseId, actorId, actorRole, action, details })`, `findByCaseId(caseId)` sorted by timestamp
- [X] T054 [US1] Configure Multer in `neo-connect/backend/src/middleware/upload.middleware.js` — disk storage to UPLOAD_DIR, accept only image/jpeg, image/png, application/pdf, max 10 MB per file, reject with `415 UNSUPPORTED_FILE_TYPE` or `413 FILE_TOO_LARGE`
- [X] T055 [US1] Implement `neo-connect/backend/src/validators/case.validator.js` — Joi schema: category (required, enum), departmentId (required, UUID), location (required, string), severity (required, enum), description (required, min 20 chars), isAnonymous (boolean, default false)
- [X] T056 [US1] Implement `neo-connect/backend/src/services/cases/createCase.service.js` — validate, generate tracking ID, save Case to PostgreSQL, save attachments to MongoDB, log `case_created` to MongoDB caseLogs, add OutboxEvent row in same Prisma transaction, return `{ id, trackingId, status, createdAt }`
- [X] T057 [US1] Add `createCase` handler to `neo-connect/backend/src/controllers/case.controller.js` — parse multipart/form-data (Multer), call createCase service, return 201; ensure submitter identity never returned when isAnonymous=true
- [X] T058 [US1] Add POST /cases route to `neo-connect/backend/src/routes/case.routes.js` — auth middleware, upload middleware, validate middleware, controller
- [X] T059 [P] [US1] Create submission form page `neo-connect/frontend/src/app/submit-case/page.tsx` — shadcn/ui form with: Category select, Department select (loaded from API), Location input, Severity radio, Description textarea (min 20 chars), Anonymous toggle (shadcn Switch), File dropzone (multi-file, shows previews), Submit button with spinner; on success show tracking ID in a shadcn Alert with copy button
- [X] T060 [P] [US1] Implement `neo-connect/frontend/src/services/case.service.ts` — `submitCase(formData: FormData)` posts multipart to POST /cases; `getCases(filters)`, `getCaseById(id)`
- [X] T061 [P] [US1] Create `neo-connect/frontend/src/types/case.types.ts` and `user.types.ts` — TypeScript interfaces matching API response shapes

**Checkpoint**: Staff can submit a case with or without files, toggle anonymity, and receive a NEO-YYYY-NNN tracking ID. Anonymous cases show no submitter to any reader.

---

## Phase 4: US2 — Secretariat Assigns a Case (Priority: P1)

**Goal**: Secretariat sees all incoming cases in an inbox, assigns each to a Case Manager, and the Case Manager is notified.

**Independent Test**: Login as Secretariat → see new case in inbox → assign to Case Manager → case status changes to ASSIGNED.

### Tests for US2 ⚠️ Write FIRST

- [X] T062 [P] [US2] Write unit tests for `assignCase.service.js` in `neo-connect/backend/src/services/cases/__tests__/assignCase.service.test.js` — given_NEW_case_when_assign_then_status_becomes_ASSIGNED, given_RESOLVED_case_when_assign_then_throws_INVALID_TRANSITION, given_nonexistent_manager_when_assign_then_throws_MANAGER_NOT_FOUND
- [X] T063 [P] [US2] Write integration tests for PATCH /cases/:id/assign in `neo-connect/backend/src/routes/__tests__/assign.routes.test.js` — given_secretariat_when_assign_then_200, given_staff_role_when_assign_then_403

### Implementation for US2

- [X] T064 [US2] Implement `neo-connect/backend/src/repositories/assignment.repository.js` — `create({ caseId, managerId, assignedById, escalationDeadline, escalationJobId })`, `findActiveByCaseId(caseId)`, `updateEscalationJobId(assignmentId, jobId)`, `deactivate(assignmentId)`
- [X] T065 [US2] Implement `neo-connect/backend/src/utils/date.utils.js` — `addWorkingDays(startDate, days)` using business-days-js (skips weekends; no holiday support in v1); returns JavaScript Date object
- [X] T066 [US2] Implement `neo-connect/backend/src/services/cases/assignCase.service.js` — validate transition NEW→ASSIGNED, validate managerId has CASE_MANAGER role, create CaseAssignment with escalationDeadline (addWorkingDays(now, 7)), create CaseStatusLog entry, log to MongoDB caseLogs, queue BullMQ escalation job and store jobId on assignment, emit Socket.io `case:assigned` event
- [X] T067 [US2] Add `assignCase` handler and GET /cases + GET /cases/:id handlers to `neo-connect/backend/src/controllers/case.controller.js` — GET /cases: role-filter (Secretariat = all, Case Manager = assigned only, Staff = own non-anonymous); GET /cases/:id: full detail with timeline (merge Prisma CaseStatusLog + MongoDB caseLogs), attachment metadata, assignment info
- [X] T068 [US2] Add GET /cases, GET /cases/:id, PATCH /cases/:id/assign routes with role guards to `neo-connect/backend/src/routes/case.routes.js`
- [X] T069 [P] [US2] Create cases list/inbox page `neo-connect/frontend/src/app/cases/page.tsx` — paginated list with filter bar (status, category, department, severity); Secretariat sees Assign button per row; Case Manager sees their assigned cases; Staff sees own submissions; uses CaseCard component
- [X] T070 [P] [US2] Create `neo-connect/frontend/src/components/CaseCard.tsx` — shadcn/ui Card showing trackingId, category badge, severity badge, status badge, department, submission date; Secretariat-only: "Assign" button opens a shadcn Dialog with Case Manager dropdown + confirm
- [X] T071 [P] [US2] Create case detail page `neo-connect/frontend/src/app/cases/[caseId]/page.tsx` — full case information, CaseTimeline component, attachments list with download links, assignment info (manager name + escalation deadline countdown)
- [X] T072 [P] [US2] Create `neo-connect/frontend/src/components/CaseTimeline.tsx` — vertical timeline (shadcn Separator + Badge) showing each status change with actor, timestamp, and optional note; most recent event at top

**Checkpoint**: Secretariat can see all cases, assign to a Case Manager, and see status update to ASSIGNED. Timeline shows assignment event.

---

## Phase 5: US3 — Case Manager Works a Case to Resolution (Priority: P1)

**Goal**: Case Manager updates status (In Progress → Pending → Resolved), adds notes, and closes cases. Resolved cases cannot be reopened.

**Independent Test**: Login as Case Manager → update status to IN_PROGRESS → add note → close as RESOLVED → confirm no further status changes possible.

### Tests for US3 ⚠️ Write FIRST

- [X] T073 [P] [US3] Write unit tests for `updateCaseStatus.service.js` in `neo-connect/backend/src/services/cases/__tests__/updateCaseStatus.service.test.js` — given_ASSIGNED_case_when_updateToInProgress_then_succeeds, given_RESOLVED_case_when_updateAny_then_throws_CASE_ALREADY_RESOLVED, given_wrong_manager_when_updateStatus_then_throws_FORBIDDEN
- [X] T074 [P] [US3] Write unit tests for case.permissions.js — given_caseManager_is_assigned_manager_when_canUpdateStatus_then_returns_true, given_different_manager_when_canUpdateStatus_then_returns_false

### Implementation for US3

- [X] T075 [US3] Implement `neo-connect/backend/src/domain/case/case.permissions.js` — `canAssign(user)`: SECRETARIAT only; `canUpdateStatus(user, assignment)`: CASE_MANAGER and user.id === assignment.managerId; `canViewCase(user, caseRecord)`: SECRETARIAT/ADMIN always; CASE_MANAGER if assigned; STAFF if submitterId matches and not anonymous
- [X] T076 [US3] Implement `neo-connect/backend/src/services/cases/updateCaseStatus.service.js` — enforce case.permissions.canUpdateStatus, validate transition via case.lifecycle.isValidTransition, block if RESOLVED, create CaseStatusLog, log to MongoDB caseLogs, cancel escalation job if transitioning from ASSIGNED/IN_PROGRESS, emit Socket.io `case:status_updated`, create Notification for submitter (if not anonymous)
- [X] T077 [US3] Implement `neo-connect/backend/src/services/cases/closeCase.service.js` — wraps updateCaseStatus with toStatus=RESOLVED, sets Case.resolvedAt
- [X] T078 [US3] Add `updateCaseStatus` handler to `neo-connect/backend/src/controllers/case.controller.js` — PATCH /cases/:id/status; CASE_MANAGER only
- [X] T079 [US3] Add PATCH /cases/:id/status route with CASE_MANAGER role guard to `neo-connect/backend/src/routes/case.routes.js`
- [X] T080 [US3] Add status update UI to case detail page `neo-connect/frontend/src/app/cases/[caseId]/page.tsx` — Case Manager sees: status Select (only valid next states shown), optional Note textarea, Update Status button with confirmation dialog; Resolved cases show read-only badge with no action buttons

**Checkpoint**: Case Manager can drive a case through all valid statuses. RESOLVED cases show no update controls. Timeline records every change with actor and timestamp.

---

## Phase 6: US4 — Automatic Escalation After 7 Working Days (Priority: P1)

**Goal**: If a Case Manager takes no action for 7 working days, the case auto-escalates to ESCALATED and Management is alerted.

**Independent Test**: Create a case assignment with an escalation deadline set 1 second in the future → verify BullMQ worker fires → case status becomes ESCALATED → Management notification created.

### Tests for US4 ⚠️ Write FIRST

- [X] T081 [P] [US4] Write unit tests for escalation worker in `neo-connect/backend/src/workers/__tests__/escalation.worker.test.js` — given_ASSIGNED_case_past_deadline_when_worker_fires_then_status_becomes_ESCALATED, given_RESOLVED_case_when_worker_fires_then_skips_escalation, given_notification_service_fails_when_escalation_then_retries
- [X] T082 [P] [US4] Write unit tests for notification service in `neo-connect/backend/src/services/notifications/__tests__/notification.service.test.js` — given_valid_recipient_when_createNotification_then_saves_to_db, given_escalation_event_when_notify_then_creates_two_notifications

### Implementation for US4

- [X] T083 [US4] Implement `neo-connect/backend/src/queues/escalation.queue.js` — BullMQ Queue named `escalation`; export `addEscalationJob(caseId, assignmentId, delayMs)` and `removeEscalationJob(jobId)`; uses Redis config singleton
- [X] T084 [US4] Implement `neo-connect/backend/src/repositories/notification.repository.js` — Prisma: `create({ recipientId, type, message, caseId? })`, `findByRecipient(userId, filters)`, `markRead(id)`, `markAllRead(userId)`
- [X] T085 [US4] Implement `neo-connect/backend/src/services/notifications/notification.service.js` — `createNotification(recipientId, type, message, caseId?)`: saves to PostgreSQL, emits Socket.io `notification:new` to `user:<recipientId>` room; `notifyEscalation(caseId, managerId, managementUserIds)`: creates ESCALATION_REMINDER for manager + ESCALATION_ALERT for all SECRETARIAT users
- [X] T086 [US4] Implement `neo-connect/backend/src/workers/escalation.worker.js` — BullMQ Worker on `escalation` queue; processor: fetch case by id, skip if status is RESOLVED/ESCALATED (idempotent), update status to ESCALATED, set escalatedAt, create CaseStatusLog (actor=system), log to MongoDB, call notification service; retry config: 3 attempts, exponential backoff 2s; dead-letter logging on final failure
- [X] T087 [US4] Update `assignCase.service.js` (T066) to call `addEscalationJob(caseId, assignmentId, delayMs)` after creating the assignment and store returned jobId via `assignment.repository.updateEscalationJobId`
- [X] T088 [US4] Update `updateCaseStatus.service.js` (T076) to call `removeEscalationJob(escalationJobId)` when Case Manager responds (status changes from ASSIGNED or IN_PROGRESS); fetch jobId from CaseAssignment
- [X] T089 [US4] Implement Socket.io notification emitter in `neo-connect/backend/src/realtime/notification.socket.js` — export `emitNotification(io, userId, payload)` and `emitHotspot(io, payload)` helpers that emit to named rooms
- [X] T090 [US4] Start escalation worker in `neo-connect/backend/src/server.js` alongside the HTTP server; add `npm run worker:escalation` script to backend package.json
- [X] T091 [P] [US4] Implement `neo-connect/backend/src/controllers/notification.controller.js` — `getNotifications(req, res)` with `unreadOnly` filter, `markRead`, `markAllRead`; create `neo-connect/backend/src/routes/notification.routes.js`
- [X] T092 [P] [US4] Implement `neo-connect/frontend/src/hooks/useSocket.ts` — initialise Socket.io-client connection on mount, authenticate via `auth: { token: accessToken }`, listen for `notification:new` and `case:status_updated` events, expose `socket` and `notifications` array
- [X] T093 [P] [US4] Add notification bell to `neo-connect/frontend/src/components/Navbar.tsx` — shadcn Popover with unread notification list (fetched from GET /notifications?unreadOnly=true); badge showing unread count; real-time updates via useSocket; click marks as read

**Checkpoint**: Assign a case → wait for BullMQ delayed job → verify ESCALATED status + two notifications created. Case Manager responding before deadline cancels the job.

---

## Phase 7: US5 — Staff Votes in a Poll (Priority: P2)

**Goal**: Secretariat creates polls, staff votes once, results shown as a chart after voting.

**Independent Test**: Create a poll with 3 options → vote as Staff → see Recharts bar chart → second vote attempt returns 409 ALREADY_VOTED.

### Tests for US5 ⚠️ Write FIRST

- [X] T094 [P] [US5] Write unit tests for `votePoll.service.js` in `neo-connect/backend/src/services/polls/__tests__/votePoll.service.test.js` — given_open_poll_when_first_vote_then_records_vote, given_already_voted_when_vote_again_then_throws_ALREADY_VOTED, given_closed_poll_when_vote_then_throws_POLL_CLOSED
- [X] T095 [P] [US5] Write integration tests for POST /polls/:id/vote in `neo-connect/backend/src/routes/__tests__/poll.routes.test.js` — given_staff_when_vote_then_200_with_results, given_second_vote_when_vote_then_409

### Implementation for US5

- [X] T096 [P] [US5] Implement `neo-connect/backend/src/repositories/poll.repository.js` — Prisma: `create({ question, options, createdById })` (creates Poll + PollOptions in transaction), `findAll()` with option counts, `findById(id)` with options and vote counts, `close(id)`
- [X] T097 [P] [US5] Implement `neo-connect/backend/src/repositories/vote.repository.js` — Prisma: `cast({ pollId, optionId, userId })`, `hasVoted(pollId, userId)`, `countByOption(pollId)` — relies on UNIQUE(pollId, userId) constraint for idempotency
- [X] T098 [US5] Implement poll services in `neo-connect/backend/src/services/polls/`: `createPoll.service.js` (validate ≥2 options, SECRETARIAT only), `votePoll.service.js` (check poll open, check hasVoted, cast vote, emit `poll:new` on creation), `pollResults.service.js` (compute vote percentages per option)
- [X] T099 [US5] Implement `neo-connect/backend/src/validators/poll.validator.js` — Joi: question (required), options (array, min 2 items, each string)
- [X] T100 [US5] Implement `neo-connect/backend/src/controllers/poll.controller.js` — create, list, getById (includes hasVoted for current user), vote, close handlers
- [X] T101 [US5] Create `neo-connect/backend/src/routes/poll.routes.js` — POST /polls (SECRETARIAT), GET /polls (all), GET /polls/:id (all), POST /polls/:id/vote (all), PATCH /polls/:id/close (SECRETARIAT)
- [X] T102 [P] [US5] Create polls page `neo-connect/frontend/src/app/polls/page.tsx` — list of PollCard components; Secretariat sees Create Poll button (opens shadcn Dialog with question + dynamic options fields)
- [X] T103 [P] [US5] Create `neo-connect/frontend/src/components/PollCard.tsx` — if not voted: show radio options + Vote button; if voted: show Recharts BarChart with vote counts and percentages per option; closed polls show results with CLOSED badge; Secretariat sees Close Poll button

**Checkpoint**: Secretariat creates a poll. Staff votes and sees bar chart. Second vote is rejected. Closed polls show final results to everyone.

---

## Phase 8: US6 — Staff Views the Public Hub (Priority: P2)

**Goal**: All staff can browse the Quarterly Digest, Impact Tracking table, and search/download meeting minutes.

**Independent Test**: Upload a meeting minute PDF as Secretariat → search by title keyword → find it → download it. View Impact table with at least one record.

### Tests for US6 ⚠️ Write FIRST

- [X] T104 [P] [US6] Write integration tests for public routes in `neo-connect/backend/src/routes/__tests__/public.routes.test.js` — given_authenticated_staff_when_GET_digest_then_200, given_keyword_search_when_GET_minutes_then_filtered_results, given_unauthenticated_when_GET_impact_then_401

### Implementation for US6

- [X] T105 [P] [US6] Implement `neo-connect/backend/src/controllers/public.controller.js` — `getDigest`: Prisma query grouped by quarter counting resolved cases per category; `getImpact`: paginated ImpactRecord list; `createImpact`: SECRETARIAT only; `listMinutes`: filter by title keyword (case-insensitive LIKE), paginated; `uploadMinutes`: Multer single PDF + save MeetingMinute; `downloadMinutes`: stream file from disk
- [X] T106 [US6] Create `neo-connect/backend/src/routes/public.routes.js` — GET /public/digest (all authenticated), GET /public/impact (all), POST /public/impact (SECRETARIAT), GET /public/minutes (all), POST /public/minutes (SECRETARIAT), GET /public/minutes/:id/download (all)
- [X] T107 [P] [US6] Create public hub page `neo-connect/frontend/src/app/public-hub/page.tsx` — shadcn Tabs: "Quarterly Digest" | "Impact Tracking" | "Meeting Minutes"; Digest tab: cards grouped by quarter; Impact tab: shadcn Table with issueRaised, actionTaken, outcomeChange columns, quarter filter; Minutes tab: search input + paginated list with download button per row; SECRETARIAT sees Upload Minutes + Add Impact Record buttons

**Checkpoint**: Any authenticated user can browse all three Public Hub tabs. Secretariat can upload documents and add impact records.

---

## Phase 9: US7 — Analytics Dashboard (Priority: P2)

**Goal**: Secretariat/Admin see department case counts, status/category breakdowns, and hotspot flags (5+ cases same dept+category).

**Independent Test**: Seed 5+ cases in the same department + category → run hotspot job → see department flagged in dashboard with the category shown.

### Tests for US7 ⚠️ Write FIRST

- [X] T108 [P] [US7] Write unit tests for hotspot service in `neo-connect/backend/src/services/analytics/__tests__/hotspot.service.test.js` — given_5_cases_same_dept_category_when_detectHotspots_then_returns_flagged_dept, given_4_cases_same_dept_category_when_detectHotspots_then_returns_empty, given_5_cases_different_categories_when_detectHotspots_then_returns_empty
- [X] T109 [P] [US7] Write unit tests for departmentStats service — given_mixed_case_statuses_when_getDepartmentStats_then_returns_correct_open_counts

### Implementation for US7

- [X] T110 [P] [US7] Implement `neo-connect/backend/src/repositories/analytics.repository.js` — Prisma raw aggregation: `getCasesByDepartment()` (COUNT open cases per dept), `getCasesByStatus()` (COUNT per status), `getCasesByCategory()` (COUNT per category), `detectHotspots()` (GROUP BY deptId+category HAVING COUNT >= 5 WHERE status NOT IN RESOLVED/ESCALATED)
- [X] T111 [P] [US7] Implement analytics services in `neo-connect/backend/src/services/analytics/`: `departmentStats.service.js`, `hotspot.service.js` (calls detectHotspots, saves analyticsSnapshot to MongoDB, emits `hotspot:detected` Socket.io event to secretariat/admin rooms), `dashboard.service.js` (aggregates all metrics into single dashboard payload)
- [X] T112 [US7] Implement `neo-connect/backend/src/workers/analytics.worker.js` — BullMQ Worker on `analytics` queue; runs departmentStats + hotspot detection on schedule (every 15 min); saves snapshot to MongoDB analyticsSnapshot collection
- [X] T113 [US7] Implement `neo-connect/backend/src/queues/analytics.queue.js` — BullMQ Queue with repeatable job (every 15 min); start worker in server.js
- [X] T114 [US7] Implement `neo-connect/backend/src/controllers/analytics.controller.js` — GET /analytics/dashboard: try serve latest analyticsSnapshot from MongoDB; if stale (>15 min) or missing, compute live and return
- [X] T115 [US7] Create `neo-connect/backend/src/routes/analytics.routes.js` — GET /analytics/dashboard (SECRETARIAT, ADMIN only)
- [X] T116 [P] [US7] Create analytics page `neo-connect/frontend/src/app/analytics/page.tsx` — fetches GET /analytics/dashboard; renders DepartmentHeatmap + DashboardCharts + hotspot alert cards
- [X] T117 [P] [US7] Create `neo-connect/frontend/src/components/DashboardCharts.tsx` — two Recharts BarCharts side-by-side: cases by status (colour-coded per status) and cases by category; responsive containers; loading skeleton while fetching
- [X] T118 [P] [US7] Create `neo-connect/frontend/src/components/DepartmentHeatmap.tsx` — Recharts BarChart of open cases per department sorted descending; hotspot departments highlighted with red fill and a shadcn Badge "HOTSPOT — {category}"; tooltip shows exact count

**Checkpoint**: Analytics dashboard loads with real data. Seeding 5+ cases in same dept+category triggers hotspot flag on next job run. Dashboard serves in <5 seconds.

---

## Phase 10: US8 — Admin Manages User Accounts (Priority: P3)

**Goal**: Admin can create, update role, and deactivate user accounts.

**Independent Test**: Admin creates a new STAFF account → new user logs in successfully → Admin deactivates account → login attempt returns 403 ACCOUNT_DEACTIVATED.

### Tests for US8 ⚠️ Write FIRST

- [X] T119 [P] [US8] Write integration tests for admin routes in `neo-connect/backend/src/routes/__tests__/admin.routes.test.js` — given_admin_when_createUser_then_201, given_non_admin_when_createUser_then_403, given_deactivated_user_when_login_then_403_ACCOUNT_DEACTIVATED

### Implementation for US8

- [X] T120 [US8] Implement `neo-connect/backend/src/controllers/admin.controller.js` — `listUsers`, `createUser` (hash password, create via user.repository), `updateUser` (role + department), `deactivateUser` (set isActive=false; flag open assigned cases with a Notification to Secretariat for reassignment)
- [X] T121 [US8] Create `neo-connect/backend/src/routes/admin.routes.js` — GET /admin/users, POST /admin/users, PATCH /admin/users/:id, PATCH /admin/users/:id/deactivate (ADMIN only)
- [X] T122 [P] [US8] Create admin page `neo-connect/frontend/src/app/admin/page.tsx` — shadcn Table of all users with columns: name, email, role badge, department, status (active/deactivated); Create User button (opens Dialog with form); Edit Role dropdown per row; Deactivate button with confirmation dialog (shadcn AlertDialog)

**Checkpoint**: Admin can create and deactivate accounts. Deactivated users cannot log in. Active Case Manager deactivation notifies Secretariat.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Quality, performance, accessibility, and documentation gates required by the Constitution.

- [ ] T123 Write end-to-end Playwright tests for US1 (case submission) in `neo-connect/frontend/e2e/submission.spec.ts` — full flow: login → submit case → verify tracking ID; anonymous toggle; file attachment; form validation errors
- [ ] T124 Write end-to-end Playwright tests for US2–US4 in `neo-connect/frontend/e2e/case-lifecycle.spec.ts` — assign case → update status → resolve → verify RESOLVED immutability; escalation reminder flow (short deadline)
- [ ] T125 [P] Write end-to-end Playwright tests for US5 (polls) in `neo-connect/frontend/e2e/polls.spec.ts` — create poll → vote → see chart → second vote rejected
- [ ] T126 [P] Run accessibility audit (WCAG 2.1 AA) on all pages — use axe-playwright on each route; fix any violations in shadcn/ui usage (aria-labels, focus rings, colour contrast)
- [ ] T127 [P] Analyse and optimise frontend bundle — run `next build` and check bundle analyser output; ensure initial JS ≤ 250 KB gzipped; lazy-load Recharts and analytics page; document findings
- [ ] T128 [P] Add request logging middleware to `neo-connect/backend/src/app.js` — log method, path, status, response time for every request using logger.js; exclude health check route
- [ ] T129 Add `GET /health` endpoint to `neo-connect/backend/src/app.js` — returns `{ status: "ok", postgres: "connected", mongo: "connected", redis: "connected" }`; check real connectivity
- [ ] T130 [P] Final linter + formatter pass — run `npm run lint` across both backend and frontend; fix all warnings; ensure zero ESLint warnings in CI output
- [ ] T131 [P] Review and complete `neo-connect/backend/.env.example` — verify all environment variables used in code are documented with example values and inline comments
- [ ] T132 Write `neo-connect/README.md` — complete setup guide referencing quickstart.md; prerequisites table; step-by-step backend + frontend + worker startup; seed credentials table; common issues table; architecture overview diagram (ASCII)
- [ ] T133 [P] Add `neo-connect/docker/docker-compose.yml` with services: postgres, mongo, redis (for contributors who prefer containers over local installs); include .env wiring

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3–10 (User Stories)**: All depend on Phase 2; can proceed in priority order or in parallel by team
- **Phase 11 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US1 — Submit Case | Phase 2 | Independent; first story to implement |
| US2 — Assign Case | Phase 2 + US1 (case must exist) | Needs cases to assign |
| US3 — Case Lifecycle | Phase 2 + US2 (assignment must exist) | Needs assignment to update status |
| US4 — Escalation | Phase 2 + US2 (assignment triggers job) | Needs BullMQ + US2 wiring |
| US5 — Polls | Phase 2 | Fully independent of US1–US4 |
| US6 — Public Hub | Phase 2 + US1 (resolved cases for digest) | Digest needs resolved cases |
| US7 — Analytics | Phase 2 + US1 (cases needed for stats) | Analytics query cases |
| US8 — Admin | Phase 2 | Independent; can run alongside US5 |

### Within Each User Story

1. Tests MUST be written and confirmed FAILING before implementation begins (TDD — Constitution §II)
2. Repository → Service → Controller → Route → Frontend
3. Core implementation before error/edge case handling

### Parallel Opportunities

- All [P]-marked tasks within the same phase can execute concurrently
- Phase 2 foundation tasks T011–T046 have many independent sub-groups
- US5 (Polls) and US8 (Admin) can be worked in parallel with US6/US7 after Foundation
- All Phase 11 polish tasks marked [P] can run concurrently

---

## Parallel Execution Examples

### Phase 2 — Foundation Parallel Groups

```
Group A (run together): T014, T016, T017, T018, T019, T020
Group B (run together): T015, T016
Group C (run together): T022, T023, T029, T038, T039, T040, T043
Group D (run together): T030, T031, T032, T037, T038
```

### Phase 3 — US1 Parallel Group

```
# Tests (run together first, verify FAIL):
T047, T048

# Then parallel implementation:
T051 (case repository) || T052 (attachment repository) || T053 (caseLog repository)
T059 (submit form UI) || T060 (case service frontend) || T061 (types)
```

### Phase 7 — US5 Polls Parallel Group

```
T094, T095  ← tests first
T096 (poll repo) || T097 (vote repo)
T102 (polls page) || T103 (PollCard)
```

---

## Implementation Strategy

### MVP First (User Stories 1–4 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (⚠️ blocks everything)
3. Complete Phase 3: US1 — Case Submission → **STOP, validate independently**
4. Complete Phase 4: US2 — Assignment
5. Complete Phase 5: US3 — Case Lifecycle
6. Complete Phase 6: US4 — Escalation
7. **DEMO**: Full case lifecycle with auto-escalation works end-to-end

### Incremental Delivery

- After US1–US4: Core complaint management works. Staff can submit, secretariat assigns, managers close, escalation fires.
- After US5: Add polls — independent of case flow.
- After US6: Add transparency — staff can see impact of their feedback.
- After US7: Add intelligence — management can spot recurring issues early.
- After US8: Add governance — IT can manage user accounts.

### Parallel Team Strategy (if multiple developers)

After Phase 2 completes:
- **Developer A**: US1 → US2 → US3 (core case pipeline)
- **Developer B**: US4 (escalation + notifications) → US7 (analytics)
- **Developer C**: US5 (polls) → US6 (public hub) → US8 (admin)

---

## Notes

- `[P]` tasks touch different files with no dependency on other in-progress tasks — safe to parallelise
- `[Story]` label maps every task to its user story for traceability and independent delivery
- TDD is mandatory (Constitution §II): every service and route must have tests written FIRST
- Test naming convention: `given_[state]_when_[action]_then_[outcome]` (Constitution §II)
- Commit after each logical group; use branch per story if team is parallelising
- Run `npm run lint` before every commit — zero warnings required (Constitution §I)
- Anonymous case privacy: submitterId must NEVER appear in any API response when isAnonymous=true; add integration test specifically for this
- Escalation job IDs must be stored on CaseAssignment for reliable cancellation
