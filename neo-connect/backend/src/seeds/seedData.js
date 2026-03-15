require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data...\n');

  // ── Fetch users & departments ──────────────────────────────────────────────
  const admin        = await prisma.user.findUnique({ where: { email: 'admin@neoconnect.com' } });
  const secretariat  = await prisma.user.findUnique({ where: { email: 'secretariat@neoconnect.com' } });
  const manager      = await prisma.user.findUnique({ where: { email: 'manager@neoconnect.com' } });
  const staff        = await prisma.user.findUnique({ where: { email: 'staff@neoconnect.com' } });
  const staff2       = await prisma.user.findUnique({ where: { email: 'staff2@neoconnect.com' } });

  const depts = await prisma.department.findMany();
  const dept = (name) => depts.find(d => d.name === name) || depts[0];

  const hrDept         = dept('Human Resources');
  const itDept         = dept('Information Technology');
  const facilitiesDept = dept('Facilities');
  const safetyDept     = dept('Safety & Compliance');
  const opsDept        = dept('Operations');

  // ── Helper: generate tracking IDs ─────────────────────────────────────────
  const existing = await prisma.case.count();
  let seq = existing;
  const nextId = () => `NEO-2026-${String(++seq).padStart(3, '0')}`;

  // ── Cases ──────────────────────────────────────────────────────────────────
  console.log('Creating cases...');

  const caseDefs = [
    // NEW
    {
      trackingId: nextId(), category: 'SAFETY', departmentId: safetyDept.id,
      location: 'Building A, Ground Floor', severity: 'HIGH',
      description: 'Fire extinguisher in the main corridor has expired. The inspection tag shows it was last serviced over 18 months ago and poses a significant safety risk.',
      isAnonymous: false, submitterId: staff.id, status: 'NEW',
    },
    {
      trackingId: nextId(), category: 'HR', departmentId: hrDept.id,
      location: 'HR Office', severity: 'MEDIUM',
      description: 'Concern regarding inconsistent application of the leave policy across different teams. Some managers are allowing flexible leave while others are strictly enforcing it.',
      isAnonymous: true, submitterId: null, status: 'NEW',
    },
    // ASSIGNED
    {
      trackingId: nextId(), category: 'FACILITIES', departmentId: facilitiesDept.id,
      location: 'Floor 3, Meeting Room B', severity: 'LOW',
      description: 'The air conditioning unit in meeting room B has been malfunctioning for two weeks. It either blows hot air or shuts off completely, making the room unusable for extended meetings.',
      isAnonymous: false, submitterId: staff2.id, status: 'ASSIGNED',
    },
    {
      trackingId: nextId(), category: 'POLICY', departmentId: itDept.id,
      location: 'IT Department', severity: 'MEDIUM',
      description: 'The current password policy requires changes every 30 days which is causing staff to use weak incremental passwords. Requesting review and update of the password policy to follow NIST guidelines.',
      isAnonymous: false, submitterId: staff.id, status: 'ASSIGNED',
    },
    // IN_PROGRESS
    {
      trackingId: nextId(), category: 'SAFETY', departmentId: opsDept.id,
      location: 'Warehouse Loading Bay', severity: 'HIGH',
      description: 'Forklift near-miss incident occurred on Tuesday morning. The loading bay markings have faded and are no longer clearly visible. Three separate incidents reported this month alone.',
      isAnonymous: false, submitterId: staff2.id, status: 'IN_PROGRESS',
    },
    {
      trackingId: nextId(), category: 'HR', departmentId: hrDept.id,
      location: 'Open Plan Office', severity: 'HIGH',
      description: 'Multiple staff members have reported a hostile working environment in the open plan area. Repeated complaints about a colleague\'s behaviour affecting team morale and productivity.',
      isAnonymous: true, submitterId: null, status: 'IN_PROGRESS',
    },
    {
      trackingId: nextId(), category: 'FACILITIES', departmentId: facilitiesDept.id,
      location: 'Staff Car Park', severity: 'MEDIUM',
      description: 'Lighting in the staff car park has been faulty for over a month. Several staff members feel unsafe walking to their cars after evening shifts. Two lights are completely out.',
      isAnonymous: false, submitterId: staff.id, status: 'IN_PROGRESS',
    },
    // PENDING
    {
      trackingId: nextId(), category: 'POLICY', departmentId: hrDept.id,
      location: 'All Departments', severity: 'LOW',
      description: 'The expense reimbursement process takes over 6 weeks. Staff are having to fund business expenses out of pocket for extended periods. Requesting a review of the approval chain.',
      isAnonymous: false, submitterId: staff.id, status: 'PENDING',
    },
    // RESOLVED
    {
      trackingId: nextId(), category: 'FACILITIES', departmentId: facilitiesDept.id,
      location: 'Ground Floor Kitchen', severity: 'LOW',
      description: 'The microwave in the ground floor kitchen has a broken door latch and is a potential safety hazard. Staff have been using tape to keep it closed.',
      isAnonymous: false, submitterId: staff2.id, status: 'RESOLVED',
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      trackingId: nextId(), category: 'OTHER', departmentId: itDept.id,
      location: 'Finance Department', severity: 'HIGH',
      description: 'Finance team unable to access the shared drive since the server migration on Monday. Critical month-end reports cannot be completed. Affecting 12 staff members.',
      isAnonymous: false, submitterId: staff.id, status: 'RESOLVED',
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      trackingId: nextId(), category: 'SAFETY', departmentId: safetyDept.id,
      location: 'Stairwell B', severity: 'MEDIUM',
      description: 'Handrail on stairwell B is loose and wobbles significantly. Risk of injury for staff using the stairs, particularly those carrying items.',
      isAnonymous: false, submitterId: staff2.id, status: 'RESOLVED',
      resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    // ESCALATED
    {
      trackingId: nextId(), category: 'HR', departmentId: hrDept.id,
      location: 'HR Department', severity: 'HIGH',
      description: 'Ongoing discrimination complaint that has not been addressed despite being submitted 3 weeks ago. The situation is worsening and affecting the well-being of multiple staff members.',
      isAnonymous: false, submitterId: staff.id, status: 'ESCALATED',
      escalatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  const createdCases = [];
  for (const def of caseDefs) {
    const { status, resolvedAt, escalatedAt, ...data } = def;
    const c = await prisma.case.create({
      data: { ...data, status, resolvedAt: resolvedAt || null, escalatedAt: escalatedAt || null },
    });
    createdCases.push({ ...c, originalStatus: status });
    console.log(`  ✓ [${status}] ${c.trackingId} — ${c.category}`);
  }

  // ── Assignments ───────────────────────────────────────────────────────────
  console.log('\nCreating assignments & status logs...');

  const assignedCases = createdCases.filter(c =>
    ['ASSIGNED', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'ESCALATED'].includes(c.originalStatus)
  );

  for (const c of assignedCases) {
    const assignedAt = new Date(c.createdAt.getTime() + 2 * 60 * 60 * 1000); // 2h after creation
    const escalationDeadline = new Date(assignedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.caseAssignment.create({
      data: {
        caseId: c.id,
        managerId: manager.id,
        assignedById: secretariat.id,
        assignedAt,
        escalationDeadline,
        isActive: true,
      },
    });

    // Status log: NEW → ASSIGNED
    await prisma.caseStatusLog.create({
      data: {
        caseId: c.id,
        fromStatus: 'NEW',
        toStatus: 'ASSIGNED',
        changedById: secretariat.id,
        note: 'Case reviewed and assigned for investigation.',
        changedAt: assignedAt,
      },
    });

    // Additional transitions
    if (['IN_PROGRESS', 'PENDING', 'RESOLVED', 'ESCALATED'].includes(c.originalStatus)) {
      const inProgressAt = new Date(assignedAt.getTime() + 4 * 60 * 60 * 1000);
      await prisma.caseStatusLog.create({
        data: {
          caseId: c.id, fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS',
          changedById: manager.id, note: 'Investigation started. Gathering information from relevant parties.',
          changedAt: inProgressAt,
        },
      });

      if (['PENDING', 'RESOLVED'].includes(c.originalStatus)) {
        const pendingAt = new Date(inProgressAt.getTime() + 24 * 60 * 60 * 1000);
        await prisma.caseStatusLog.create({
          data: {
            caseId: c.id, fromStatus: 'IN_PROGRESS', toStatus: 'PENDING',
            changedById: manager.id, note: 'Awaiting approval from senior management before proceeding.',
            changedAt: pendingAt,
          },
        });

        if (c.originalStatus === 'RESOLVED') {
          const resolvedLogAt = new Date(c.resolvedAt.getTime() - 60 * 60 * 1000);
          await prisma.caseStatusLog.create({
            data: {
              caseId: c.id, fromStatus: 'PENDING', toStatus: 'RESOLVED',
              changedById: manager.id, note: 'Issue has been fully resolved. Corrective actions completed and verified.',
              changedAt: resolvedLogAt,
            },
          });
        }
      }

      if (c.originalStatus === 'ESCALATED') {
        await prisma.caseStatusLog.create({
          data: {
            caseId: c.id, fromStatus: 'IN_PROGRESS', toStatus: 'ESCALATED',
            changedById: admin.id, note: 'Case escalated automatically — 7-day resolution deadline exceeded.',
            changedAt: c.escalatedAt,
          },
        });
      }
    }
  }
  console.log(`  ✓ Created assignments and timelines for ${assignedCases.length} cases`);

  // ── Notifications ─────────────────────────────────────────────────────────
  console.log('\nCreating notifications...');

  const notifDefs = [
    { recipientId: manager.id, type: 'CASE_ASSIGNED', caseId: assignedCases[0].id, message: `Case ${assignedCases[0].trackingId} has been assigned to you for investigation.` },
    { recipientId: manager.id, type: 'CASE_ASSIGNED', caseId: assignedCases[1].id, message: `Case ${assignedCases[1].trackingId} has been assigned to you for investigation.`, isRead: true },
    { recipientId: secretariat.id, type: 'STATUS_UPDATED', caseId: assignedCases[2].id, message: `Case ${assignedCases[2].trackingId} status updated to IN_PROGRESS.`, isRead: true },
    { recipientId: manager.id, type: 'ESCALATION_ALERT', caseId: assignedCases[assignedCases.length - 1].id, message: `ESCALATED: Case ${assignedCases[assignedCases.length - 1].trackingId} has exceeded the 7-day resolution deadline.` },
    { recipientId: secretariat.id, type: 'ESCALATION_ALERT', caseId: assignedCases[assignedCases.length - 1].id, message: `Case ${assignedCases[assignedCases.length - 1].trackingId} has been automatically escalated after 7 working days.` },
    { recipientId: staff.id, type: 'STATUS_UPDATED', caseId: createdCases.find(c => c.originalStatus === 'RESOLVED' && !c.isAnonymous)?.id, message: 'Your submitted case has been resolved. Thank you for bringing this to our attention.' },
  ].filter(n => n.caseId);

  for (const n of notifDefs) {
    await prisma.notification.create({
      data: { recipientId: n.recipientId, type: n.type, caseId: n.caseId, message: n.message, isRead: n.isRead ?? false },
    });
  }
  console.log(`  ✓ Created ${notifDefs.length} notifications`);

  // ── Polls ─────────────────────────────────────────────────────────────────
  console.log('\nCreating polls...');

  const pollDefs = [
    {
      question: 'Which area needs the most improvement in our workplace?',
      options: ['Safety & Facilities', 'HR Policies', 'IT Infrastructure', 'Communication', 'Work-Life Balance'],
      votes: [
        { userId: staff.id, option: 0 },
        { userId: staff2.id, option: 2 },
        { userId: manager.id, option: 4 },
        { userId: admin.id, option: 0 },
      ],
      isOpen: true,
    },
    {
      question: 'How satisfied are you with the current case resolution process?',
      options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
      votes: [
        { userId: staff.id, option: 2 },
        { userId: staff2.id, option: 3 },
        { userId: manager.id, option: 1 },
      ],
      isOpen: true,
    },
    {
      question: 'What time slot works best for the all-hands safety briefing?',
      options: ['Monday 9am', 'Wednesday 2pm', 'Friday 11am', 'Thursday 3pm'],
      votes: [
        { userId: staff.id, option: 1 },
        { userId: staff2.id, option: 1 },
        { userId: manager.id, option: 2 },
        { userId: admin.id, option: 1 },
        { userId: secretariat.id, option: 3 },
      ],
      isOpen: false,
      closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const pd of pollDefs) {
    const poll = await prisma.poll.create({
      data: {
        question: pd.question,
        createdById: secretariat.id,
        isOpen: pd.isOpen,
        closedAt: pd.closedAt || null,
        options: {
          create: pd.options.map((text, i) => ({ text, displayOrder: i })),
        },
      },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });

    for (const v of pd.votes) {
      const option = poll.options[v.option];
      await prisma.vote.create({
        data: { pollId: poll.id, optionId: option.id, userId: v.userId },
      }).catch(() => {}); // skip duplicate votes
    }
    console.log(`  ✓ Poll: "${pd.question.slice(0, 50)}…" (${pd.votes.length} votes)`);
  }

  // ── Impact Records ────────────────────────────────────────────────────────
  console.log('\nCreating impact records...');

  const impacts = [
    {
      issueRaised: 'Staff reported inadequate lighting in the car park causing safety concerns during evening shifts.',
      actionTaken: 'Facilities team installed 8 new high-powered LED lights across the car park and repaired 3 existing broken units.',
      outcomeChange: 'Zero lighting-related safety complaints since installation. Staff satisfaction with car park safety increased by 85% in follow-up survey.',
      quarter: 'Q4 2025',
    },
    {
      issueRaised: 'Multiple reports of inconsistent leave policy application across departments causing staff frustration.',
      actionTaken: 'HR conducted a full review of the leave policy, updated the employee handbook, and ran mandatory manager training sessions.',
      outcomeChange: 'Leave-related complaints reduced by 70%. All managers now applying policy consistently as confirmed by quarterly audit.',
      quarter: 'Q4 2025',
    },
    {
      issueRaised: 'IT infrastructure issues causing frequent system outages affecting productivity across all departments.',
      actionTaken: 'IT department upgraded server infrastructure, implemented redundant backup systems, and established 24/7 monitoring.',
      outcomeChange: 'System uptime improved from 94% to 99.7%. Help desk tickets related to outages reduced by 60%.',
      quarter: 'Q1 2026',
    },
    {
      issueRaised: 'Expense reimbursement process taking 6+ weeks causing financial hardship for staff.',
      actionTaken: 'Finance team streamlined the approval process, reducing approval chain from 5 steps to 2, and implemented bi-weekly payment runs.',
      outcomeChange: 'Average reimbursement time reduced from 42 days to 8 days. Staff satisfaction with expense process up 90%.',
      quarter: 'Q1 2026',
    },
  ];

  for (const imp of impacts) {
    await prisma.impactRecord.create({
      data: { ...imp, createdById: secretariat.id },
    });
    console.log(`  ✓ Impact: "${imp.quarter} — ${imp.issueRaised.slice(0, 50)}…"`);
  }

  // ── Meeting Minutes ───────────────────────────────────────────────────────
  console.log('\nCreating meeting minutes records...');

  const minutesDefs = [
    { title: 'Q4 2025 Safety & Welfare Committee Meeting', quarter: 'Q4 2025', storagePath: 'uploads/minutes/q4-2025-safety-meeting.pdf' },
    { title: 'Q4 2025 HR Policy Review Meeting', quarter: 'Q4 2025', storagePath: 'uploads/minutes/q4-2025-hr-review.pdf' },
    { title: 'Q1 2026 All-Hands Staff Briefing', quarter: 'Q1 2026', storagePath: 'uploads/minutes/q1-2026-all-hands.pdf' },
    { title: 'Q1 2026 Facilities & Infrastructure Review', quarter: 'Q1 2026', storagePath: 'uploads/minutes/q1-2026-facilities.pdf' },
  ];

  for (const m of minutesDefs) {
    await prisma.meetingMinute.create({
      data: { ...m, uploadedById: secretariat.id },
    });
    console.log(`  ✓ Minutes: "${m.title}"`);
  }

  console.log('\n✅ Demo data seeded successfully!');
  console.log('\nSummary:');
  console.log(`  Cases:           ${caseDefs.length} (NEW×2, ASSIGNED×2, IN_PROGRESS×3, PENDING×1, RESOLVED×3, ESCALATED×1)`);
  console.log(`  Polls:           ${pollDefs.length} (2 open, 1 closed)`);
  console.log(`  Impact Records:  ${impacts.length}`);
  console.log(`  Meeting Minutes: ${minutesDefs.length}`);
  console.log(`  Notifications:   ${notifDefs.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
