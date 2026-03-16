# NeoConnect — Architecture, Data Models & Escalation Workers

Deep-dive technical reference for the backend system design.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Models — PostgreSQL](#2-data-models--postgresql)
3. [Data Models — MongoDB](#3-data-models--mongodb)
4. [Escalation Worker](#4-escalation-worker)
5. [Queue Architecture (BullMQ + Redis)](#5-queue-architecture-bullmq--redis)
6. [Case Lifecycle & Transitions](#6-case-lifecycle--transitions)
7. [Service Layer Design](#7-service-layer-design)
8. [Repository Pattern](#8-repository-pattern)
9. [Real-time Architecture (Socket.io)](#9-real-time-architecture-socketio)

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    HTTP Server Process                            │
│                    (node src/server.js)                           │
│                                                                  │
│   ┌──────────┐    ┌────────────┐    ┌──────────────────────┐    │
│   │  Express │    │  Socket.io │    │  BullMQ Queue Client │    │
│   │  REST API│    │  Server    │    │  (adds jobs to Redis)│    │
│   └────┬─────┘    └─────┬──────┘    └──────────────────────┘    │
│        │                │                                        │
│   Middleware Pipeline   │  Rooms: user:{id}, management          │
│   Helmet→CORS→Auth      │                                        │
│   →Role→Validate        │                                        │
└────────┼────────────────┼─────────────────────────────────────────┘
         │                │
         ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                   │
│                                                                  │
│  PostgreSQL (Neon)          MongoDB (Atlas)      Redis (Upstash) │
│  ─────────────────          ───────────────      ──────────────  │
│  Users, Cases,              Logs, Comments,      BullMQ Queues   │
│  Assignments, Polls,        Snapshots,           Job Storage     │
│  Notifications              Reminders                            │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │
┌────────┴────────────────────────────────────────────────────────┐
│               Background Worker Process (separate)               │
│               (node src/workers/escalation.worker.js)            │
│                                                                  │
│   BullMQ Worker → processes escalation jobs from Redis queue     │
│   Runs independently — does NOT share memory with HTTP server    │
└─────────────────────────────────────────────────────────────────┘
```

### Why Two Databases?

| Criterion | PostgreSQL | MongoDB |
|-----------|-----------|---------|
| Data type | Structured, relational | Semi-structured, document |
| Use case | Users, cases, assignments, polls | Logs, comments, snapshots, reminders |
| Write pattern | Moderate, transactional | High-volume, append-heavy |
| Query pattern | JOINs, aggregations, FK integrity | Single-document, time-series lookups |
| Consistency | ACID transactions (Prisma) | Eventual (acceptable for audit logs) |
| Schema enforcement | Strict — Prisma schema | Flexible — Mongoose with validation |

---

## 2. Data Models — PostgreSQL

Managed via **Prisma ORM**. Schema file: `prisma/schema.prisma`

### Enumerations

```prisma
enum Role         { STAFF, SECRETARIAT, CASE_MANAGER, ADMIN }
enum CaseCategory { SAFETY, POLICY, FACILITIES, HR, OTHER }
enum CaseSeverity { LOW, MEDIUM, HIGH }
enum CaseStatus   { NEW, ASSIGNED, IN_PROGRESS, PENDING, RESOLVED, ESCALATED }
enum NotificationType {
  CASE_ASSIGNED, STATUS_UPDATED, ESCALATION_REMINDER,
  ESCALATION_ALERT, POLL_CREATED, INFO_REQUESTED, ANNOUNCEMENT
}
```

---

### `Department`

Organisational units that cases and users belong to.

```
id        String   @id @default(uuid())
name      String   @unique
isActive  Boolean  @default(true)
createdAt DateTime @default(now())
```

Relations: `users[]`, `cases[]`

---

### `User`

All platform accounts regardless of role.

```
id           String   @id @default(uuid())
email        String   @unique
passwordHash String                          ← bcrypt, cost 12
fullName     String
role         Role     @default(STAFF)
departmentId String                          ← FK → Department
isActive     Boolean  @default(true)
refreshToken String?                         ← null on logout
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
```

Relations: `submittedCases`, `managedAssignments`, `givenAssignments`, `statusLogs`, `notifications`, `votes`, `createdPolls`, `impactRecords`, `meetingMinutes`

> `refreshToken` is nullable — cleared on logout to immediately invalidate the session without needing a token blacklist.

---

### `Case`

The core entity of the entire system.

```
id          String       @id @default(uuid())
trackingId  String       @unique                ← format: NEO-YYYY-NNN
category    CaseCategory
departmentId String                             ← FK → Department
location    String
severity    CaseSeverity
description String
isAnonymous Boolean      @default(false)
submitterId String?                             ← nullable for anonymous
status      CaseStatus   @default(NEW)
escalatedAt DateTime?                           ← set by escalation worker
resolvedAt  DateTime?
withdrawnAt DateTime?
isPriority  Boolean      @default(false)
createdAt   DateTime     @default(now())
updatedAt   DateTime     @updatedAt
```

Indexes: `status`, `departmentId`, `category`, `submitterId`

Relations: `assignments[]`, `statusLogs[]`, `notifications[]`, `outboxEvents[]`

> `submitterId` is nullable. When `isAnonymous = true`, the service stores `null` — managers never receive the submitter's identity.

---

### `CaseAssignment`

Links a case to the case manager currently responsible for it.

```
id                 String   @id @default(uuid())
caseId             String                        ← FK → Case
managerId          String                        ← FK → User (CASE_MANAGER)
assignedById       String                        ← FK → User (SECRETARIAT/ADMIN)
assignedAt         DateTime @default(now())
escalationDeadline DateTime                      ← calculated: now + 7 working days
escalationJobId    String?                       ← BullMQ job ID for cancellation
isActive           Boolean  @default(true)
```

Indexes: `caseId`, `managerId`

> `escalationJobId` is stored so the job can be cancelled if the case is reassigned before the deadline fires. Only one assignment has `isActive = true` per case at any time.

---

### `CaseStatusLog`

Immutable record of every status transition.

```
id          String     @id @default(uuid())
caseId      String                           ← FK → Case
fromStatus  CaseStatus
toStatus    CaseStatus
changedById String                           ← FK → User
note        String?
changedAt   DateTime   @default(now())
```

Index: `caseId`

> Every assignment, status update, and escalation is recorded here. Used to render the case timeline in the frontend.

---

### `Poll` / `PollOption` / `Vote`

```
Poll:
  id, question, createdById, isOpen, createdAt, closedAt?

PollOption:
  id, pollId, text, displayOrder

Vote:
  id, pollId, optionId, userId, votedAt
  @@unique([pollId, userId])   ← one vote per user per poll, enforced at DB level
```

> The `@@unique` constraint on `[pollId, userId]` means duplicate votes are rejected at the database level — not just application level.

---

### `Notification`

In-app notifications delivered via Socket.io.

```
id          String           @id @default(uuid())
recipientId String                                ← FK → User
type        NotificationType
caseId      String?                               ← FK → Case (nullable for polls/announcements)
message     String
isRead      Boolean          @default(false)
createdAt   DateTime         @default(now())
```

Indexes: `recipientId`, `isRead`

---

### `ImpactRecord` / `MeetingMinute`

Public Hub content managed by Secretariat/Admin.

```
ImpactRecord:
  id, issueRaised, actionTaken, outcomeChange, quarter, createdById, createdAt
  @@index([quarter])

MeetingMinute:
  id, title, quarter, uploadedById, storagePath, uploadedAt
  @@index([quarter])
```

---

### `OutboxEvent`

Transactional outbox pattern — events written atomically with the DB change, then processed asynchronously.

```
id          String    @id @default(uuid())
eventType   String                           ← e.g. "case_assigned"
caseId      String?
payload     Json
processedAt DateTime?                        ← null = unprocessed
createdAt   DateTime  @default(now())
```

Index: `processedAt`

---

## 3. Data Models — MongoDB

Managed via **Mongoose**. All schemas in `src/models/mongo/`

---

### `CaseLog` — Insert-Only Audit Trail

```js
{
  caseId:    String,   // required, indexed
  actorId:   String,   // 'system' for automated actions
  actorRole: String,   // 'SYSTEM', 'SECRETARIAT', 'CASE_MANAGER', etc.
  action:    String,   // e.g. 'case_assigned', 'case_escalated', 'status_updated'
  details:   Mixed,    // free-form context object
  timestamp: Date,     // indexed
}
collection: 'case_logs'
```

**Critical design:** A Mongoose `pre('save')` middleware throws an error if `this.isNew === false`, making every document **insert-only**. The audit trail cannot be tampered with after writing.

```js
caseLogSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('CaseLog is insert-only'));
  return next();
});
```

---

### `CaseComment`

Public discussion visible to all case participants.

```js
{
  caseId:     String,   // indexed
  authorId:   String,
  authorName: String,
  authorRole: String,
  content:    String,
  timestamps: true
}
```

---

### `CaseInternalNote`

Manager-only notes. The API route is protected by `requireRole(CASE_MANAGER, SECRETARIAT, ADMIN)` — staff never receive these.

```js
{
  caseId:     String,  // indexed
  authorId:   String,
  authorName: String,
  content:    String,
  timestamps: true
}
```

---

### `CaseReminder`

Follow-up reminders set by case managers.

```js
{
  caseId:         String,   // indexed
  caseTrackingId: String,
  managerId:      String,   // indexed
  note:           String,
  remindAt:       Date,
  isDone:         Boolean,  // default: false
  timestamps: true
}
```

---

### `CaseRating`

Post-resolution satisfaction score from the original submitter.

```js
{
  caseId:      String,   // unique — one rating per case
  submitterId: String,
  rating:      Number,   // min: 1, max: 5
  feedback:    String,
  timestamps: true
}
```

---

### `EscalationRule`

Per-category configuration for the escalation window. Stored in MongoDB for fast, flexible updates by Admin without a schema migration.

```js
{
  category:      String,   // unique — enum: SAFETY, POLICY, FACILITIES, HR, OTHER, __DEFAULT__
  windowDays:    Number,   // min: 1, max: 365, default: 7
  updatedById:   String,
  updatedByName: String,
  timestamps: true
}
```

> `__DEFAULT__` is the fallback rule used when no category-specific rule exists.
> The escalation window is read at assignment time by `assignCaseService` to calculate the `escalationDeadline`.

---

### `SlaTarget`

Resolution time targets per category, with optional severity overrides.

```js
{
  category:         String,   // unique
  targetDays:       Number,
  severityOverrides: {
    HIGH:   Number,
    MEDIUM: Number,
    LOW:    Number,
  },
  updatedById: String,
  updatedAt:   Date
}
```

---

### `Announcement`

Scheduled or immediate broadcasts to all staff.

```js
{
  title:          String,
  content:        String,
  createdById:    String,
  createdByName:  String,
  scheduledAt:    Date,
  sentAt:         Date,
  status:         String,  // enum: SCHEDULED, SENT, CANCELLED
  recipientCount: Number,
  timestamps: true
}
```

---

### `AnalyticsSnapshot`

Pre-computed analytics cached by the analytics worker. TTL index automatically purges stale snapshots after 90 days.

```js
{
  snapshotType: String,   // 'department_stats' | 'hotspot_check' | 'trend'
  generatedAt:  Date,
  data:         Mixed,    // flexible — holds computed result
  ttl:          Date,     // TTL index: expires after 90 days
}
```

---

### `RoleChangeLog`

Admin audit history for every role change.

```js
{
  targetUserId:    String,
  targetUserEmail: String,
  targetUserName:  String,
  oldRole:         String,
  newRole:         String,
  changedById:     String,
  changedByEmail:  String,
  timestamps: true
}
```

---

## 4. Escalation Worker

**File:** `src/workers/escalation.worker.js`
**Run:** `npm run worker:escalation`

The escalation worker is a **separate Node.js process** — it does not run inside the HTTP server. It connects to the same Redis and MongoDB instances but is completely isolated.

### How Escalation Works — Full Flow

```
1. Secretariat assigns a case via PATCH /cases/:id/assign
         │
         ▼
2. assignCaseService calculates escalationDeadline:
   escalationDeadline = addWorkingDays(now, 7)
   (uses business-days-js — skips weekends)
         │
         ▼
3. Prisma transaction (atomic):
   ├── case.status = 'ASSIGNED'
   ├── CaseAssignment created (with escalationDeadline)
   ├── CaseStatusLog entry written
   └── OutboxEvent written
         │
         ▼
4. addEscalationJob(caseId, assignmentId, delayMs) called:
   ├── delayMs = escalationDeadline.getTime() - Date.now()
   ├── BullMQ adds delayed job to Redis queue
   ├── jobId stored back in CaseAssignment.escalationJobId
   └── Job will fire automatically when delayMs elapses
         │
         ▼ (7 working days later)
5. BullMQ fires the delayed job → escalation worker receives it
         │
         ▼
6. processEscalation(job):
   ├── Load case from DB
   ├── If already RESOLVED or ESCALATED → skip (no-op)
   ├── If still ASSIGNED/IN_PROGRESS/PENDING:
   │     ├── Prisma transaction:
   │     │     ├── case.status = 'ESCALATED'
   │     │     ├── case.escalatedAt = now()
   │     │     └── CaseStatusLog entry written
   │     ├── CaseLog entry written (actorId: 'system')
   │     └── notificationService.notifyEscalation() called
   └── Manager + Secretariat receive real-time notifications
```

### Cancellation on Reassignment

When a case is **reassigned** before the deadline:

```
1. Old assignment deactivated (isActive = false)
2. removeEscalationJob(existingAssignment.escalationJobId)
   └── BullMQ removes the pending job from Redis
3. New assignment created with new escalationDeadline
4. New escalation job scheduled with new delayMs
```

This prevents the old job from firing on a case that has already been reassigned.

### Worker Configuration

```js
const worker = new Worker(QUEUE_NAMES.ESCALATION, processEscalation, {
  connection: getRedisClient(),
  concurrency: 5,   // process up to 5 escalation jobs in parallel
});
```

### Job Options

```js
defaultJobOptions: {
  attempts: 3,                          // retry up to 3 times on failure
  backoff: { type: 'exponential', delay: 2000 },  // 2s, 4s, 8s
  removeOnComplete: 100,                // keep last 100 completed jobs
  removeOnFail: 50,                     // keep last 50 failed jobs
}
```

### Graceful Shutdown

```js
process.on('SIGTERM', async () => {
  await worker.close();   // finish in-flight jobs, then stop
  process.exit(0);
});
```

---

## 5. Queue Architecture (BullMQ + Redis)

### Queue Names

Defined in `src/constants/queue.constants.js`:

```js
QUEUE_NAMES = {
  ESCALATION: 'escalation',
  // analytics and hotspot workers use their own queue names
}
```

### Queue Singleton Pattern

The queue client is a lazy singleton — only one `Queue` instance is created per process, reusing the same Redis connection:

```js
let escalationQueue = null;

const getEscalationQueue = () => {
  if (!escalationQueue) {
    escalationQueue = new Queue(QUEUE_NAMES.ESCALATION, {
      connection: getRedisClient(),
      defaultJobOptions: { ... }
    });
  }
  return escalationQueue;
};
```

### Adding a Delayed Job

```js
const addEscalationJob = async (caseId, assignmentId, delayMs) => {
  const queue = getEscalationQueue();
  const job = await queue.add(
    'escalate',
    { caseId, assignmentId },           // job payload
    {
      delay: delayMs,                   // fires after this many milliseconds
      jobId: `escalation-${caseId}`,    // deterministic ID — prevents duplicate jobs
    }
  );
  return job.id;
};
```

> Using a deterministic `jobId` (`escalation-{caseId}`) means if `addEscalationJob` is called twice for the same case (e.g. due to a retry), BullMQ will not create a duplicate job.

### Removing a Job

```js
const removeEscalationJob = async (jobId) => {
  const queue = getEscalationQueue();
  const job = await queue.getJob(jobId);
  if (job) await job.remove();
};
```

---

## 6. Case Lifecycle & Transitions

**File:** `src/domain/case/case.lifecycle.js`

Valid transitions enforced at the service layer:

```
NEW         → ASSIGNED
ASSIGNED    → IN_PROGRESS, ESCALATED
IN_PROGRESS → PENDING, RESOLVED, ESCALATED
PENDING     → IN_PROGRESS, RESOLVED, ESCALATED
RESOLVED    → (terminal)
ESCALATED   → (terminal)
```

`isValidTransition(fromStatus, toStatus)` is called before any status change. Invalid transitions return a `400 INVALID_TRANSITION` error.

### State Machine Diagram

```
          ┌───────────────────────────────────────────────┐
          │               STAFF submits                    │
          ▼                                                │
        [ NEW ] ──── Secretariat assigns ───────▶ [ ASSIGNED ]
                                                      │
                                            Manager starts work
                                                      │
                                                      ▼
                                               [ IN_PROGRESS ]
                                                 │         │
                                         Awaits info     Resolved
                                                 │         │
                                                 ▼         ▼
                                            [ PENDING ] [ RESOLVED ] ← terminal
                                                 │
                                           Info received
                                                 │
                                                 ▼
                                           [ IN_PROGRESS ]

  Any of ASSIGNED / IN_PROGRESS / PENDING  ──── SLA exceeded ──▶ [ ESCALATED ] ← terminal
```

---

## 7. Service Layer Design

Services contain all business logic. Controllers are thin — they validate, call a service, and return the result.

### `assignCaseService`

```
Input:  { caseId, managerId, assignedById }

Steps:
  1. Verify case exists and is in a valid state for assignment
  2. Verify manager exists and has CASE_MANAGER role
  3. Deactivate existing assignment + cancel its escalation job
  4. Calculate escalationDeadline = now + 7 working days (business days only)
  5. Prisma transaction:
     ├── Update case.status = 'ASSIGNED'
     ├── Create CaseAssignment with escalationDeadline
     ├── Create CaseStatusLog entry
     └── Create OutboxEvent for downstream processing
  6. Write CaseLog to MongoDB (actorId = secretariat user)
  7. Schedule BullMQ delayed job with delayMs
  8. Store jobId back on the CaseAssignment record

Output: { caseId, assignment, escalationDeadline }
```

### `createCaseService`

```
Steps:
  1. Generate trackingId → format NEO-YYYY-NNN (atomic counter in PostgreSQL)
  2. Create Case record (submitterId = null if isAnonymous)
  3. Save Attachment metadata to MongoDB (for each uploaded file)
  4. Write CaseLog entry
  5. Create OutboxEvent
  6. Send real-time notification to management room via Socket.io
```

### `updateCaseStatusService`

```
Steps:
  1. Verify transition is valid via isValidTransition()
  2. Update Case.status
  3. Create CaseStatusLog
  4. If RESOLVED → set case.resolvedAt
  5. Write CaseLog
  6. Notify submitter via notificationService
```

---

## 8. Repository Pattern

All database access goes through repositories — controllers and services never call Prisma or Mongoose directly.

```
src/repositories/
├── case.repository.js         ← Prisma: findById, create, updateStatus, summary
├── assignment.repository.js   ← Prisma: findActiveByCaseId, deactivate, updateEscalationJobId
├── caseLog.repository.js      ← Mongoose CaseLog: log()
├── user.repository.js         ← Prisma: findById, findByEmail, create, updateById, deactivate, reactivate
├── notification.repository.js ← Prisma: create, markRead, markAllRead
├── analytics.repository.js    ← Prisma + Mongoose: aggregations, snapshots
├── attachment.repository.js   ← Mongoose: save, findByCaseId
├── poll.repository.js         ← Prisma: create, findById, close
└── vote.repository.js         ← Prisma: create (unique constraint handles duplicates)
```

**Benefits:**
- Easy to swap data sources (e.g. move a model from Postgres to Mongo) without touching controllers
- All DB queries are in one place — easier to optimise
- Services are unit-testable by mocking repositories

---

## 9. Real-time Architecture (Socket.io)

**File:** `src/socket.js` and `src/realtime/notification.socket.js`

### Connection Flow

```
1. Client connects to Socket.io with JWT in auth:
   socket.auth = { token: accessToken }

2. Server middleware verifies JWT signature and expiry

3. On success:
   socket.join(`user:${userId}`)        ← personal room
   if (role !== 'STAFF'):
     socket.join('management')          ← management-wide room

4. On failure: socket.disconnect()
```

### Notification Events

| Event | Emitted to | Trigger |
|-------|-----------|---------|
| `notification:new` | `user:{recipientId}` | Any new Notification record |
| `case:updated` | `management` | Case status change |
| `case:new` | `management` | New case submitted |

### Notification Service

`notificationService` creates a `Notification` record in PostgreSQL, then emits the Socket.io event:

```js
// Creates DB record + emits to personal room
await notificationService.notify({
  recipientId,
  type: 'STATUS_UPDATED',
  caseId,
  message: `Case ${trackingId} has been updated to ${newStatus}`
});
```

Real-time delivery is best-effort — the DB record persists even if the socket delivery fails (user was offline). The frontend fetches unread notifications on mount as a fallback.

---

## Running Workers

Workers are separate processes — they must be started independently of the HTTP server:

```bash
# Start HTTP server
npm run dev

# In a separate terminal — escalation worker
npm run worker:escalation
```

In production on Render, deploy each worker as a separate Background Worker service pointing to the same repository.

```
Render Service 1:  node src/server.js          (Web Service)
Render Service 2:  node src/workers/escalation.worker.js  (Background Worker)
```

Both services share the same environment variables (PostgreSQL, MongoDB, Redis URLs).
