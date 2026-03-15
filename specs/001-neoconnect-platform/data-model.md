# Data Model: NeoConnect Platform

**Branch**: `001-neoconnect-platform` | **Date**: 2026-03-15

---

## Storage Split

| Store | Holds | Rationale |
|-------|-------|-----------|
| **PostgreSQL** | Users, Departments, Cases, CaseAssignments, ActivityLogs (relational ref), Polls, Votes, Notifications, ImpactRecords, MeetingMinutes | Relational, transactional, ACID-critical |
| **MongoDB** | Attachments, CaseLogs (full audit trail), AnalyticsSnapshots, SystemLogs, OutboxEvents | Document/unstructured, eventually consistent, high write volume |

---

## PostgreSQL Entities (Prisma Schema)

### User
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | Auto-generated |
| email | String UNIQUE | Login identifier |
| passwordHash | String | bcrypt hashed |
| fullName | String | Display name |
| role | Enum | STAFF, SECRETARIAT, CASE_MANAGER, ADMIN |
| departmentId | UUID FK → Department | Required |
| isActive | Boolean | false = deactivated |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Validation**: email must be valid format; role must be one of the four values; departmentId must exist.

---

### Department
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| name | String UNIQUE | e.g. "HR", "IT", "Facilities" |
| createdAt | DateTime | |

---

### Case
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | Internal ID |
| trackingId | String UNIQUE | Format: NEO-YYYY-NNN |
| category | Enum | SAFETY, POLICY, FACILITIES, HR, OTHER |
| departmentId | UUID FK → Department | Department being reported about |
| location | String | Free text |
| severity | Enum | LOW, MEDIUM, HIGH |
| description | String | Full case description |
| isAnonymous | Boolean | If true, submitterId is never returned in queries |
| submitterId | UUID FK → User NULLABLE | Null if anonymous |
| status | Enum | NEW, ASSIGNED, IN_PROGRESS, PENDING, RESOLVED, ESCALATED |
| escalatedAt | DateTime NULLABLE | Set when auto-escalation triggers |
| resolvedAt | DateTime NULLABLE | Set when status → RESOLVED |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**State machine**:
```
NEW → ASSIGNED (secretariat only)
ASSIGNED → IN_PROGRESS (case manager only)
IN_PROGRESS → PENDING (case manager only)
PENDING → IN_PROGRESS (case manager only)
IN_PROGRESS → RESOLVED (case manager only)
ASSIGNED / IN_PROGRESS → ESCALATED (system only, 7-day rule)
RESOLVED → [no transitions — immutable]
```

**Tracking ID generation**: `NEO-{YYYY}-{padded sequential number per year}` e.g. `NEO-2026-001`

---

### CaseAssignment
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| caseId | UUID FK → Case UNIQUE | One active assignment per case |
| managerId | UUID FK → User | Must have role CASE_MANAGER |
| assignedById | UUID FK → User | Must have role SECRETARIAT |
| assignedAt | DateTime | Assignment timestamp |
| escalationDeadline | DateTime | 7 working days from assignedAt |
| escalationJobId | String NULLABLE | BullMQ job ID for cancellation |
| isActive | Boolean | false = superseded by reassignment |

---

### CaseStatusLog
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| caseId | UUID FK → Case | |
| fromStatus | Enum | Previous status |
| toStatus | Enum | New status |
| changedById | UUID FK → User | Actor |
| note | String NULLABLE | Optional note added with this transition |
| changedAt | DateTime | Immutable timestamp |

**Constraint**: Records are insert-only. No UPDATE or DELETE permitted on this table.

---

### Poll
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| question | String | Poll question text |
| createdById | UUID FK → User | Must have role SECRETARIAT |
| isOpen | Boolean | true = accepting votes |
| createdAt | DateTime | |
| closedAt | DateTime NULLABLE | |

---

### PollOption
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| pollId | UUID FK → Poll | |
| text | String | Option label |
| displayOrder | Int | Ordering for display |

---

### Vote
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| pollId | UUID FK → Poll | |
| optionId | UUID FK → PollOption | |
| userId | UUID FK → User | |
| votedAt | DateTime | |

**Constraint**: UNIQUE(pollId, userId) — enforces one vote per user per poll at DB level.

---

### Notification
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| recipientId | UUID FK → User | |
| type | Enum | CASE_ASSIGNED, STATUS_UPDATED, ESCALATION_REMINDER, ESCALATION_ALERT, POLL_CREATED |
| caseId | UUID FK → Case NULLABLE | If notification relates to a case |
| message | String | Human-readable message |
| isRead | Boolean | Default false |
| createdAt | DateTime | |

---

### ImpactRecord
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| issueRaised | String | What was submitted |
| actionTaken | String | What management did |
| outcomeChange | String | What changed as a result |
| quarter | String | e.g. "Q1 2026" |
| createdById | UUID FK → User | Secretariat user who created it |
| createdAt | DateTime | |

---

### MeetingMinute
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| title | String | Document title (searchable) |
| quarter | String | e.g. "Q1 2026" |
| uploadedById | UUID FK → User | Secretariat |
| storagePath | String | File path or storage key |
| uploadedAt | DateTime | |

---

### OutboxEvent (PostgreSQL — transactional outbox)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| eventType | String | e.g. "case_created", "case_escalated" |
| payload | JSONB | Event data |
| processedAt | DateTime NULLABLE | Null = pending |
| createdAt | DateTime | |

---

## MongoDB Collections

### attachments
```
{
  _id: ObjectId,
  caseId: String,          // references Case.id (UUID)
  originalName: String,    // original filename
  storedName: String,      // UUID-based filename on disk
  mimeType: String,        // image/jpeg, application/pdf, etc.
  sizeBytes: Number,
  storagePath: String,
  uploadedById: String,    // references User.id
  uploadedAt: Date
}
```
**Constraints**: mimeType must be image/jpeg, image/png, or application/pdf. sizeBytes ≤ 10,485,760 (10 MB).

---

### caseLogs (full audit trail)
```
{
  _id: ObjectId,
  caseId: String,
  actorId: String,         // userId or "system"
  actorRole: String,
  action: String,          // e.g. "status_changed", "note_added", "file_attached"
  details: Object,         // flexible payload per action type
  timestamp: Date
}
```
**Constraint**: Insert-only collection — no updates or deletes.

---

### analyticsSnapshots
```
{
  _id: ObjectId,
  snapshotType: String,    // "department_stats" | "hotspot_check" | "trend"
  generatedAt: Date,
  data: Object             // Flexible snapshot payload
}
```
TTL index: documents expire after 90 days.

---

### systemLogs
```
{
  _id: ObjectId,
  level: String,           // "info" | "warn" | "error"
  service: String,
  message: String,
  metadata: Object,
  timestamp: Date
}
```
TTL index: documents expire after 30 days.

---

## Key Relationships Summary

```
User ──< Case (submitter, nullable for anonymous)
User ──< CaseAssignment (manager)
User ──< CaseAssignment (assigned by)
Case ──< CaseAssignment (one active per case)
Case ──< CaseStatusLog (immutable history)
Case ──< Notification (related cases)
Case ──── MongoDB.attachments (cross-store reference by UUID)
Case ──── MongoDB.caseLogs (cross-store audit trail)
Department ──< User
Department ──< Case
Poll ──< PollOption
Poll ──< Vote
Vote >── PollOption
Vote >── User (UNIQUE per poll)
```

---

## Hotspot Detection Rule

Flagged when: `COUNT(cases WHERE status IN (NEW, ASSIGNED, IN_PROGRESS, PENDING) AND departmentId = X AND category = Y) >= 5`

Evaluated by the analytics background job and stored in `analyticsSnapshots`.
