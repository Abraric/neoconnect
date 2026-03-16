const PDFDocument = require('./neo-connect/backend/node_modules/pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'NeoConnect-Full-Report.pdf');
const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 60, left: 70, right: 70 }, autoFirstPage: true, bufferPages: true });
const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);

// ─── Colours & helpers ───────────────────────────────────────────────────────
const C = { primary: '#6366f1', dark: '#1e1b4b', heading: '#1e293b', sub: '#334155', body: '#475569', muted: '#94a3b8', white: '#ffffff', border: '#e2e8f0', accent: '#8b5cf6', green: '#10b981', red: '#ef4444', orange: '#f59e0b' };
const PW = 595 - 140; // usable page width

function hex(h) {
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  return [r / 255, g / 255, b / 255];
}

function newPage() { doc.addPage(); }

function coverRect(x, y, w, h, colour) {
  doc.save().rect(x, y, w, h).fill(colour).restore();
}

function sectionHeader(title, subtitle) {
  newPage();
  coverRect(0, 0, 595, 160, C.primary);
  // gradient strip
  coverRect(0, 155, 595, 8, C.accent);
  doc.fillColor(C.white).fontSize(28).font('Helvetica-Bold').text(title, 70, 55, { width: PW });
  if (subtitle) doc.fontSize(13).font('Helvetica').fillColor('#c7d2fe').text(subtitle, 70, 95, { width: PW });
  doc.moveDown(5);
  doc.fillColor(C.body);
}

function h1(text) {
  doc.moveDown(0.5);
  doc.fontSize(18).font('Helvetica-Bold').fillColor(C.heading).text(text, { underline: false });
  doc.moveDown(0.3);
  doc.moveTo(doc.x, doc.y).lineTo(doc.x + PW, doc.y).strokeColor(C.primary).lineWidth(2).stroke();
  doc.moveDown(0.4);
  doc.fillColor(C.body);
}

function h2(text) {
  doc.moveDown(0.4);
  doc.fontSize(14).font('Helvetica-Bold').fillColor(C.sub).text(text);
  doc.moveDown(0.2);
  doc.fillColor(C.body);
}

function h3(text) {
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(C.primary).text(text);
  doc.moveDown(0.15);
  doc.fillColor(C.body);
}

function body(text, opts = {}) {
  doc.fontSize(10).font('Helvetica').fillColor(C.body).text(text, { lineGap: 3, ...opts });
  doc.moveDown(0.2);
}

function bullet(items) {
  items.forEach(item => {
    doc.fontSize(10).font('Helvetica').fillColor(C.body)
      .text(`• ${item}`, { indent: 15, lineGap: 2 });
  });
  doc.moveDown(0.3);
}

function numberedList(items) {
  items.forEach((item, i) => {
    doc.fontSize(10).font('Helvetica').fillColor(C.body)
      .text(`${i + 1}.  ${item}`, { indent: 15, lineGap: 2 });
  });
  doc.moveDown(0.3);
}

function tableRow(cols, widths, isHeader = false) {
  const startX = doc.page.margins.left;
  const rowH = isHeader ? 22 : 18;
  const y = doc.y;

  if (isHeader) coverRect(startX, y, PW, rowH, C.primary);
  else if (doc._tableRowAlt) coverRect(startX, y, PW, rowH, '#f8fafc');
  doc._tableRowAlt = !doc._tableRowAlt;

  let x = startX + 6;
  cols.forEach((col, i) => {
    doc.fontSize(isHeader ? 9 : 9)
      .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(isHeader ? C.white : C.body)
      .text(String(col), x, y + (isHeader ? 6 : 5), { width: widths[i] - 8, lineBreak: false, ellipsis: true });
    x += widths[i];
  });

  doc.rect(startX, y, PW, rowH).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.y = y + rowH;
}

function tableHeaders(cols, widths) { doc._tableRowAlt = false; tableRow(cols, widths, true); }

function infoBox(label, text, colour = C.primary) {
  const y = doc.y;
  coverRect(doc.page.margins.left, y, 4, 38, colour);
  coverRect(doc.page.margins.left + 4, y, PW - 4, 38, '#f8fafc');
  doc.fontSize(9).font('Helvetica-Bold').fillColor(colour).text(label, doc.page.margins.left + 14, y + 6, { width: PW - 20 });
  doc.fontSize(9).font('Helvetica').fillColor(C.body).text(text, doc.page.margins.left + 14, y + 18, { width: PW - 20 });
  doc.y = y + 44;
  doc.moveDown(0.2);
}

function codeBlock(text) {
  const y = doc.y;
  const lines = text.split('\n').length;
  const h = lines * 13 + 14;
  coverRect(doc.page.margins.left, y, PW, h, '#1e293b');
  doc.fontSize(8).font('Courier').fillColor('#e2e8f0').text(text, doc.page.margins.left + 10, y + 8, { width: PW - 20, lineGap: 4 });
  doc.y = y + h + 6;
}

// ─── COVER PAGE ──────────────────────────────────────────────────────────────
coverRect(0, 0, 595, 842, C.dark);
coverRect(0, 0, 595, 6, C.primary);
coverRect(0, 836, 595, 6, C.accent);

// geometric shapes
doc.save().circle(480, 150, 100).fillOpacity(0.07).fill(C.primary).restore();
doc.save().circle(120, 680, 140).fillOpacity(0.05).fill(C.accent).restore();
doc.save().rect(0, 300, 595, 3).fillOpacity(0.1).fill(C.white).restore();

doc.fillColor(C.white).fontSize(11).font('Helvetica').text('NEOSTAT INTERNAL PLATFORM', 70, 120, { characterSpacing: 3 });
doc.fontSize(42).font('Helvetica-Bold').fillColor(C.white).text('NeoConnect', 70, 145);
doc.fontSize(18).font('Helvetica').fillColor('#a5b4fc').text('Staff Feedback & Complaint Management System', 70, 200);

doc.moveDown(2);
coverRect(70, 265, 60, 4, C.primary);

doc.fontSize(11).font('Helvetica').fillColor('#94a3b8').text('COMPLETE TECHNICAL DOCUMENTATION', 70, 285, { characterSpacing: 1.5 });
doc.fontSize(10).fillColor('#64748b').text('Comprehensive Project Report  ·  System Design  ·  API Docs  ·  User Manual', 70, 305);
doc.text('Security  ·  Testing  ·  Deployment  ·  SRS  ·  Feature Showcase', 70, 320);

// report list box
coverRect(70, 380, PW, 280, 'rgba(99,102,241,0.08)');
doc.rect(70, 380, PW, 280).strokeColor(C.primary).lineWidth(0.5).stroke();

const reports = [
  '01.  Project Report', '02.  System Design Document', '03.  Database Design Report',
  '04.  API Documentation', '05.  User Manual', '06.  Security Report',
  '07.  Testing Report', '08.  Deployment Report', '09.  SRS Document', '10.  Feature Showcase',
];
doc.fontSize(10).font('Helvetica-Bold').fillColor('#a5b4fc').text('CONTENTS', 90, 398, { characterSpacing: 2 });
reports.forEach((r, i) => {
  const col = i < 5 ? 90 : 90 + PW / 2;
  const row = 418 + (i % 5) * 22;
  doc.fontSize(9.5).font('Helvetica').fillColor('#e2e8f0').text(r, col, row);
});

doc.fontSize(9).font('Helvetica').fillColor('#475569').text('Syed Abrar C  ·  NeoConnect  ·  2025', 70, 790, { align: 'center', width: PW });

// ─── TOC PAGE ────────────────────────────────────────────────────────────────
newPage();
coverRect(0, 0, 595, 80, C.primary);
doc.fillColor(C.white).fontSize(22).font('Helvetica-Bold').text('Table of Contents', 70, 25);
doc.moveDown(3);

const tocItems = [
  ['1', 'Project Report', 'Overview, objectives, tech stack, outcomes'],
  ['2', 'System Design Document', 'Architecture, components, data flow'],
  ['3', 'Database Design Report', 'PostgreSQL schema, MongoDB collections, ER'],
  ['4', 'API Documentation', '50+ endpoints with methods, roles, descriptions'],
  ['5', 'User Manual', 'Step-by-step guide for all 4 user roles'],
  ['6', 'Security Report', 'JWT, RBAC, encryption, rate limiting, audit logs'],
  ['7', 'Testing Report', 'Unit, integration, E2E test strategy and coverage'],
  ['8', 'Deployment Report', 'Render, Vercel, Neon, Atlas, Upstash setup'],
  ['9', 'SRS Document', 'Functional & non-functional requirements, use cases'],
  ['10', 'Feature Showcase', 'All features listed by role with descriptions'],
];

tocItems.forEach(([num, title, desc]) => {
  const y = doc.y;
  coverRect(doc.page.margins.left, y, PW, 36, num % 2 === 0 ? '#f8fafc' : C.white);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(C.primary).text(`${num}.`, doc.page.margins.left + 8, y + 6);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(C.heading).text(title, doc.page.margins.left + 36, y + 6);
  doc.fontSize(9).font('Helvetica').fillColor(C.muted).text(desc, doc.page.margins.left + 36, y + 22, { width: PW - 50 });
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + PW, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.y = y + 38;
});

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 1 — PROJECT REPORT
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 1: Project Report', 'Overview · Objectives · Technology · Outcomes');

h1('1.1  Project Overview');
body('NeoConnect is a full-stack internal complaint and feedback management platform built for Neostat. It provides a structured, secure, and transparent process for staff to raise workplace concerns, track their resolution, participate in polls, and view the organisation\'s published impact outcomes.');
body('The system addresses a fundamental gap in most organisations — informal feedback channels that have no accountability, no tracking, and no visibility. NeoConnect replaces ad-hoc email chains and verbal complaints with a formal, auditable workflow.');

infoBox('Tracking ID Format', 'Every case is assigned a unique tracking ID in the format NEO-YYYY-NNN (e.g., NEO-2025-001), giving staff a reference number for all communications.', C.primary);

h1('1.2  Problem Statement');
body('Before NeoConnect, Neostat had no formal system for managing staff feedback and complaints. This led to:');
bullet([
  'Complaints going untracked and unresolved',
  'No accountability for response times or outcomes',
  'Staff having no visibility into the status of their complaints',
  'Management unable to identify recurring issues or department hotspots',
  'No audit trail for compliance and governance purposes',
  'Anonymous feedback not possible — discouraging honest reporting',
]);

h1('1.3  Objectives');
numberedList([
  'Provide a structured submission form for staff to report complaints and feedback',
  'Implement a full case lifecycle with status tracking (NEW → RESOLVED / ESCALATED)',
  'Enforce automatic escalation for cases unresolved beyond the SLA window',
  'Give case managers tools to investigate, note, and resolve cases efficiently',
  'Provide secretariat and admin with analytics, audit logs, and system controls',
  'Enable anonymous submissions to encourage honest reporting',
  'Build a public transparency hub showing real outcomes from staff feedback',
  'Deliver real-time notifications so users always know what is happening',
]);

h1('1.4  Technology Stack');
h2('Backend');
tableHeaders(['Technology', 'Version', 'Purpose'], [160, 80, PW - 240]);
[
  ['Node.js + Express', '18 / 4.18', 'HTTP server and REST API framework'],
  ['PostgreSQL (Neon)', '15', 'Relational data — users, cases, assignments, polls'],
  ['Prisma ORM', '5.10', 'Type-safe database access for PostgreSQL'],
  ['MongoDB (Atlas)', '7', 'Document data — logs, comments, snapshots'],
  ['Mongoose', '8.2', 'ODM for MongoDB schema definition and querying'],
  ['Redis (Upstash)', 'serverless', 'Caching layer and BullMQ job queue storage'],
  ['BullMQ', '5.4', 'Background job processing — escalation, analytics'],
  ['Socket.io', '4.7', 'Real-time bidirectional communication'],
  ['JWT + bcryptjs', '9.0 / 2.4', 'Stateless authentication and password hashing'],
  ['Multer', '1.4 lts', 'Multipart file upload handling (JPEG, PNG, PDF)'],
  ['Joi', '17.12', 'Request payload validation'],
  ['Helmet + CORS', '7.1 / 2.8', 'HTTP security headers and cross-origin policy'],
  ['Winston', '3.12', 'Structured application logging'],
  ['pdfkit', '0.18', 'Server-side PDF generation for exports'],
].forEach(r => tableRow(r, [160, 80, PW - 240]));

doc.moveDown(0.5);
h2('Frontend');
tableHeaders(['Technology', 'Version', 'Purpose'], [160, 80, PW - 240]);
[
  ['Next.js', '14.1', 'React framework with App Router'],
  ['React', '18.2', 'Component-based UI library'],
  ['TypeScript', '5.4', 'Static typing across all frontend code'],
  ['Tailwind CSS', '3.4', 'Utility-first styling framework'],
  ['shadcn/ui + Radix', 'latest', '22 accessible UI components'],
  ['Zustand', '4.5', 'Minimal global state management'],
  ['Axios', '1.6', 'HTTP client with request/response interceptors'],
  ['Socket.io-client', '4.7', 'Real-time client for live updates'],
  ['Recharts', '2.12', 'Composable chart library for analytics'],
  ['Lucide React', '0.344', 'Icon library (consistent, tree-shakable)'],
  ['jose', '5.2', 'JWT verification in Next.js edge middleware'],
].forEach(r => tableRow(r, [160, 80, PW - 240]));

h1('1.5  Infrastructure');
tableHeaders(['Service', 'Provider', 'Plan'], [130, 200, PW - 330]);
[
  ['Frontend Hosting', 'Vercel', 'Hobby (free)'],
  ['Backend API', 'Render', 'Free web service'],
  ['PostgreSQL', 'Neon', 'Free serverless Postgres'],
  ['MongoDB', 'MongoDB Atlas', 'M0 free cluster'],
  ['Redis', 'Upstash', 'Free serverless Redis'],
].forEach(r => tableRow(r, [130, 200, PW - 330]));

h1('1.6  Project Outcomes');
bullet([
  'Full case lifecycle implemented with 6 statuses and automated transitions',
  '15+ pages across 4 role-based views with real-time data',
  '50+ REST API endpoints across 11 route modules',
  '12 PostgreSQL tables and 12 MongoDB collections',
  'Real-time notifications delivered via Socket.io to all connected clients',
  'Automatic escalation enforced via BullMQ scheduled jobs',
  'Department heatmap and analytics dashboard for management visibility',
  'Complete audit trail — every case action is permanently logged',
  'Admin system health dashboard with live latency metrics and sparkline charts',
  'Public Hub with quarterly digest, impact records, and meeting minutes',
]);

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 2 — SYSTEM DESIGN
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 2: System Design Document', 'Architecture · Components · Data Flow');

h1('2.1  High-Level Architecture');
body('NeoConnect follows a three-tier architecture: a React/Next.js frontend, a Node.js/Express backend API, and a multi-database persistence layer. A separate real-time channel (Socket.io) operates alongside the REST API for push notifications.');

h2('Tier 1 — Presentation Layer (Vercel)');
bullet([
  'Next.js 14 App Router with both server and client components',
  'Edge middleware for JWT verification before page load',
  'Zustand store for auth state (persisted in memory, refreshed via API)',
  'Axios interceptor chain handles token refresh transparently',
  'Socket.io client subscribes to user-specific notification rooms',
]);

h2('Tier 2 — Application Layer (Render)');
bullet([
  'Express 4 REST API with 11 route modules',
  'Middleware pipeline: Helmet → CORS → Cookie-parser → Rate-limiter → Routes',
  'Per-route middleware: authenticate → requireRole → validate → controller',
  'Socket.io server with JWT auth middleware on connection',
  'BullMQ workers run as separate Node.js processes (not in the HTTP server)',
]);

h2('Tier 3 — Data Layer');
bullet([
  'PostgreSQL (Neon): All relational, transactional data via Prisma ORM',
  'MongoDB (Atlas): Write-heavy documents, logs, and time-series via Mongoose',
  'Redis (Upstash): BullMQ job queues, distributed locks',
]);

h1('2.2  Component Interaction Diagram');
codeBlock(
`Browser / Frontend (Vercel)
  │
  ├─── HTTPS REST ──────────▶  Express API (Render :5000)
  │                               │
  │                               ├── auth.routes      ──▶ AuthService ──▶ Prisma (PG)
  │                               ├── case.routes      ──▶ CaseService ──▶ Prisma + Mongoose
  │                               ├── admin.routes     ──▶ AdminController ──▶ Prisma + Mongoose
  │                               ├── analytics.routes ──▶ DashboardService ──▶ Mongoose snapshot
  │                               ├── poll.routes      ──▶ PollService ──▶ Prisma
  │                               └── public.routes    ──▶ PublicController ──▶ Prisma
  │
  ├─── WebSocket ───────────▶  Socket.io (same Render process)
  │                               └── notification.socket.js
  │                                   └── emits to user:{id} rooms
  │
  └─── Static files ────────▶  /uploads (Render disk)`
);

h1('2.3  Request Lifecycle');
numberedList([
  'Browser sends HTTPS request with Authorization: Bearer <accessToken>',
  'authenticate middleware verifies JWT signature and expiry',
  'requireRole middleware checks user.role against allowed roles array',
  'validate middleware runs Joi schema against req.body / req.query',
  'Controller function invokes service or repository layer',
  'Service applies business logic (permissions, state transitions, audit logging)',
  'Repository executes Prisma or Mongoose query',
  'sendSuccess() wraps result in standard { success, data } envelope',
  'If token expired: frontend Axios interceptor queues request, calls /auth/refresh, retries',
]);

h1('2.4  Background Job Architecture');
body('Three separate BullMQ workers run as independent Node.js processes:');
h3('Escalation Worker');
body('Polls the escalation queue every minute. When an escalation job fires (scheduled at assignment time), it checks whether the case status is still ASSIGNED/IN_PROGRESS. If yes, updates status to ESCALATED and sends notifications to both the manager and secretariat.');

h3('Analytics Worker');
body('Runs on a schedule to pre-compute department statistics and store them as MongoDB AnalyticsSnapshot documents with a 90-day TTL. This keeps the analytics dashboard fast even with thousands of cases.');

h3('Hotspot Worker');
body('Periodically checks for department + category combinations with 5 or more unresolved cases. Flags these as hotspots and can trigger alerts to secretariat. Prevents systemic issues from being missed.');

h1('2.5  Real-Time Notification Flow');
numberedList([
  'User connects to Socket.io with JWT token in auth handshake',
  'Server verifies token, adds socket to room: user:{userId}',
  'For management roles, socket also joins room: management',
  'When a case event occurs (assign, status update, escalation), notificationService creates a Notification record in PostgreSQL',
  'Socket server emits notification:new to the target user\'s room',
  'Frontend receives event, increments unread badge, shows toast',
]);

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 3 — DATABASE DESIGN
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 3: Database Design Report', 'PostgreSQL Schema · MongoDB Collections · Design Decisions');

h1('3.1  Why Two Databases?');
body('NeoConnect uses a dual-database strategy, each chosen to match specific data access patterns:');

tableHeaders(['Concern', 'PostgreSQL (Neon)', 'MongoDB (Atlas)'], [130, 200, PW - 330]);
[
  ['Data type', 'Structured, relational', 'Semi-structured, document'],
  ['Use cases', 'Users, cases, polls, notifications', 'Logs, comments, snapshots'],
  ['Write pattern', 'Moderate, transactional', 'High volume, append-only'],
  ['Query pattern', 'JOINs, aggregations', 'Single-document, time-series'],
  ['Consistency', 'ACID transactions', 'Eventual (acceptable for logs)'],
  ['Schema', 'Strict (Prisma enforced)', 'Flexible (Mongoose)', ],
].forEach(r => tableRow(r, [130, 200, PW - 330]));

h1('3.2  PostgreSQL Tables (Prisma)');

h2('Enumerations');
tableHeaders(['Enum', 'Values'], [140, PW - 140]);
[
  ['Role', 'STAFF, SECRETARIAT, CASE_MANAGER, ADMIN'],
  ['CaseCategory', 'SAFETY, POLICY, FACILITIES, HR, OTHER'],
  ['CaseSeverity', 'LOW, MEDIUM, HIGH'],
  ['CaseStatus', 'NEW, ASSIGNED, IN_PROGRESS, PENDING, RESOLVED, ESCALATED'],
  ['NotificationType', 'CASE_ASSIGNED, STATUS_UPDATED, ESCALATION_REMINDER, ESCALATION_ALERT, POLL_CREATED, INFO_REQUESTED, ANNOUNCEMENT'],
].forEach(r => tableRow(r, [140, PW - 140]));

doc.moveDown(0.3);
h2('Table: User');
tableHeaders(['Column', 'Type', 'Constraints'], [140, 100, PW - 240]);
[
  ['id', 'String (cuid)', 'Primary Key'],
  ['email', 'String', 'Unique, Not Null'],
  ['passwordHash', 'String', 'Not Null'],
  ['fullName', 'String', 'Not Null'],
  ['role', 'Role enum', 'Default: STAFF'],
  ['departmentId', 'String?', 'FK → Department.id'],
  ['isActive', 'Boolean', 'Default: true'],
  ['refreshToken', 'String?', 'Nullable — cleared on logout'],
  ['createdAt', 'DateTime', 'Default: now()'],
  ['updatedAt', 'DateTime', 'Auto-updated'],
].forEach(r => tableRow(r, [140, 100, PW - 240]));

h2('Table: Case');
tableHeaders(['Column', 'Type', 'Constraints'], [140, 100, PW - 240]);
[
  ['id', 'String (cuid)', 'Primary Key'],
  ['trackingId', 'String', 'Unique — format NEO-YYYY-NNN'],
  ['category', 'CaseCategory', 'Not Null'],
  ['departmentId', 'String', 'FK → Department.id'],
  ['location', 'String', 'Not Null'],
  ['severity', 'CaseSeverity', 'Default: MEDIUM'],
  ['description', 'String', 'Not Null'],
  ['isAnonymous', 'Boolean', 'Default: false'],
  ['submitterId', 'String', 'FK → User.id'],
  ['status', 'CaseStatus', 'Default: NEW'],
  ['isPriority', 'Boolean', 'Default: false'],
  ['escalatedAt', 'DateTime?', 'Set when escalated'],
  ['resolvedAt', 'DateTime?', 'Set when resolved'],
  ['createdAt', 'DateTime', 'Default: now()'],
].forEach(r => tableRow(r, [140, 100, PW - 240]));

h2('Other Tables');
tableHeaders(['Table', 'Key Fields', 'Purpose'], [120, 220, PW - 340]);
[
  ['Department', 'id, name (unique), isActive', 'Organisation units'],
  ['CaseAssignment', 'caseId, managerId, escalationDeadline, isActive', 'Links case to manager'],
  ['CaseStatusLog', 'caseId, fromStatus, toStatus, changedById, note', 'Immutable status history'],
  ['Poll', 'question, createdById, isOpen', 'Staff engagement polls'],
  ['PollOption', 'pollId, text, displayOrder', 'Answer choices'],
  ['Vote', 'pollId, optionId, userId — UNIQUE(pollId,userId)', 'One vote per user per poll'],
  ['Notification', 'recipientId, type, caseId, message, isRead', 'In-app notifications'],
  ['ImpactRecord', 'issueRaised, actionTaken, outcomeChange, quarter', 'Public hub impact table'],
  ['MeetingMinute', 'title, quarter, storagePath, uploadedById', 'Uploaded meeting docs'],
  ['OutboxEvent', 'eventType, caseId, payload (JSON), processedAt', 'Event sourcing outbox'],
].forEach(r => tableRow(r, [120, 220, PW - 340]));

h1('3.3  Case Status Lifecycle');
codeBlock(
`                    ┌─────────────────┐
       Staff         │      NEW        │   Case submitted
       submits ────▶ │  (unassigned)   │
                     └────────┬────────┘
                              │  Secretariat assigns
                              ▼
                     ┌─────────────────┐
                     │    ASSIGNED     │   Manager notified
                     └────────┬────────┘
                              │  Manager starts work
                              ▼
                     ┌─────────────────┐
                     │  IN_PROGRESS    │
                     └────────┬────────┘
                              │  Manager awaiting staff response
                              ▼
                     ┌─────────────────┐
                     │    PENDING      │   Info requested
                     └────────┬────────┘
                    ╱          ╲
          Resolved ╱            ╲ SLA exceeded / manual escalation
                  ▼              ▼
         ┌──────────────┐  ┌───────────────┐
         │   RESOLVED   │  │   ESCALATED   │
         └──────────────┘  └───────────────┘`
);

h1('3.4  MongoDB Collections (Mongoose)');
tableHeaders(['Collection', 'Key Fields', 'Notes'], [150, 210, PW - 360]);
[
  ['CaseComment', 'caseId, authorId, authorRole, content', 'Visible to all case participants'],
  ['CaseInternalNote', 'caseId, authorId, content', 'Hidden from STAFF role'],
  ['CaseLog', 'caseId, actorId, action, details, timestamp', 'INSERT ONLY — pre-save blocks updates'],
  ['CaseReminder', 'caseId, managerId, note, remindAt, isDone', 'Manager follow-up reminders'],
  ['CaseRating', 'caseId (unique), submitterId, rating (1-5)', 'One rating per case'],
  ['Attachment', 'caseId, originalName, mimeType, sizeBytes, storagePath', 'Max 10MB per file'],
  ['EscalationRule', 'category (unique), windowDays (1-365)', 'Configurable per case category'],
  ['SlaTarget', 'category (unique), targetDays, severityOverrides', 'Resolution time targets'],
  ['Announcement', 'title, content, status (SCHEDULED/SENT/CANCELLED)', 'Scheduled broadcasts'],
  ['AnalyticsSnapshot', 'snapshotType, generatedAt, data (mixed)', 'TTL 90 days — cached stats'],
  ['RoleChangeLog', 'targetUserId, oldRole, newRole, changedById', 'Admin audit history'],
  ['SystemLog', 'action, details, actor, timestamp', 'System-level events'],
].forEach(r => tableRow(r, [150, 210, PW - 360]));

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 4 — API DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 4: API Documentation', 'All Endpoints · Methods · Auth · Request/Response');

h1('4.1  Base URL & Standards');
infoBox('Base URL', 'https://neoconnect-api-ghz4.onrender.com/api', C.primary);
infoBox('Authentication', 'All protected endpoints require:  Authorization: Bearer <accessToken>', C.accent);

body('All responses follow a standard envelope:');
codeBlock('Success:  { "success": true, "data": { ... } }\nError:    { "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }');

h1('4.2  Authentication Endpoints');
tableHeaders(['Method', 'Endpoint', 'Auth', 'Description'], [55, 160, 50, PW - 265]);
[
  ['POST', '/auth/login', 'None', 'Login with email + password. Returns accessToken + sets refreshToken cookie'],
  ['POST', '/auth/verify-otp', 'None', 'Verify OTP code. Returns full auth tokens'],
  ['POST', '/auth/refresh', 'Cookie', 'Use refreshToken cookie to get new accessToken'],
  ['POST', '/auth/logout', 'Bearer', 'Clear refreshToken from DB and cookie'],
].forEach(r => tableRow(r, [55, 160, 50, PW - 265]));

h1('4.3  Case Endpoints');
tableHeaders(['Method', 'Endpoint', 'Role', 'Description'], [55, 200, 90, PW - 345]);
[
  ['POST', '/cases', 'All', 'Submit new case (multipart/form-data, max 5 files)'],
  ['GET', '/cases', 'All', 'List cases with filters: status, category, dept, severity, page, limit'],
  ['GET', '/cases/summary', 'All', 'Returns { byStatus: {}, total } for dashboard cards'],
  ['GET', '/cases/workload/summary', 'CASE_MANAGER', 'Returns open/closedThisMonth/escalated counts'],
  ['GET', '/cases/reminders/mine', 'CASE_MANAGER', 'List all reminders for logged-in manager'],
  ['PATCH', '/cases/reminders/:id/done', 'CASE_MANAGER', 'Mark reminder as completed'],
  ['GET', '/cases/:id', 'All', 'Full case detail including assignment and logs'],
  ['PATCH', '/cases/:id/status', 'CASE_MANAGER', 'Update status with optional note'],
  ['PATCH', '/cases/:id/assign', 'SECRETARIAT, ADMIN', 'Assign to a case manager'],
  ['POST', '/cases/bulk-assign', 'SECRETARIAT, ADMIN', 'Assign multiple cases at once'],
  ['PATCH', '/cases/:id/priority', 'SECRETARIAT, ADMIN', 'Toggle isPriority flag'],
  ['PATCH', '/cases/:id/withdraw', 'STAFF', 'Withdraw own case (only if NEW/ASSIGNED)'],
  ['GET', '/cases/:id/comments', 'All', 'List public comments on case'],
  ['POST', '/cases/:id/comments', 'All', 'Add a comment'],
  ['GET', '/cases/:id/rating', 'All', 'Get satisfaction rating'],
  ['POST', '/cases/:id/rating', 'STAFF', 'Submit 1-5 star rating after resolution'],
  ['GET', '/cases/:id/internal-notes', 'MGR+', 'Internal notes (hidden from STAFF)'],
  ['POST', '/cases/:id/internal-notes', 'MGR+', 'Add internal note'],
  ['POST', '/cases/:id/request-info', 'MGR+', 'Request more info — sends notification to submitter'],
  ['PATCH', '/cases/:id/reassign', 'MGR+', 'Reassign with reason (saved as internal note)'],
  ['POST', '/cases/:id/reminders', 'CASE_MANAGER', 'Set custom follow-up reminder'],
  ['GET', '/cases/:id/attachments/:attId', 'All', 'Download attachment file'],
].forEach(r => tableRow(r, [55, 200, 90, PW - 345]));

h1('4.4  Admin Endpoints (ADMIN only)');
tableHeaders(['Method', 'Endpoint', 'Description'], [55, 210, PW - 265]);
[
  ['GET', '/admin/users', 'List all users with role and department'],
  ['POST', '/admin/users', 'Create user — body: { fullName, email, password, role, departmentId }'],
  ['PATCH', '/admin/users/:id', 'Update role and/or department'],
  ['PATCH', '/admin/users/:id/deactivate', 'Soft-deactivate (isActive = false)'],
  ['PATCH', '/admin/users/:id/reactivate', 'Re-enable account'],
  ['PATCH', '/admin/users/:id/reset-password', 'Set new password — body: { newPassword }'],
  ['GET', '/admin/users/:id/role-history', 'View all role changes for this user'],
  ['GET', '/admin/departments', 'List all departments including inactive'],
  ['POST', '/admin/departments', 'Create department — body: { name }'],
  ['PATCH', '/admin/departments/:id', 'Rename department — body: { name }'],
  ['PATCH', '/admin/departments/:id/toggle', 'Toggle isActive status'],
  ['GET', '/admin/health', 'System health: PG, MongoDB, Redis, JWT, API latency'],
  ['GET', '/admin/escalation-rules', 'List all escalation window rules'],
  ['POST', '/admin/escalation-rules', 'Upsert rule — body: { category, windowDays }'],
  ['GET', '/admin/audit-log/export', 'Download audit log as CSV (query: from, to, action, userRole)'],
].forEach(r => tableRow(r, [55, 210, PW - 265]));

h1('4.5  Other Endpoints');
tableHeaders(['Method', 'Endpoint', 'Role', 'Description'], [55, 190, 100, PW - 345]);
[
  ['GET', '/polls', 'All', 'List all polls with vote counts'],
  ['POST', '/polls', 'SEC, ADMIN', 'Create poll — body: { question, options: [] }'],
  ['POST', '/polls/:id/vote', 'All', 'Cast vote — body: { optionId }'],
  ['PATCH', '/polls/:id/close', 'SEC, ADMIN', 'Close poll to further voting'],
  ['GET', '/analytics/dashboard', 'MGR+', 'Full analytics: trends, heatmap, categories'],
  ['GET', '/analytics/export', 'MGR+', 'Export case data to file'],
  ['GET', '/public/digest', 'All', 'Quarterly digest grouped by category'],
  ['GET', '/public/impact', 'All', 'Impact records list'],
  ['POST', '/public/impact', 'SEC, ADMIN', 'Add impact record'],
  ['GET', '/public/minutes', 'All', 'List meeting minutes'],
  ['POST', '/public/minutes', 'SEC, ADMIN', 'Upload meeting minutes (PDF)'],
  ['GET', '/notifications', 'All', 'User notifications (query: unreadOnly=true)'],
  ['PATCH', '/notifications/read-all', 'All', 'Mark all notifications as read'],
  ['GET', '/announcements', 'All', 'List announcements'],
  ['POST', '/announcements', 'SEC, ADMIN', 'Create announcement — can be scheduled'],
  ['GET', '/sla', 'All', 'List SLA targets per category'],
  ['PUT', '/sla', 'SEC, ADMIN', 'Upsert SLA target'],
  ['GET', '/audit-logs', 'ADMIN', 'Paginated audit log viewer'],
  ['GET', '/departments', 'All', 'List active departments (for dropdowns)'],
].forEach(r => tableRow(r, [55, 190, 100, PW - 345]));

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 5 — USER MANUAL
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 5: User Manual', 'Step-by-step guide for all 4 user roles');

h1('5.1  Getting Started');
body('NeoConnect is accessible via any modern web browser. No installation is required.');
numberedList([
  'Navigate to the NeoConnect frontend URL',
  'Enter your email address and password',
  'If 2FA is enabled, enter the OTP sent to your registered contact',
  'You will be redirected to the Dashboard automatically',
  'The sidebar on the left shows all features available for your role',
]);
infoBox('Note', 'If you forget your password, contact your IT Admin to reset it. Self-service password reset is available through the Admin panel.', C.orange);

h1('5.2  Staff — How to Use NeoConnect');
h2('Submitting a Case');
numberedList([
  'Click "Submit Case" in the sidebar or the green button on the Dashboard',
  'Select the Category: Safety, Policy, Facilities, HR, or Other',
  'Choose your Department from the dropdown',
  'Enter the Location where the issue occurred',
  'Set the Severity: Low, Medium, or High',
  'Write a detailed Description of the issue (be as specific as possible)',
  'Toggle Anonymous if you do not want your name visible to case managers',
  'Attach supporting files (JPEG, PNG, or PDF — max 5 files, 10MB each)',
  'Click Submit — you will receive a Tracking ID (e.g., NEO-2025-042)',
]);

h2('Tracking Your Cases');
bullet([
  'Go to "Cases" in the sidebar to see all cases you submitted',
  'Each case shows its current status as a colour-coded badge',
  'Click a case to open the detail view with the full timeline',
  'The Progress Stepper at the top shows where the case is in the lifecycle',
  'You can add comments to communicate with the case manager',
  'If a manager requests more information, you will receive a notification',
]);

h2('Withdrawing a Case');
bullet([
  'Open the case detail page',
  'Click "Withdraw Case" (only visible if status is NEW or ASSIGNED)',
  'Confirm the withdrawal — this action cannot be reversed',
]);

h2('Rating a Resolved Case');
bullet([
  'When a case is marked RESOLVED, you will receive a notification',
  'Open the case and scroll to the Rating section',
  'Select 1–5 stars and optionally leave written feedback',
  'Click Submit Rating',
]);

h1('5.3  Case Manager — How to Use NeoConnect');
h2('Viewing Assigned Cases');
bullet([
  'Go to "Cases" to see all cases currently assigned to you',
  'Use the status filter to focus on specific stages',
  'Cases flagged as Priority show an orange star badge',
]);

h2('Working on a Case');
numberedList([
  'Click the case to open the detail view',
  'Read the description, attachments, and any previous comments',
  'Update the Status using the dropdown (IN_PROGRESS → PENDING → RESOLVED)',
  'Add a note when updating status to explain the action taken',
  'Use Internal Notes to record investigation findings (staff cannot see these)',
  'Use "Request More Info" to ask the submitter for additional details',
]);

h2('Managing Your Workload');
bullet([
  'Go to "My Workload" to see a summary of your open/closed/escalated counts',
  'The Active Cases section lists all cases requiring action',
  'The Reminders section shows all follow-up tasks you have set',
  'Click "Mark Done" to complete a reminder',
]);

h2('Setting a Reminder');
bullet([
  'Open any assigned case',
  'Click "Set Reminder" and choose a date and note',
  'The reminder will appear in your Workload page on the chosen date',
]);

h1('5.4  Secretariat — How to Use NeoConnect');
h2('Managing the Case Inbox');
bullet([
  'Go to "Cases" to see all submitted cases across the organisation',
  'Filter by Status, Category, Department, or Severity',
  'Click "Assign" on any NEW case to assign it to a Case Manager',
  'Use "Bulk Assign" to assign multiple cases at once — select cases and choose manager',
  'Toggle the Priority star to mark urgent cases',
]);

h2('Analytics');
bullet([
  'Go to "Analytics" for the full dashboard',
  'Department Heatmap shows which departments have the most open cases',
  'Hotspot alerts appear when 5+ cases share the same department and category',
  'Category and Status breakdown charts show overall trends',
  'Export the data using the Export button',
]);

h2('Announcements');
numberedList([
  'Go to "Announcements" and click "New Announcement"',
  'Write the title and content',
  'Either send immediately or schedule for a future date/time',
  'Sent announcements are visible to all staff in their Announcements feed',
]);

h2('SLA Settings');
bullet([
  'Go to "SLA Settings" to configure resolution time targets per category',
  'Set different targets for High, Medium, and Low severity',
  'Cases exceeding the escalation window will be automatically escalated',
]);

h1('5.5  Admin — How to Use NeoConnect');
h2('User Management');
numberedList([
  'Go to Admin → Users tab',
  'Click "Add User" to create a new account (fill name, email, password, role, department)',
  'Click the edit icon on any user to change their role or department',
  'Click "Deactivate" to disable an account (user cannot log in)',
  'Click "Reactivate" to re-enable a deactivated account',
  'Click "Reset Password" to set a new password for a user',
  'Click "Role History" to see all past role changes for a user',
]);

h2('System Health Dashboard');
bullet([
  'Go to "System Health" in the sidebar',
  'The page auto-refreshes every 5 seconds showing live metrics',
  'Each service card shows: status dot, current latency, sparkline chart, min/avg/max',
  'The Node.js Memory card shows heap usage progress bars',
  'Click "Pause" to stop auto-refresh; click "Refresh" to manually update',
  'A red banner appears if any service is degraded or offline',
]);

h2('Escalation Rules');
bullet([
  'Go to Admin → Escalation Rules tab',
  'Set the escalation window (days) for each case category',
  'The __DEFAULT__ rule applies to categories without a specific rule',
  'Changes take effect immediately for new case assignments',
]);

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 6 — SECURITY REPORT
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 6: Security Report', 'Authentication · RBAC · Encryption · Audit · Rate Limiting');

h1('6.1  Authentication Architecture');
body('NeoConnect uses a stateless JWT-based authentication system with short-lived access tokens and long-lived refresh tokens stored in HTTP-only cookies.');

h2('Access Tokens');
bullet([
  'Algorithm: HS256 (HMAC-SHA256) with a 32+ character secret',
  'Expiry: 15 minutes — short window limits damage if intercepted',
  'Payload: { sub: userId, role, departmentId, iat, exp }',
  'Transmitted as: Authorization: Bearer <token> header',
  'Never stored in localStorage — kept in memory only (Zustand store)',
]);

h2('Refresh Tokens');
bullet([
  'Expiry: 7 days — allows seamless session without frequent re-login',
  'Storage: HTTP-only cookie (inaccessible to JavaScript — XSS protection)',
  'Database: Hashed and stored in User.refreshToken column (Prisma)',
  'Rotation: New refresh token issued on each /auth/refresh call',
  'Revocation: Cleared from DB on logout — invalidates existing tokens immediately',
]);

h2('Token Refresh Flow');
codeBlock(
`1. Axios makes API request with expired access token
2. Server returns 401 Unauthorized
3. Axios interceptor catches 401, pauses request queue
4. Interceptor calls POST /auth/refresh with refresh cookie
5. Server validates refresh token from DB, issues new access token
6. All queued requests are retried with new token
7. If refresh also fails → user is logged out and redirected to /login`
);

h1('6.2  Role-Based Access Control (RBAC)');
body('Every protected route has two layers of access control: the authenticate middleware verifies who the user is, and the requireRole middleware verifies what they can do.');

codeBlock(
`// Route definition example:
router.patch('/:caseId/assign',
  authenticate,                              // Layer 1: verify JWT
  requireRole(ROLES.SECRETARIAT, ROLES.ADMIN), // Layer 2: check role
  validate(assignCaseSchema),                // Layer 3: validate payload
  caseController.assign                      // Layer 4: execute
);`
);

h2('Role Permissions Summary');
tableHeaders(['Action', 'STAFF', 'CASE_MGR', 'SECRETARIAT', 'ADMIN'], [160, 55, 60, 80, 50]);
[
  ['Submit cases', '✓', '—', '—', '—'],
  ['View own cases', '✓', '—', '—', '—'],
  ['View all cases', '—', 'Assigned', '✓', '✓'],
  ['Assign cases', '—', '—', '✓', '✓'],
  ['Update case status', '—', '✓', '—', '—'],
  ['Internal notes', '—', '✓', '✓', '✓'],
  ['Analytics', '—', '✓', '✓', '✓'],
  ['Create polls', '—', '—', '✓', '✓'],
  ['Manage users', '—', '—', '—', '✓'],
  ['System health', '—', '—', '—', '✓'],
  ['Audit log', '—', '—', '—', '✓'],
  ['Export audit CSV', '—', '—', '—', '✓'],
].forEach(r => tableRow(r, [160, 55, 60, 80, 50]));

h1('6.3  Password Security');
bullet([
  'Passwords hashed using bcryptjs with cost factor 12 (2^12 = 4096 iterations)',
  'Hash length: 60 characters — rainbow table attacks are computationally infeasible',
  'Passwords never stored in plaintext — only the bcrypt hash is persisted',
  'Password reset requires admin intervention — no email-based self-service (prevents account takeover via email phishing)',
  'Minimum password length: 8 characters enforced at API level via Joi validation',
]);

h1('6.4  HTTP Security (Helmet)');
bullet([
  'Content-Security-Policy: restricts script/style sources',
  'X-Frame-Options: DENY — prevents clickjacking',
  'X-Content-Type-Options: nosniff — prevents MIME sniffing',
  'Strict-Transport-Security: enforces HTTPS',
  'X-XSS-Protection: 1; mode=block',
  'Referrer-Policy: no-referrer',
]);

h1('6.5  Rate Limiting');
bullet([
  'Global rate limiter: 100 requests per IP per 15-minute window',
  'Auth endpoints (login): stricter limits to prevent brute force',
  'Uses express-rate-limit with in-memory store (can be upgraded to Redis store)',
  'Returns 429 Too Many Requests when limit is exceeded',
]);

h1('6.6  File Upload Security');
bullet([
  'MIME type whitelist: only image/jpeg, image/png, application/pdf accepted',
  'File size limit: 10MB per file, maximum 5 files per submission',
  'Files stored with randomised names (UUID) — original filenames not used in paths',
  'Download endpoints verify case ownership/role before serving files',
]);

h1('6.7  Audit Logging');
body('Every significant action is logged to two places:');
h3('MongoDB AuditLog (via auditLogger.js)');
bullet([
  'Records: userId, userEmail, userRole, action, resource, status, ipAddress, details, createdAt',
  'Exportable as CSV by Admin via GET /admin/audit-log/export',
  'Filterable by date range, action type, and user role',
]);
h3('MongoDB CaseLog (insert-only)');
bullet([
  'Pre-save Mongoose middleware throws an error on any update operation',
  'Guarantees that case history cannot be tampered with after the fact',
  'Every status change, assignment, comment, and escalation is recorded permanently',
]);

h1('6.8  CORS Policy');
body('The API only accepts requests from the configured FRONTEND_URL environment variable. All other origins are blocked by the CORS middleware. Credentials (cookies) are allowed only from that origin.');

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 7 — TESTING REPORT
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 7: Testing Report', 'Unit · Integration · End-to-End · Coverage');

h1('7.1  Testing Strategy');
body('NeoConnect uses a three-layer testing approach: unit tests for individual functions and services, integration tests for API endpoints using Supertest, and end-to-end tests using Playwright for critical user journeys.');

tableHeaders(['Layer', 'Tool', 'Scope', 'Location'], [80, 100, 180, PW - 360]);
[
  ['Unit', 'Jest', 'Services, utilities, validators', 'backend/src/__tests__/'],
  ['Integration', 'Jest + Supertest', 'API endpoints, DB interactions', 'backend/src/__tests__/'],
  ['Component', 'Jest + React Testing Library', 'React components', 'frontend/src/__tests__/'],
  ['E2E', 'Playwright', 'Full user journeys', 'frontend/tests/e2e/'],
].forEach(r => tableRow(r, [80, 100, 180, PW - 360]));

h1('7.2  Backend Unit Tests');
h2('Authentication Service');
bullet([
  'Test: Valid email/password returns access token and refresh token',
  'Test: Invalid password returns 401 with AUTH_FAILED error code',
  'Test: Inactive user account returns 403 ACCOUNT_INACTIVE',
  'Test: Expired refresh token returns 401 and clears cookie',
  'Test: Successful refresh returns new access token',
]);

h2('Case Service');
bullet([
  'Test: createCase generates correct NEO-YYYY-NNN tracking ID format',
  'Test: Anonymous case does not expose submitterId to case managers',
  'Test: Status transition NEW→ASSIGNED creates CaseAssignment record',
  'Test: RESOLVED case cannot be transitioned back to IN_PROGRESS',
  'Test: Escalation job is scheduled on assignment with correct deadline',
  'Test: Withdrawal only allowed for STAFF role on own cases',
]);

h2('Validation (Joi Schemas)');
bullet([
  'Test: Case submission with missing required fields returns 400',
  'Test: Invalid category enum value rejected',
  'Test: Severity defaulting when not provided',
  'Test: Password minimum 8 characters enforced',
]);

h1('7.3  Integration Tests (Supertest)');
h2('Auth Endpoints');
bullet([
  'POST /auth/login: 200 with valid credentials, 401 with wrong password',
  'POST /auth/refresh: 200 with valid cookie, 401 with missing/invalid cookie',
  'POST /auth/logout: Clears refresh token from DB and cookie',
]);

h2('Case Endpoints');
bullet([
  'POST /cases: STAFF creates case — 201 with trackingId',
  'POST /cases: CASE_MANAGER cannot submit cases — 403',
  'GET /cases: STAFF only sees own cases; SECRETARIAT sees all',
  'PATCH /cases/:id/assign: Only SECRETARIAT/ADMIN can assign — 403 for others',
  'PATCH /cases/:id/status: Only assigned CASE_MANAGER can update — 403 for others',
  'POST /cases/:id/internal-notes: STAFF gets 403; CASE_MANAGER succeeds',
]);

h2('Admin Endpoints');
bullet([
  'GET /admin/users: ADMIN gets full list; STAFF gets 403',
  'POST /admin/users: Creates user with hashed password (verified via login)',
  'PATCH /admin/users/:id/deactivate: User cannot log in after deactivation',
  'GET /admin/health: Returns status of all 5 services',
]);

h1('7.4  Frontend Component Tests');
bullet([
  'CaseCard: Renders trackingId, status badge, and category correctly',
  'CaseProgressStepper: Highlights correct step for each status',
  'PollCard: Shows vote percentages after voting; disables after user votes',
  'Navbar: Shows unread notification count badge when count > 0',
  'Sidebar: Shows only permitted nav items for each role',
  'Dashboard: Renders skeleton while loading; shows stat values after load',
]);

h1('7.5  E2E Tests (Playwright)');
h2('Critical User Journeys');
numberedList([
  'Staff Login → Submit Case → Verify Tracking ID received',
  'Secretariat Login → View Case Inbox → Assign Case → Verify Manager notified',
  'Case Manager Login → Open Assigned Case → Update Status → Verify Staff notified',
  'Admin Login → Create User → Verify user can log in with new credentials',
  'Staff → Vote on Poll → Verify cannot vote twice',
  'Secretariat → Create Announcement → Verify visible in Staff Announcements feed',
]);

h1('7.6  Running Tests');
codeBlock(
`# Backend tests
cd neo-connect/backend
npm test                    # Run all Jest tests
npm run test:coverage       # Run with coverage report

# Frontend tests
cd neo-connect/frontend
npm test                    # Run Jest component tests
npm run test:e2e            # Run Playwright E2E tests

# View coverage
open coverage/lcov-report/index.html`
);

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 8 — DEPLOYMENT REPORT
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 8: Deployment Report', 'Render · Vercel · Neon · Atlas · Upstash');

h1('8.1  Deployment Overview');
tableHeaders(['Service', 'Provider', 'URL', 'Plan'], [80, 90, 190, PW - 360]);
[
  ['Frontend', 'Vercel', 'Vercel-assigned .vercel.app URL', 'Hobby (free)'],
  ['Backend API', 'Render', 'neoconnect-api-ghz4.onrender.com', 'Free web service'],
  ['PostgreSQL', 'Neon', 'Neon serverless endpoint', 'Free tier'],
  ['MongoDB', 'Atlas', 'Atlas connection string', 'M0 free cluster'],
  ['Redis', 'Upstash', 'Upstash TLS endpoint', 'Free serverless'],
].forEach(r => tableRow(r, [80, 90, 190, PW - 360]));

h1('8.2  Backend Deployment (Render)');
h2('Configuration');
tableHeaders(['Setting', 'Value'], [160, PW - 160]);
[
  ['Repository', 'github.com/Abraric/neoconnect'],
  ['Branch', 'main'],
  ['Root Directory', 'neo-connect/backend'],
  ['Build Command', 'npm install && npx prisma generate'],
  ['Start Command', 'node src/server.js'],
  ['Node Version', '18+'],
  ['Health Check Path', '/health'],
].forEach(r => tableRow(r, [160, PW - 160]));

h2('Required Environment Variables');
codeBlock(
`PORT=5000
NODE_ENV=production
POSTGRES_URL=postgresql://...  (Neon connection string)
MONGODB_URI=mongodb+srv://...  (Atlas connection string)
REDIS_URL=rediss://...         (Upstash TLS URL)
JWT_SECRET=<min 32 char secret>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
FRONTEND_URL=https://your-app.vercel.app`
);

h2('Important Notes');
bullet([
  'Render free tier spins down after 15 minutes of inactivity — first request after sleep takes 30–50 seconds',
  'File uploads (Multer) are stored on Render\'s ephemeral disk — files are lost on redeploy',
  'For production, migrate file storage to S3/Cloudflare R2',
  'The Prisma client must be generated during build (npx prisma generate)',
  'Run database migrations separately: npx prisma migrate deploy',
]);

h1('8.3  Frontend Deployment (Vercel)');
h2('Configuration');
tableHeaders(['Setting', 'Value'], [160, PW - 160]);
[
  ['Repository', 'github.com/Abraric/neoconnect'],
  ['Branch', 'main'],
  ['Root Directory', 'neo-connect/frontend'],
  ['Framework', 'Next.js (auto-detected)'],
  ['Build Command', 'next build'],
  ['Output', '.next'],
].forEach(r => tableRow(r, [160, PW - 160]));

h2('Required Environment Variables');
codeBlock(
`NEXT_PUBLIC_API_URL=https://neoconnect-api-ghz4.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://neoconnect-api-ghz4.onrender.com`
);

h2('Build Optimisations');
bullet([
  'next.config.js sets eslint.ignoreDuringBuilds: true to prevent ESLint failures blocking deploy',
  'typescript.ignoreBuildErrors: true allows deployment despite non-critical TS warnings',
  'Recharts loaded via next/dynamic with ssr: false to prevent SSR hydration errors',
  'All time-based rendering (greetings, clocks) moved to useEffect to prevent hydration mismatch',
]);

h1('8.4  Database Setup');
h2('PostgreSQL (Neon)');
numberedList([
  'Create account at neon.tech',
  'Create a new project and copy the connection string',
  'Add to Render environment as POSTGRES_URL',
  'Run: npx prisma migrate deploy (or db push for initial setup)',
  'Run seed scripts: npm run db:seed && npm run db:seed:data',
]);

h2('MongoDB (Atlas)');
numberedList([
  'Create account at mongodb.com/atlas',
  'Deploy an M0 free cluster',
  'Create database user with readWrite permissions',
  'Whitelist 0.0.0.0/0 in Network Access (or Render\'s IP range)',
  'Copy connection string and add as MONGODB_URI',
  'Mongoose creates collections automatically on first write',
]);

h2('Redis (Upstash)');
numberedList([
  'Create account at upstash.com',
  'Create a Redis database (select TLS enabled)',
  'Copy the rediss:// connection string',
  'Add as REDIS_URL to Render environment',
  'BullMQ and ioredis connect automatically using this URL',
]);

h1('8.5  CI/CD Pipeline');
body('Auto-deployment is configured via GitHub webhooks:');
bullet([
  'Every push to main branch triggers a Render backend redeploy',
  'Every push to main branch triggers a Vercel frontend redeploy',
  'Build logs are visible in both dashboards',
  'Render deploy timeout: ~10 minutes (free tier)',
  'Failed deploys do not affect the live service — previous version stays up',
]);

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 9 — SRS DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 9: Software Requirements Specification', 'Functional · Non-Functional · Use Cases · Constraints');

h1('9.1  Introduction');
h2('Purpose');
body('This document specifies the software requirements for NeoConnect, the staff feedback and complaint management platform for Neostat. It is intended to serve as a reference for design, development, testing, and evaluation of the system.');

h2('Scope');
body('NeoConnect encompasses: a web-based case submission and tracking system, a case management workflow for designated managers, a secretariat/management oversight dashboard, an administrative control panel, a polling system, a public transparency hub, and a real-time notification system.');

h2('Definitions');
tableHeaders(['Term', 'Definition'], [120, PW - 120]);
[
  ['Case', 'A complaint, concern, or feedback submission by a staff member'],
  ['Tracking ID', 'Unique reference number assigned to each case (NEO-YYYY-NNN)'],
  ['Escalation', 'Automatic promotion to ESCALATED status when SLA window is exceeded'],
  ['SLA', 'Service Level Agreement — the target time to resolve a case'],
  ['Internal Note', 'A note visible only to managers, not to the submitting staff member'],
  ['Hotspot', 'A department + category combination with 5 or more unresolved cases'],
  ['Digest', 'Quarterly summary of cases grouped by category with resolution statistics'],
].forEach(r => tableRow(r, [120, PW - 120]));

h1('9.2  Functional Requirements');
h2('FR-01: User Authentication');
bullet([
  'The system shall authenticate users with email and password',
  'The system shall issue a short-lived JWT access token (15 min) on successful login',
  'The system shall use HTTP-only cookies for refresh token storage',
  'The system shall support OTP-based second factor verification',
  'The system shall invalidate sessions on logout',
]);

h2('FR-02: Case Submission');
bullet([
  'Staff shall be able to submit a case with: category, department, location, severity, description',
  'Staff shall be able to toggle anonymous submission',
  'Staff shall be able to attach up to 5 files (JPEG, PNG, PDF) per submission',
  'The system shall assign a unique tracking ID to each case on creation',
  'The system shall notify secretariat of new case submissions in real time',
]);

h2('FR-03: Case Lifecycle');
bullet([
  'A case shall progress through: NEW → ASSIGNED → IN_PROGRESS → PENDING → RESOLVED',
  'A case may be moved to ESCALATED from ASSIGNED or IN_PROGRESS if SLA is exceeded',
  'Only Secretariat/Admin may assign cases; only Case Manager may update status',
  'Every status change shall be logged with actor, timestamp, and note',
  'Staff may withdraw their case only while it is in NEW or ASSIGNED status',
]);

h2('FR-04: Case Management');
bullet([
  'Case managers shall be able to add internal notes not visible to staff',
  'Case managers shall be able to request additional information from the submitter',
  'Case managers shall be able to reassign a case with a stated reason',
  'Case managers shall be able to set follow-up reminders with a date and note',
  'Case managers shall have a workload summary showing open, closed, and escalated counts',
]);

h2('FR-05: Automatic Escalation');
bullet([
  'The system shall schedule an escalation job at the time of case assignment',
  'The escalation window shall be configurable per case category',
  'If a case is not updated within the window, its status shall change to ESCALATED',
  'Notifications shall be sent to the assigned manager and secretariat on escalation',
]);

h2('FR-06: Analytics');
bullet([
  'Secretariat and Admin shall view a department heatmap of active cases',
  'The system shall flag hotspots (5+ cases in same dept + category)',
  'Category and status breakdown charts shall be available',
  'Case trend data shall be shown over time',
  'Case data shall be exportable to a downloadable file',
]);

h2('FR-07: Polls');
bullet([
  'Secretariat/Admin shall create polls with multiple options',
  'Each user shall be limited to one vote per poll',
  'Vote results shall be shown as a percentage bar chart',
  'Secretariat/Admin shall be able to close polls to prevent further voting',
]);

h2('FR-08: Public Hub');
bullet([
  'All users shall view impact records showing issue→action→outcome triples',
  'Impact records shall be grouped and filterable by quarter',
  'Secretariat/Admin shall create and edit impact records',
  'Meeting minutes (PDF) shall be uploadable and downloadable by quarter',
  'A quarterly digest shall show case counts and resolution rates by category',
]);

h2('FR-09: Admin Controls');
bullet([
  'Admin shall create, update, deactivate, and reactivate user accounts',
  'Admin shall reset any user\'s password',
  'Admin shall manage departments (create, rename, toggle active)',
  'Admin shall view and export the full audit log',
  'Admin shall view role change history per user',
  'Admin shall configure escalation rules per case category',
  'Admin shall view real-time system health of all infrastructure services',
]);

h1('9.3  Non-Functional Requirements');
h2('Performance');
bullet([
  'NFR-P1: API responses shall complete within 500ms for 95% of requests under normal load',
  'NFR-P2: The system shall support at least 100 concurrent authenticated users',
  'NFR-P3: Dashboard analytics shall load within 2 seconds (cached snapshots used)',
  'NFR-P4: Real-time notifications shall be delivered within 1 second of the triggering event',
]);

h2('Security');
bullet([
  'NFR-S1: All API endpoints shall enforce JWT authentication and RBAC',
  'NFR-S2: Passwords shall be hashed using bcrypt with minimum cost factor 12',
  'NFR-S3: Refresh tokens shall be stored in HTTP-only cookies',
  'NFR-S4: All HTTP responses shall include Helmet-provided security headers',
  'NFR-S5: File uploads shall be restricted to approved MIME types and sizes',
  'NFR-S6: All admin actions shall be recorded in the audit log',
]);

h2('Reliability');
bullet([
  'NFR-R1: The system shall degrade gracefully — if MongoDB is unavailable, PostgreSQL functions continue',
  'NFR-R2: Failed background jobs shall be retried by BullMQ with exponential backoff',
  'NFR-R3: The audit log shall be immutable — case logs cannot be updated or deleted',
]);

h2('Usability');
bullet([
  'NFR-U1: The interface shall be fully usable on desktop browsers (Chrome, Firefox, Safari)',
  'NFR-U2: Dark mode shall be available as a user-selectable theme',
  'NFR-U3: All forms shall provide inline validation feedback',
  'NFR-U4: Loading states shall use skeleton placeholders, not blank screens',
]);

h1('9.4  Constraints');
bullet([
  'The system is deployed on free-tier cloud services — cold start latency is acceptable',
  'File uploads are stored on Render ephemeral disk — not persistent across deploys',
  'All users must have a Neostat-issued account — self-registration is not supported',
  'The system is designed for internal use only — not exposed to the public internet without auth',
  'MongoDB Atlas M0 has a 512MB storage limit',
]);

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 10 — FEATURE SHOWCASE
// ═══════════════════════════════════════════════════════════════════════════
sectionHeader('Report 10: Feature Showcase', 'Complete feature list by module and role');

h1('10.1  Authentication & Onboarding');
bullet([
  'Split-panel login page: brand panel (left) + form panel (right)',
  'Demo credential quick-fill buttons — click any role row to auto-fill',
  'JWT access token (15 min) + refresh token in HTTP-only cookie',
  'OTP second-factor verification step',
  'Token refresh handled transparently by Axios interceptor',
  'Edge middleware (Next.js) validates JWT before any page renders',
  'Auto-redirect: authenticated users sent to /dashboard; unauthenticated to /login',
]);

h1('10.2  Dashboard');
bullet([
  'Time-aware greeting (Good morning/afternoon/evening) — client-side only to avoid hydration issues',
  'Role-specific stat cards: Staff sees own case counts; Manager sees assigned workload; Admin sees global stats',
  'Gradient stat cards with colour-coded status icons',
  'Quick Action cards grid linking to key workflows for the current role',
  'Animated hover effects and arrow transitions on action cards',
]);

h1('10.3  Case Submission (Staff)');
bullet([
  'Multi-field form: category, department, location, severity, description',
  'Anonymous toggle with privacy notice',
  'Multi-file upload (JPEG, PNG, PDF — max 5 files, 10MB each)',
  'Tracking ID generated on submission: NEO-YYYY-NNN format',
  'Real-time notification sent to secretariat room on submission',
]);

h1('10.4  Case Management');
bullet([
  'Case list with filters: status, category, department, severity',
  'Priority flag (orange star) on high-urgency cases',
  'Case detail view with full timeline of all events',
  'Visual progress stepper showing current lifecycle stage',
  'Status update with inline note input',
  'File attachment download from case detail',
  'Public comments (visible to all parties)',
  'Internal notes (hidden from staff — manager/secretariat/admin only)',
  'Request More Info — sends notification to submitter',
  'Reassign case to another manager with reason',
  'Withdraw case (Staff — only in NEW/ASSIGNED)',
  'Post-resolution satisfaction rating (1–5 stars + text)',
]);

h1('10.5  Case Manager Workload');
bullet([
  'Personal workload page: open / closed this month / escalated this month',
  'Active cases list with status and age',
  'Reminders panel: all scheduled follow-ups with date and note',
  'Mark Done button to complete a reminder',
  'Set Reminder from case detail — pick date and write note',
]);

h1('10.6  Analytics (Secretariat / Manager / Admin)');
bullet([
  'Department Heatmap: grid of departments vs. case counts with colour intensity',
  'Hotspot alerts: departments with 5+ cases in same category flagged in red',
  'Case Status Donut chart: visual breakdown of all case statuses',
  'Category Bar Chart: submissions per category',
  'Trend Line Chart: case volume over time',
  'Department Performance Table: open, resolved, escalated per department',
  'Export to file: download case data for offline analysis',
]);

h1('10.7  Polls');
bullet([
  'Create poll with question and multiple answer options',
  'One vote per user per poll — enforced at DB level (unique constraint)',
  'Real-time vote count update after voting',
  'Percentage bar chart showing vote distribution',
  'Close poll to prevent further voting',
  'Closed polls show final results to all users',
]);

h1('10.8  Public Hub');
bullet([
  'Impact Records Table: issue raised → action taken → outcome change, per quarter',
  'Add/edit impact records (Secretariat/Admin)',
  'Meeting Minutes: upload, list, and download PDFs per quarter',
  'Quarterly Digest: aggregated case statistics by category and quarter',
  'Digest shows total, resolved, escalated, and open counts per quarter+category',
]);

h1('10.9  Announcements');
bullet([
  'Create announcement with title and content',
  'Schedule for future delivery or send immediately',
  'Cancel scheduled announcements before they send',
  'Sent announcements appear in all users\' Announcements feed',
  'Badge count in sidebar shows unread announcements',
]);

h1('10.10  Notifications');
bullet([
  'In-app notification bell with unread count badge (capped at 9+)',
  'Real-time delivery via Socket.io — no page refresh required',
  'Notification types: case assigned, status update, escalation, info requested, announcement, poll created',
  'Mark individual notification as read',
  'Mark all as read',
  'Dedicated /notifications page with full history',
]);

h1('10.11  Admin Panel');
bullet([
  'Tabbed interface: Users / Departments / Escalation Rules / Audit Log Export',
  'Create user with role and department',
  'Edit user role or department',
  'Deactivate / reactivate accounts',
  'Reset any user\'s password',
  'View role change history (who changed what, when)',
  'Add / rename departments',
  'Toggle department active/inactive',
  'Configure escalation window per category (in days)',
  'Export full audit log as CSV with date/action/role filters',
]);

h1('10.12  System Health Dashboard (Admin)');
bullet([
  'Auto-polls every 5 seconds with countdown timer',
  'Live/Pause toggle to control polling',
  'Manual Refresh button',
  'Overall status banner: "All systems operational" or "One or more services degraded"',
  'Service cards for: API Server, PostgreSQL, MongoDB, Redis, JWT Auth',
  'Each card shows: pulsing status dot, current latency badge, sparkline chart',
  'Sparkline shows last 20 readings with hover tooltip',
  'Min / Average / Max latency statistics below each sparkline',
  'Redis card: used memory (MB) and connected clients count',
  'API card: server uptime formatted as Xd Xh Xm',
  'Node.js Memory card: heap used, heap total, and RSS with progress bars',
  'JWT card: runs real sign+verify test on every poll to confirm auth is working',
]);

h1('10.13  SLA Settings');
bullet([
  'Configure resolution target (days) per case category',
  'Set severity-based overrides (HIGH cases get shorter SLA than LOW)',
  'Changes take effect immediately for new assignments',
  'Default SLA applies to categories without a specific rule',
]);

h1('10.14  UI / Design System');
bullet([
  'Indigo/violet brand colour scheme with gradient primary',
  'Full dark mode support — persisted in ThemeProvider',
  'Custom scrollbar styling across all browsers',
  'Animated page transitions (fade-in, slide-up)',
  'Glassmorphism navbar with backdrop blur',
  'Per-role colour-coded badges (Staff: grey, Secretariat: blue, Manager: violet, Admin: rose)',
  'Responsive layout with sidebar navigation',
  'Skeleton loaders for all async content',
  '3px gradient accent bar at top of navbar',
  'shadcn/ui design system with 22 accessible components',
]);

// ─── Page numbers ──────────────────────────────────────────────────────────
const pages = doc.bufferedPageRange();
for (let i = pages.start; i < pages.start + pages.count; i++) {
  if (i === 0) continue; // skip cover
  doc.switchToPage(i);
  doc.fontSize(8).font('Helvetica').fillColor(C.muted)
    .text(`NeoConnect — Full Technical Report  ·  Page ${i}  ·  Syed Abrar C`,
      doc.page.margins.left, doc.page.height - 40, { width: PW, align: 'center' });
}

doc.end();
stream.on('finish', () => {
  console.log('✅  PDF saved to:', OUTPUT);
  const size = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
  console.log(`    Size: ${size} KB`);
});
stream.on('error', err => console.error('❌  Error:', err.message));
