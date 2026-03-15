# Feature Specification: NeoConnect — Staff Feedback & Complaint Management Platform

**Feature Branch**: `001-neoconnect-platform`
**Created**: 2026-03-15
**Status**: Draft
**Input**: Build NeoConnect — a staff feedback and complaint management platform

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff Submits a Complaint or Feedback (Priority: P1)

An employee wants to raise a workplace issue — about safety, policy, facilities, HR, or anything else. They open the submission form, fill in the details, optionally attach a photo or document, and can choose to remain anonymous. Upon submission they receive a unique tracking ID so they can follow up later.

**Why this priority**: This is the core value of the system. Without submission, nothing else works. Every other feature depends on cases existing in the system.

**Independent Test**: A staff member can complete and submit a case form and receive a tracking ID — this alone proves the intake pipeline works end-to-end.

**Acceptance Scenarios**:

1. **Given** a logged-in staff member on the submission form, **When** they fill in category, department, location, severity, and description and click Submit, **Then** the case is saved and a unique tracking ID in the format NEO-YYYY-NNN is displayed on screen.
2. **Given** a staff member who wants anonymity, **When** they toggle the anonymous option before submitting, **Then** the case is stored without linking it to their identity, and any reader of the case sees "Anonymous" instead of their name.
3. **Given** a staff member attaching a file, **When** they upload a PDF or image alongside their submission, **Then** the file is stored and linked to the case, visible to the assigned Case Manager.
4. **Given** a staff member who leaves a required field blank, **When** they click Submit, **Then** the form highlights the missing field and does not submit.

---

### User Story 2 - Secretariat Assigns a Case to a Case Manager (Priority: P1)

A Secretariat/Management user opens their inbox, reviews newly submitted cases, and assigns each one to an available Case Manager. The Case Manager is notified. The case moves from "New" to "Assigned."

**Why this priority**: Without assignment, cases have no owner and the 7-day escalation and all downstream tracking become impossible.

**Independent Test**: A Secretariat user can assign a New case to a Case Manager — the case status updates and the Case Manager can see it in their queue.

**Acceptance Scenarios**:

1. **Given** a Secretariat user viewing the inbox, **When** they select a New case and assign it to a Case Manager, **Then** the case status changes to Assigned, the Case Manager receives a notification, and the inbox reflects the update immediately.
2. **Given** a Secretariat user, **When** they try to assign a case that is already Resolved, **Then** the system prevents the action and displays an appropriate message.

---

### User Story 3 - Case Manager Works a Case Through to Resolution (Priority: P1)

A Case Manager receives an assigned case, reviews it, updates the status as they work on it, adds notes for the submitter, and eventually closes it as Resolved.

**Why this priority**: This is the accountability backbone of the system — every case must be owned, tracked, and closed.

**Independent Test**: A Case Manager can change a case status from Assigned → In Progress → Resolved and add notes at each step.

**Acceptance Scenarios**:

1. **Given** a Case Manager with an Assigned case, **When** they open it and click "Start Working", **Then** the status changes to In Progress and an activity log entry is created.
2. **Given** a Case Manager working a case, **When** they add a note and save it, **Then** the note is visible on the case timeline and logged with a timestamp.
3. **Given** a Case Manager who needs more information, **When** they set status to Pending with a message, **Then** the submitter is notified to provide additional information.
4. **Given** a Case Manager who has addressed the issue, **When** they close the case, **Then** status becomes Resolved and the case is removed from the active queue.
5. **Given** a Resolved case, **When** any user tries to reopen or change its status, **Then** the system prevents the action.

---

### User Story 4 - Automatic Escalation After 7 Working Days (Priority: P1)

If a Case Manager has not responded to an assigned case within 7 working days, the system automatically escalates it: the Case Manager receives a reminder notification and Management is alerted.

**Why this priority**: This is a core business rule. Without it, cases can silently go unanswered — exactly the problem the platform exists to prevent.

**Independent Test**: A test case assigned to a Case Manager with no activity for 7 working days is automatically moved to Escalated and Management receives a notification.

**Acceptance Scenarios**:

1. **Given** a case in Assigned or In Progress status, **When** 7 working days pass with no status update from the Case Manager, **Then** the case is automatically moved to Escalated status, a reminder is sent to the Case Manager, and Management is notified.
2. **Given** a case in Escalated status, **When** a Case Manager adds a note or updates the status, **Then** the escalation is acknowledged and the case continues in its new status.

---

### User Story 5 - Staff Votes in a Poll (Priority: P2)

A Secretariat user creates a poll with a question and multiple options. All staff members can see it and vote once. After voting, the staff member sees the current results displayed as a chart.

**Why this priority**: Polls drive staff engagement and give management a structured way to gather opinions. Important but not critical to the complaint lifecycle.

**Independent Test**: A Secretariat creates a poll with 3 options; a staff member votes and sees a bar chart of results.

**Acceptance Scenarios**:

1. **Given** a staff member who has not yet voted on an active poll, **When** they select an option and submit, **Then** their vote is recorded and they are shown the current results as a chart.
2. **Given** a staff member who has already voted, **When** they try to vote again on the same poll, **Then** the system prevents it and shows the existing results.
3. **Given** a Secretariat user, **When** they create a poll with a question and at least two options, **Then** the poll becomes visible to all staff immediately.

---

### User Story 6 - Staff Views the Public Hub (Priority: P2)

Any logged-in staff member can browse the Public Hub to see how management has responded to staff feedback, read quarterly digests of resolved cases, view the impact tracking table, and search for meeting minutes.

**Why this priority**: Transparency is a stated goal of the platform. Staff need to see that raising issues leads to real outcomes — this builds trust and encourages future submissions.

**Independent Test**: A staff member can view resolved case summaries, the impact table (what was raised → what changed), and search uploaded meeting documents.

**Acceptance Scenarios**:

1. **Given** a staff member on the Public Hub, **When** they browse the Quarterly Digest, **Then** they see a list of resolved case summaries grouped by quarter with the category and outcome visible.
2. **Given** a staff member viewing Impact Tracking, **When** they look at the table, **Then** they see rows with: what was raised, what action was taken, and what changed.
3. **Given** a staff member searching meeting minutes, **When** they enter a keyword, **Then** the system filters the list of uploaded documents matching that keyword.

---

### User Story 7 - Secretariat Views Analytics Dashboard (Priority: P2)

A Secretariat or Admin user opens the analytics dashboard to see which departments have the most open cases, how cases are distributed by status and category, and which departments are flagged as hotspots.

**Why this priority**: Early warning for recurring departmental issues is a core platform goal. Management needs this to act proactively.

**Independent Test**: A Secretariat user can view a department case count chart, status breakdown, and see any hotspot flags active at the time.

**Acceptance Scenarios**:

1. **Given** a Secretariat user on the analytics page, **When** they view the department chart, **Then** they see each department's open case count visualised as a bar chart or heatmap.
2. **Given** a department with 5 or more open cases sharing the same category, **When** the dashboard loads, **Then** that department is highlighted or flagged as a hotspot with the category name shown.
3. **Given** the analytics dashboard, **When** a Secretariat user views it, **Then** case counts are broken down by status (New, Assigned, In Progress, Pending, Resolved, Escalated) and by category.

---

### User Story 8 - Admin Manages User Accounts (Priority: P3)

An Admin (IT) user can create, deactivate, and update staff accounts, assign roles, and manage system-level access settings.

**Why this priority**: Foundational but lower priority because the system can be seeded with test users; full admin UI is needed for live operation.

**Independent Test**: An Admin user can create a new account, assign it a role, and the new user can log in with those credentials.

**Acceptance Scenarios**:

1. **Given** an Admin user on the accounts page, **When** they create a new user account with a name, email, department, and role, **Then** the user appears in the directory and can log in.
2. **Given** an Admin deactivating an account, **When** the deactivation is confirmed, **Then** that user can no longer log in and their open cases are flagged for reassignment.

---

### Edge Cases

- What happens when a staff member submits a case but loses connection before receiving the tracking ID? The system must guarantee the case is saved and the ID is retrievable via a "My Submissions" view.
- What happens when a Case Manager is deactivated while holding open cases? Those cases must be flagged for reassignment by Secretariat.
- What happens when a file upload exceeds the allowed size or is an unsupported format? The form must reject it with a clear message before submission.
- What happens when a poll is closed — can results still be viewed? Yes, closed polls must remain visible with final results.
- What happens when two Secretariat users try to assign the same case simultaneously? The system must handle the race condition and prevent double-assignment.
- What happens when no working days fall within 7 calendar days (e.g. a long holiday)? The escalation timer must skip non-working days and only count business days.

---

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Access**

- **FR-001**: System MUST authenticate users with email and password and maintain session across page refreshes without requiring re-login.
- **FR-002**: System MUST enforce role-based access so Staff, Secretariat, Case Managers, and Admins can only access features permitted for their role.
- **FR-003**: System MUST prevent any unauthenticated access to all pages except the login screen.

**Case Submission**

- **FR-004**: System MUST allow any logged-in staff member to submit a case with the fields: Category (Safety, Policy, Facilities, HR, Other), Department, Location, Description, and Severity (Low, Medium, High).
- **FR-005**: System MUST generate a unique tracking ID for every submitted case in the format NEO-YYYY-NNN, where YYYY is the submission year and NNN is a zero-padded sequential number.
- **FR-006**: System MUST allow a staff member to toggle anonymity before submission, ensuring their identity is not stored or displayed on the case when anonymous is selected.
- **FR-007**: System MUST allow attachment of one or more files (image or PDF) to a submission, with a maximum file size of 10 MB per file.
- **FR-008**: System MUST validate all required fields and reject submission if any required field is empty.

**Case Lifecycle & Management**

- **FR-009**: System MUST restrict case assignment to Secretariat users only.
- **FR-010**: System MUST restrict case status updates (In Progress, Pending, Resolved) to the assigned Case Manager only.
- **FR-011**: System MUST enforce the state machine: NEW → ASSIGNED → IN_PROGRESS → PENDING → IN_PROGRESS → RESOLVED, with ESCALATED reachable from ASSIGNED or IN_PROGRESS only.
- **FR-012**: System MUST prevent any status change on a Resolved case.
- **FR-013**: System MUST create an immutable activity log entry every time a case status changes, recording who changed it and when.
- **FR-014**: System MUST automatically escalate a case to ESCALATED status when 7 working days pass with no status update from the Case Manager, and notify Management immediately.
- **FR-015**: System MUST send a reminder notification to the Case Manager before escalation triggers.

**Polling**

- **FR-016**: System MUST allow Secretariat users to create a poll with a question and a minimum of two answer options.
- **FR-017**: System MUST allow each staff member to vote exactly once per poll; subsequent vote attempts must be rejected.
- **FR-018**: System MUST display poll results as a visual chart to any staff member who has voted on that poll.

**Public Hub**

- **FR-019**: System MUST display a Quarterly Digest of resolved cases grouped by quarter, showing category and outcome summary.
- **FR-020**: System MUST display an Impact Tracking table with columns: Issue Raised, Action Taken, Outcome/Change.
- **FR-021**: System MUST allow Secretariat to upload meeting minute documents (PDF) with a title and date.
- **FR-022**: System MUST provide keyword search across uploaded meeting minute documents by title.

**Analytics**

- **FR-023**: System MUST display a department-level chart showing the count of open cases per department.
- **FR-024**: System MUST break down case counts by status and by category on the analytics dashboard.
- **FR-025**: System MUST automatically flag a department as a hotspot when 5 or more of its open cases share the same category, and highlight this on the dashboard.

**Notifications**

- **FR-026**: System MUST notify a Case Manager when a case is assigned to them.
- **FR-027**: System MUST notify Management when a case is escalated.
- **FR-028**: System MUST notify the submitter (if not anonymous) when their case status changes.

**Admin**

- **FR-029**: Admin users MUST be able to create, edit, and deactivate user accounts.
- **FR-030**: Admin users MUST be able to assign or change the role of any user account.

### Key Entities

- **Case**: The central record of a staff submission. Has a tracking ID, category, department, location, severity, description, anonymous flag, status, timestamps, and links to activities and attachments.
- **User**: A person with a role (Staff, Secretariat, Case Manager, Admin), department, and authentication credentials.
- **Case Assignment**: Links a case to a Case Manager. Records when the assignment was made and tracks the 7-day working day deadline.
- **Activity Log**: An immutable record of every status change and note added to a case, with actor identity and timestamp.
- **Attachment**: A file (image or PDF) linked to a case, stored with its filename, size, and upload timestamp.
- **Poll**: A question created by Secretariat with multiple answer options, an open/closed state, and a creation date.
- **Vote**: Links a user to a poll option. Enforces one-vote-per-user-per-poll.
- **Notification**: An alert sent to a specific user, with a type (assignment, escalation, status update), message, and read/unread state.
- **Meeting Minute**: A PDF document with a title, upload date, and associated quarter.
- **Impact Record**: A row in the Impact Tracking table showing what issue was raised, what was done, and what changed.
- **Department**: An organisational unit that cases and users belong to, used for analytics grouping.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every submitted case receives a unique tracking ID, with zero duplicate IDs across the entire system.
- **SC-002**: No case assigned to a Case Manager can remain without a status update beyond 7 working days without triggering an escalation — the escalation rate for overdue cases must be 100%.
- **SC-003**: Staff members can complete a case submission in under 3 minutes from opening the form to receiving the tracking ID.
- **SC-004**: Anonymous submissions show zero identifying information about the submitter to any reader of the case, including Case Managers and Secretariat.
- **SC-005**: The Public Hub is visible and browsable to all logged-in staff members, with at least the Quarterly Digest, Impact Table, and Minutes Archive accessible.
- **SC-006**: Each staff member can cast exactly one vote per poll — no double-voting is possible regardless of how the request is made.
- **SC-007**: Hotspot flagging correctly identifies any department with 5 or more open cases sharing the same category, with no false positives or missed flags.
- **SC-008**: The analytics dashboard loads with current case counts in under 5 seconds under normal usage.
- **SC-009**: All four user roles can log in and access only the features designated for their role — no role can access functionality above their permission level.
- **SC-010**: Case activity logs are immutable — no user, including Admin, can delete or alter a logged activity entry.

---

## Assumptions

- Working days are defined as Monday–Friday, excluding weekends. Public holidays are not accounted for in the escalation timer in the initial version.
- File uploads are stored on the local server filesystem in the initial version; cloud storage can be added later.
- Email-based notifications are out of scope for the initial version; notifications are in-app only (displayed in the UI).
- The system is single-organisation — there is one company, one set of departments, and one user directory.
- Department list is seeded by the Admin at setup time; staff cannot create new departments themselves.
- The Quarterly Digest is populated manually by Secretariat uploading impact records; automated summarisation of resolved cases is not required.
- User registration is managed solely by Admin (IT) — there is no self-service sign-up.
- Polls have no expiry date by default; Secretariat closes them manually.
