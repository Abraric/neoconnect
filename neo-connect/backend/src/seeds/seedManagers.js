require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding additional managers and case assignments...\n');

  // ── Departments ────────────────────────────────────────────────────────────
  const depts = await prisma.department.findMany();
  const dept = (name) => depts.find(d => d.name === name) || depts[0];

  const hrDept         = dept('Human Resources');
  const itDept         = dept('Information Technology');
  const facilitiesDept = dept('Facilities');
  const safetyDept     = dept('Safety & Compliance');
  const opsDept        = dept('Operations');

  const secretariat = await prisma.user.findUnique({ where: { email: 'secretariat@neoconnect.com' } });
  const admin       = await prisma.user.findUnique({ where: { email: 'admin@neoconnect.com' } });
  const staff       = await prisma.user.findUnique({ where: { email: 'staff@neoconnect.com' } });
  const staff2      = await prisma.user.findUnique({ where: { email: 'staff2@neoconnect.com' } });

  if (!secretariat || !admin) {
    throw new Error('Run seedUsers.js first');
  }

  // ── Create new managers ────────────────────────────────────────────────────
  console.log('Creating manager accounts...');

  const managerDefs = [
    { email: 'david.chen@neoconnect.com',    fullName: 'David Chen',        dept: itDept.id,         password: 'Manager@123' },
    { email: 'maria.rodriguez@neoconnect.com', fullName: 'Maria Rodriguez', dept: facilitiesDept.id, password: 'Manager@123' },
    { email: 'james.okonkwo@neoconnect.com', fullName: 'James Okonkwo',     dept: safetyDept.id,     password: 'Manager@123' },
    { email: 'priya.patel@neoconnect.com',   fullName: 'Priya Patel',       dept: opsDept.id,        password: 'Manager@123' },
  ];

  const newManagers = [];
  for (const m of managerDefs) {
    const passwordHash = await bcrypt.hash(m.password, 12);
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { passwordHash },
      create: { email: m.email, fullName: m.fullName, role: 'CASE_MANAGER', passwordHash, departmentId: m.dept },
    });
    newManagers.push(user);
    console.log(`  ✓ CASE_MANAGER: ${m.email} / ${m.password}  (${m.fullName})`);
  }

  const [mgChen, mgRodriguez, mgOkonkwo, mgPatel] = newManagers;
  const mgOne = await prisma.user.findUnique({ where: { email: 'manager@neoconnect.com' } });

  // ── Helper: tracking ID ────────────────────────────────────────────────────
  const existing = await prisma.case.count();
  let seq = existing;
  const nextId = () => `NEO-2026-${String(++seq).padStart(3, '0')}`;

  // ── New cases spread across managers ─────────────────────────────────────
  console.log('\nCreating new cases...');

  // days ago helper
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const hoursAfter = (base, h) => new Date(base.getTime() + h * 60 * 60 * 1000);

  const caseDefs = [
    // ── David Chen (IT) ──
    {
      trackingId: nextId(), category: 'POLICY', departmentId: itDept.id,
      location: 'IT Department, Floor 2', severity: 'MEDIUM',
      description: 'Staff are using personal USB drives on work machines despite the IT policy prohibiting it. Risk of data exfiltration and malware introduction is significant.',
      isAnonymous: false, submitterId: staff.id, status: 'IN_PROGRESS',
      assignTo: mgChen, createdAt: daysAgo(8),
      statusNote: 'USB drive policy audit underway. Working with department heads to enforce controls.',
    },
    {
      trackingId: nextId(), category: 'OTHER', departmentId: itDept.id,
      location: 'All Floors — Network Closets', severity: 'HIGH',
      description: 'Network switches on floors 2 and 3 have been overheating during peak hours causing brief connectivity drops. This has affected two client video calls this week.',
      isAnonymous: false, submitterId: staff2.id, status: 'ASSIGNED',
      assignTo: mgChen, createdAt: daysAgo(3),
    },
    {
      trackingId: nextId(), category: 'POLICY', departmentId: itDept.id,
      location: 'Remote Working — All Staff', severity: 'LOW',
      description: 'The remote working policy has not been updated since 2022 and no longer reflects current hybrid arrangements. Multiple ambiguities are causing disputes between staff and line managers.',
      isAnonymous: true, submitterId: null, status: 'PENDING',
      assignTo: mgChen, createdAt: daysAgo(14),
      statusNote: 'Draft updated policy circulated to HR and Legal for review. Awaiting sign-off.',
    },

    // ── Maria Rodriguez (Facilities) ──
    {
      trackingId: nextId(), category: 'FACILITIES', departmentId: facilitiesDept.id,
      location: 'Rooftop HVAC Plant Room', severity: 'HIGH',
      description: 'The main HVAC system has developed a refrigerant leak. Temperatures on floors 4 and 5 are reaching 29°C. Three staff members have reported heat-related illness symptoms.',
      isAnonymous: false, submitterId: staff.id, status: 'IN_PROGRESS',
      assignTo: mgRodriguez, createdAt: daysAgo(5),
      statusNote: 'HVAC contractor on site. Temporary portable units deployed to affected floors while repair is completed.',
    },
    {
      trackingId: nextId(), category: 'FACILITIES', departmentId: facilitiesDept.id,
      location: 'Ground Floor — Reception', severity: 'MEDIUM',
      description: 'The reception area wheelchair ramp has a cracked surface that poses a trip hazard. The crack has widened since first reported six weeks ago.',
      isAnonymous: false, submitterId: staff2.id, status: 'RESOLVED',
      assignTo: mgRodriguez, createdAt: daysAgo(20),
      resolvedAt: daysAgo(4),
      statusNote: 'Ramp resurfaced and anti-slip coating applied. Signed off by facilities inspector on 12 Mar.',
    },
    {
      trackingId: nextId(), category: 'FACILITIES', departmentId: opsDept.id,
      location: 'Canteen — First Floor', severity: 'LOW',
      description: 'The dishwasher in the canteen has been leaking for two weeks. Staff are manually drying dishes which is slowing lunch service significantly.',
      isAnonymous: false, submitterId: staff.id, status: 'ASSIGNED',
      assignTo: mgRodriguez, createdAt: daysAgo(2),
    },

    // ── James Okonkwo (Safety) ──
    {
      trackingId: nextId(), category: 'SAFETY', departmentId: safetyDept.id,
      location: 'Chemical Storage Room B4', severity: 'HIGH',
      description: 'Incompatible chemicals are being stored adjacent to each other in room B4. The storage layout does not match the hazardous materials plan filed last year. Immediate risk of reaction.',
      isAnonymous: false, submitterId: staff.id, status: 'IN_PROGRESS',
      assignTo: mgOkonkwo, createdAt: daysAgo(6),
      statusNote: 'Chemical storage has been physically separated. Full compliance review with EHS officer scheduled for Friday.',
    },
    {
      trackingId: nextId(), category: 'SAFETY', departmentId: opsDept.id,
      location: 'Warehouse — Mezzanine Level', severity: 'HIGH',
      description: 'Safety netting on the mezzanine level has a 1.5m tear. A stock item fell through yesterday and narrowly missed a warehouse operative below. Area has been cordoned off pending repair.',
      isAnonymous: false, submitterId: staff2.id, status: 'ASSIGNED',
      assignTo: mgOkonkwo, createdAt: daysAgo(1),
    },
    {
      trackingId: nextId(), category: 'SAFETY', departmentId: safetyDept.id,
      location: 'All Sites — Fire Exits', severity: 'MEDIUM',
      description: 'Quarterly fire exit audit revealed that 4 of 12 fire exit signs across all sites have failed LED backlighting. Signs are not visible in low-light conditions.',
      isAnonymous: false, submitterId: staff.id, status: 'RESOLVED',
      assignTo: mgOkonkwo, createdAt: daysAgo(18),
      resolvedAt: daysAgo(6),
      statusNote: 'All 4 faulty signs replaced. Full site inspection completed and signed off by fire safety officer.',
    },

    // ── Priya Patel (Operations) ──
    {
      trackingId: nextId(), category: 'HR', departmentId: hrDept.id,
      location: 'Operations Department', severity: 'MEDIUM',
      description: 'Several operations staff have raised concerns that overtime hours are not being compensated fairly. Payroll records show discrepancies between logged hours and payments made over the last quarter.',
      isAnonymous: true, submitterId: null, status: 'IN_PROGRESS',
      assignTo: mgPatel, createdAt: daysAgo(9),
      statusNote: 'Payroll audit for Q4 2025 initiated. Finance and HR conducting joint review of timesheets.',
    },
    {
      trackingId: nextId(), category: 'POLICY', departmentId: opsDept.id,
      location: 'Operations — Shift Handover Room', severity: 'LOW',
      description: 'The shift handover process lacks a standardised checklist. Critical information is being missed between shifts leading to repeated errors and near-misses in daily operations.',
      isAnonymous: false, submitterId: staff2.id, status: 'PENDING',
      assignTo: mgPatel, createdAt: daysAgo(11),
      statusNote: 'Draft handover checklist prepared. Pilot running with night shift team this week before wider rollout.',
    },
    {
      trackingId: nextId(), category: 'OTHER', departmentId: opsDept.id,
      location: 'Operations Control Room', severity: 'MEDIUM',
      description: 'The operations monitoring software licence expired last month. Staff are using workarounds that reduce visibility of live data. Requesting urgent licence renewal approval.',
      isAnonymous: false, submitterId: staff.id, status: 'ASSIGNED',
      assignTo: mgPatel, createdAt: daysAgo(4),
    },

    // ── Manager One (existing) — reassign one more ──
    {
      trackingId: nextId(), category: 'HR', departmentId: hrDept.id,
      location: 'HR Department', severity: 'MEDIUM',
      description: 'Three members of staff have separately raised concerns about the onboarding process for new joiners. New staff report feeling unsupported in their first month with unclear expectations.',
      isAnonymous: false, submitterId: staff.id, status: 'IN_PROGRESS',
      assignTo: mgOne, createdAt: daysAgo(7),
      statusNote: 'New onboarding guide drafted. Buddy system pilot launching next week with two new starters.',
    },
  ];

  const createdCases = [];
  for (const def of caseDefs) {
    const { status, resolvedAt, escalatedAt, assignTo, statusNote, createdAt, ...data } = def;
    const c = await prisma.case.create({
      data: {
        ...data,
        status,
        resolvedAt: resolvedAt || null,
        escalatedAt: escalatedAt || null,
        createdAt: createdAt || new Date(),
      },
    });
    createdCases.push({ ...c, originalStatus: status, assignTo, statusNote, caseCreatedAt: createdAt || new Date(), resolvedAt });
    console.log(`  ✓ [${status.padEnd(11)}] ${c.trackingId} → ${assignTo?.fullName ?? '—'}  (${c.category})`);
  }

  // ── Assignments & timelines ────────────────────────────────────────────────
  console.log('\nCreating assignments and status logs...');

  for (const c of createdCases) {
    if (!c.assignTo) continue;

    const assignedAt       = hoursAfter(c.caseCreatedAt, 3);
    const escalationDeadline = new Date(assignedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.caseAssignment.create({
      data: {
        caseId: c.id,
        managerId: c.assignTo.id,
        assignedById: secretariat.id,
        assignedAt,
        escalationDeadline,
        isActive: true,
      },
    });

    // NEW → ASSIGNED
    await prisma.caseStatusLog.create({
      data: {
        caseId: c.id, fromStatus: 'NEW', toStatus: 'ASSIGNED',
        changedById: secretariat.id,
        note: 'Case reviewed and assigned for investigation.',
        changedAt: assignedAt,
      },
    });

    if (['IN_PROGRESS', 'PENDING', 'RESOLVED', 'ESCALATED'].includes(c.originalStatus)) {
      const inProgressAt = hoursAfter(assignedAt, 5);
      await prisma.caseStatusLog.create({
        data: {
          caseId: c.id, fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS',
          changedById: c.assignTo.id,
          note: c.statusNote || 'Investigation started.',
          changedAt: inProgressAt,
        },
      });

      if (['PENDING', 'RESOLVED'].includes(c.originalStatus)) {
        const pendingAt = hoursAfter(inProgressAt, 28);
        await prisma.caseStatusLog.create({
          data: {
            caseId: c.id, fromStatus: 'IN_PROGRESS', toStatus: 'PENDING',
            changedById: c.assignTo.id,
            note: c.statusNote || 'Awaiting approval or further information before proceeding.',
            changedAt: pendingAt,
          },
        });

        if (c.originalStatus === 'RESOLVED' && c.resolvedAt) {
          await prisma.caseStatusLog.create({
            data: {
              caseId: c.id, fromStatus: 'PENDING', toStatus: 'RESOLVED',
              changedById: c.assignTo.id,
              note: 'Issue resolved. All corrective actions completed and verified.',
              changedAt: new Date(c.resolvedAt.getTime() - 60 * 60 * 1000),
            },
          });
        }
      }
    }

    // Assignment notification
    await prisma.notification.create({
      data: {
        recipientId: c.assignTo.id,
        type: 'CASE_ASSIGNED',
        caseId: c.id,
        message: `Case ${c.trackingId} has been assigned to you for investigation.`,
        isRead: ['RESOLVED', 'PENDING'].includes(c.originalStatus),
      },
    });
  }

  console.log(`  ✓ Created assignments and timelines for ${createdCases.length} cases`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const managerSummary = [mgOne, mgChen, mgRodriguez, mgOkonkwo, mgPatel].map(m => ({
    name: m?.fullName,
    cases: createdCases.filter(c => c.assignTo?.id === m?.id).length,
  }));

  console.log('\n✅ Done!\n');
  console.log('Manager assignments:');
  for (const s of managerSummary) {
    console.log(`  ${(s.name || '').padEnd(22)} — ${s.cases} new case(s)`);
  }
  console.log('\nNew manager credentials (password: Manager@123):');
  for (const m of managerDefs) {
    console.log(`  ${m.email}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
