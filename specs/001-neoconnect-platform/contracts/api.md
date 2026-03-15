# API Contracts: NeoConnect Platform

**Branch**: `001-neoconnect-platform` | **Date**: 2026-03-15
**Base URL**: `http://localhost:5000/api`

---

## Conventions

- All requests and responses use `Content-Type: application/json` unless noted
- Authentication: `Authorization: Bearer <access_token>` header on all protected routes
- Errors follow: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable" } }`
- Success follows: `{ "success": true, "data": { ... } }`
- Pagination: `{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100 } }`
- Role codes: `STAFF` | `SECRETARIAT` | `CASE_MANAGER` | `ADMIN`

---

## Auth Routes

### POST /auth/login
Login and receive tokens.

**Access**: Public

**Request**:
```json
{
  "email": "user@company.com",
  "password": "plaintext"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "uuid",
      "fullName": "Abrar C",
      "email": "user@company.com",
      "role": "STAFF",
      "departmentId": "uuid"
    }
  }
}
```
Refresh token set as `HttpOnly` cookie: `refreshToken`.

**Errors**: `401 INVALID_CREDENTIALS` | `403 ACCOUNT_DEACTIVATED`

---

### POST /auth/refresh
Exchange refresh token for new access token.

**Access**: Public (refresh token in cookie)

**Response 200**: Same shape as login `data` field.

**Errors**: `401 REFRESH_TOKEN_MISSING` | `401 REFRESH_TOKEN_INVALID` | `401 REFRESH_TOKEN_EXPIRED`

---

### POST /auth/logout
Invalidate refresh token.

**Access**: Authenticated

**Response 200**: `{ "success": true }`

---

## Case Routes

### POST /cases
Submit a new case. Supports `multipart/form-data` for file attachments.

**Access**: STAFF, SECRETARIAT, CASE_MANAGER, ADMIN

**Request** (multipart/form-data):
```
category: SAFETY | POLICY | FACILITIES | HR | OTHER
departmentId: uuid
location: string
severity: LOW | MEDIUM | HIGH
description: string (min 20 chars)
isAnonymous: boolean
files[]: file (optional, max 10MB each, image/jpeg|png or application/pdf)
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trackingId": "NEO-2026-001",
    "status": "NEW",
    "createdAt": "2026-03-15T10:00:00Z"
  }
}
```

**Errors**: `400 VALIDATION_ERROR` | `413 FILE_TOO_LARGE` | `415 UNSUPPORTED_FILE_TYPE`

---

### GET /cases
List cases. Secretariat sees all; Case Manager sees only assigned cases; Staff sees only their own (non-anonymous).

**Access**: SECRETARIAT, CASE_MANAGER, ADMIN, STAFF

**Query params**: `status`, `category`, `departmentId`, `severity`, `page`, `limit`

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "trackingId": "NEO-2026-001",
      "category": "SAFETY",
      "department": { "id": "uuid", "name": "Facilities" },
      "severity": "HIGH",
      "status": "NEW",
      "isAnonymous": false,
      "submitter": { "id": "uuid", "fullName": "Jane Doe" },
      "createdAt": "2026-03-15T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45 }
}
```
Note: `submitter` is omitted when `isAnonymous: true`.

---

### GET /cases/:caseId
Get full case detail including timeline.

**Access**: SECRETARIAT, CASE_MANAGER (own cases), ADMIN, STAFF (own non-anonymous)

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trackingId": "NEO-2026-001",
    "category": "SAFETY",
    "department": { "id": "uuid", "name": "Facilities" },
    "location": "Building A, Floor 2",
    "severity": "HIGH",
    "description": "...",
    "isAnonymous": false,
    "submitter": { "id": "uuid", "fullName": "Jane Doe" },
    "status": "IN_PROGRESS",
    "assignment": {
      "managerId": "uuid",
      "managerName": "John Smith",
      "assignedAt": "2026-03-15T11:00:00Z",
      "escalationDeadline": "2026-03-24T17:00:00Z"
    },
    "attachments": [
      { "id": "mongo-id", "originalName": "photo.jpg", "sizeBytes": 204800 }
    ],
    "timeline": [
      {
        "action": "status_changed",
        "fromStatus": "NEW",
        "toStatus": "ASSIGNED",
        "actorName": "Secretariat User",
        "note": null,
        "timestamp": "2026-03-15T11:00:00Z"
      }
    ],
    "createdAt": "2026-03-15T10:00:00Z"
  }
}
```

---

### PATCH /cases/:caseId/assign
Assign case to a Case Manager.

**Access**: SECRETARIAT only

**Request**:
```json
{ "managerId": "uuid" }
```

**Response 200**: Updated case summary.

**Errors**: `403 FORBIDDEN` | `404 CASE_NOT_FOUND` | `400 INVALID_TRANSITION` | `422 MANAGER_NOT_FOUND`

---

### PATCH /cases/:caseId/status
Update case status.

**Access**: CASE_MANAGER (must be assigned manager)

**Request**:
```json
{
  "status": "IN_PROGRESS | PENDING | RESOLVED",
  "note": "Optional note"
}
```

**Response 200**: Updated case summary.

**Errors**: `403 FORBIDDEN` | `400 INVALID_TRANSITION` | `422 CASE_ALREADY_RESOLVED`

---

### GET /cases/:caseId/attachments/:attachmentId
Download an attachment.

**Access**: SECRETARIAT, CASE_MANAGER (own cases), ADMIN

**Response 200**: File stream with correct `Content-Type`.

---

## Poll Routes

### POST /polls
Create a poll.

**Access**: SECRETARIAT only

**Request**:
```json
{
  "question": "Which area needs the most improvement?",
  "options": ["Safety Training", "Break Room", "Parking", "IT Equipment"]
}
```

**Response 201**:
```json
{
  "success": true,
  "data": { "id": "uuid", "question": "...", "isOpen": true, "createdAt": "..." }
}
```

**Errors**: `400 MIN_TWO_OPTIONS_REQUIRED`

---

### GET /polls
List all polls.

**Access**: All authenticated roles

**Response 200**: Array of polls with option counts.

---

### GET /polls/:pollId
Get poll detail with results (if user has voted, show chart data).

**Access**: All authenticated roles

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "question": "...",
    "isOpen": true,
    "hasVoted": false,
    "options": [
      { "id": "uuid", "text": "Safety Training", "voteCount": 12 }
    ],
    "totalVotes": 45
  }
}
```

---

### POST /polls/:pollId/vote
Cast a vote.

**Access**: STAFF, CASE_MANAGER, SECRETARIAT (any authenticated user)

**Request**:
```json
{ "optionId": "uuid" }
```

**Response 200**: Poll results (same shape as GET /polls/:pollId data).

**Errors**: `409 ALREADY_VOTED` | `400 POLL_CLOSED` | `422 INVALID_OPTION`

---

### PATCH /polls/:pollId/close
Close a poll.

**Access**: SECRETARIAT only

**Response 200**: Updated poll with `isOpen: false`.

---

## Public Hub Routes

### GET /public/digest
Quarterly digest of resolved cases.

**Access**: All authenticated roles

**Query params**: `quarter` (e.g. "Q1 2026"), `page`, `limit`

**Response 200**: Array of `{ quarter, category, outcomesSummary, count }`.

---

### GET /public/impact
Impact tracking table.

**Access**: All authenticated roles

**Query params**: `quarter`, `page`, `limit`

**Response 200**: Array of `{ id, issueRaised, actionTaken, outcomeChange, quarter, createdAt }`.

---

### GET /public/minutes
Meeting minutes archive.

**Access**: All authenticated roles

**Query params**: `search` (keyword in title), `quarter`, `page`, `limit`

**Response 200**: Array of `{ id, title, quarter, uploadedAt }`.

---

### POST /public/minutes
Upload meeting minutes document.

**Access**: SECRETARIAT only

**Request** (multipart/form-data): `title`, `quarter`, `file` (PDF only, max 25 MB)

**Response 201**: Created meeting minute record.

---

### GET /public/minutes/:minuteId/download
Download meeting minutes PDF.

**Access**: All authenticated roles

**Response 200**: PDF file stream.

---

### POST /public/impact
Create an impact record.

**Access**: SECRETARIAT only

**Request**:
```json
{
  "issueRaised": "Staff reported poor lighting in parking area",
  "actionTaken": "Maintenance team installed 8 new LED lights",
  "outcomeChange": "Lighting complaints reduced by 100%; parking area now fully lit",
  "quarter": "Q1 2026"
}
```

---

## Analytics Routes

### GET /analytics/dashboard
Full dashboard metrics.

**Access**: SECRETARIAT, ADMIN

**Response 200**:
```json
{
  "success": true,
  "data": {
    "casesByDepartment": [
      { "department": "HR", "departmentId": "uuid", "openCount": 12 }
    ],
    "casesByStatus": {
      "NEW": 5, "ASSIGNED": 8, "IN_PROGRESS": 14,
      "PENDING": 3, "RESOLVED": 42, "ESCALATED": 2
    },
    "casesByCategory": {
      "SAFETY": 10, "POLICY": 8, "FACILITIES": 15, "HR": 20, "OTHER": 5
    },
    "hotspots": [
      {
        "departmentId": "uuid",
        "department": "HR",
        "category": "POLICY",
        "openCount": 7,
        "flaggedAt": "2026-03-15T08:00:00Z"
      }
    ],
    "generatedAt": "2026-03-15T10:00:00Z"
  }
}
```

---

## Notification Routes

### GET /notifications
Get current user's notifications.

**Access**: All authenticated roles

**Query params**: `unreadOnly` (boolean), `page`, `limit`

**Response 200**: Array of notification objects.

---

### PATCH /notifications/:notificationId/read
Mark a notification as read.

**Access**: Notification recipient only

---

### PATCH /notifications/read-all
Mark all notifications as read.

**Access**: All authenticated roles

---

## Admin Routes

### GET /admin/users
List all users.

**Access**: ADMIN only

---

### POST /admin/users
Create a user account.

**Access**: ADMIN only

**Request**:
```json
{
  "fullName": "Jane Doe",
  "email": "jane@company.com",
  "password": "initialPassword",
  "role": "STAFF",
  "departmentId": "uuid"
}
```

---

### PATCH /admin/users/:userId
Update user role or department.

**Access**: ADMIN only

---

### PATCH /admin/users/:userId/deactivate
Deactivate a user account.

**Access**: ADMIN only

**Response 200**: Deactivated user. Open cases flagged for reassignment.

---

## WebSocket Events (Socket.io)

**Connection**: `ws://localhost:5000` with `Authorization: Bearer <token>` in handshake auth.

**Client joins room**: Automatic on connection — server places user in room `user:<userId>`.

### Events emitted TO client

| Event | Payload | Trigger |
|-------|---------|---------|
| `notification:new` | `{ id, type, message, caseId?, createdAt }` | New notification for this user |
| `case:status_updated` | `{ caseId, trackingId, newStatus, updatedAt }` | Case status changed |
| `case:assigned` | `{ caseId, trackingId, managerId }` | Case assigned (to secretariat room) |
| `hotspot:detected` | `{ departmentId, department, category, count }` | Hotspot threshold crossed (secretariat/admin room) |
| `poll:new` | `{ pollId, question }` | New poll created (broadcast to all) |
