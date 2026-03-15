# Research: NeoConnect Platform

**Branch**: `001-neoconnect-platform` | **Date**: 2026-03-15
**Status**: Complete — all unknowns resolved

---

## Decision 1: ORM for PostgreSQL

**Decision**: Prisma

**Rationale**:
- First-class TypeScript support with fully auto-generated, type-safe client — zero manual type annotations
- Declarative schema with `prisma migrate` handles versioned migrations automatically
- 3× faster than Sequelize for large result sets (Prisma 7 TypeScript-native engine)
- Optimised join strategies (LATERAL joins on PostgreSQL) prevent N+1 by default
- Actively maintained with quarterly roadmaps and enterprise support; Sequelize is seeking new maintainers

**Alternatives considered**:
- Sequelize: Requires `sequelize-typescript` for types, more migration boilerplate, maintenance concerns
- Drizzle: Lighter but less mature ecosystem for complex relational models

---

## Decision 2: Escalation Job Architecture (7 Working Days)

**Decision**: BullMQ delayed jobs — one job per case assignment, calculated at assignment time

**Rationale**:
- Compute the exact 7-working-day deadline at assignment time using `business-days-js` (skips weekends; holidays out of scope for v1)
- Queue a single delayed job per case with `delay = deadline − now` in milliseconds
- When Case Manager updates status, immediately `queue.remove(jobId)` to cancel the job
- Dedicated worker process (separate from Express server) processes escalation jobs
- Race condition safety: check `case.status` inside the processor before updating; skip if already resolved/escalated

**Alternatives considered**:
- Cron-based polling: Higher Redis/DB load, less precise timing, harder to cancel per-case
- `setTimeout` in memory: Lost on server restart, not suitable for production

**Key patterns**:
- Store BullMQ `jobId` on the `CaseAssignment` record for reliable cancellation
- Worker retries: 3 attempts with exponential backoff (2s, 4s, 8s) for transient failures
- Dead-letter queue for failed escalations — business-critical, must alert ops

---

## Decision 3: JWT Authentication Strategy

**Decision**: Access token in React memory + refresh token in HttpOnly cookie

**Rationale**:
- HttpOnly cookies are inaccessible to JavaScript — immune to XSS token theft
- Short-lived access tokens (15 min) reduce exposure window if intercepted
- Refresh tokens (7 days) provide seamless session persistence across page reloads
- Next.js middleware uses `jose` (not `jsonwebtoken`) for edge-compatible JWT verification
- Token rotation on every refresh prevents replay attacks

**Security notes**:
- CVE-2025-29927: Next.js middleware alone is NOT sufficient — every Express API route must independently verify JWT and role
- Refresh endpoint rotates refresh token on every call (old token invalidated)
- Cookies: `Secure`, `HttpOnly`, `SameSite=Strict`

**Alternatives considered**:
- localStorage: Vulnerable to XSS
- Session cookies (server-side): Stateful, harder to scale horizontally

---

## Decision 4: Dual-Database Transaction Strategy (PostgreSQL + MongoDB)

**Decision**: PostgreSQL-primary with Transactional Outbox Pattern for eventual consistency to MongoDB

**Rationale**:
- PostgreSQL holds all transactional data (cases, users, assignments, votes) — must be ACID
- MongoDB holds audit logs, file metadata, analytics snapshots — can be eventually consistent
- Transactional Outbox: write case data + outbox record in one PostgreSQL ACID transaction, background worker polls outbox and writes to MongoDB asynchronously
- This guarantees no cross-database partial failures; MongoDB writes are retried automatically
- Services depend on repository interfaces only — dual-DB is invisible to business logic

**Alternatives considered**:
- Two-phase commit (2PC): PostgreSQL and MongoDB don't reliably support distributed transactions
- Synchronous dual writes: Single point of failure — MongoDB unavailability would block case creation

**Connection pooling**:
- PostgreSQL: `pg.Pool` with `max: 20`, managed by Prisma
- MongoDB: Mongoose default pool (auto-managed), replica set required even for single-node dev
- Both initialised as singletons at startup; graceful shutdown drains both

---

## Decision 5: File Upload Strategy

**Decision**: Multer (disk storage) for local development; S3-compatible path abstracted behind a storage service

**Rationale**:
- Multer is the standard Express file upload middleware — simple, battle-tested
- File metadata stored in MongoDB (filename, size, MIME type, case reference, upload path)
- Actual file bytes stored on disk (local dev) or S3 (production) — swappable via storage service interface
- 10 MB per file limit enforced at Multer config level

---

## Decision 6: Real-time Notifications

**Decision**: Socket.io — rooms per user, event-driven from BullMQ worker and Express controllers

**Rationale**:
- Socket.io provides reliable WebSocket with HTTP long-poll fallback — works behind proxies
- Each authenticated user joins a room keyed to their `userId`; notifications are emitted to that room
- Escalation worker and notification service emit events to the Socket.io server via Redis pub/sub (Socket.io Redis adapter)
- Keeps real-time updates decoupled from HTTP request cycle

---

## All NEEDS CLARIFICATION Resolved

| Topic | Resolution |
|-------|-----------|
| ORM choice (Prisma vs Sequelize) | **Prisma** |
| Escalation job pattern | **BullMQ delayed jobs, one per assignment** |
| JWT storage strategy | **Access token in memory + refresh in HttpOnly cookie** |
| Cross-DB transaction strategy | **PostgreSQL-primary + Transactional Outbox to MongoDB** |
| File storage | **Multer + local disk (dev), abstracted for S3 swap** |
| Real-time strategy | **Socket.io with Redis adapter** |
