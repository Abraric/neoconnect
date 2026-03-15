require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding users...');

  const hrDept = await prisma.department.findFirst({ where: { name: 'Human Resources' } });
  const itDept = await prisma.department.findFirst({ where: { name: 'Information Technology' } });

  if (!hrDept || !itDept) {
    throw new Error('Run seedDepartments.js first');
  }

  const users = [
    { email: 'admin@neoconnect.com', fullName: 'System Admin', role: 'ADMIN', password: 'Admin@123', dept: itDept.id },
    { email: 'secretariat@neoconnect.com', fullName: 'Office Secretariat', role: 'SECRETARIAT', password: 'Secret@123', dept: hrDept.id },
    { email: 'manager@neoconnect.com', fullName: 'Case Manager One', role: 'CASE_MANAGER', password: 'Manager@123', dept: hrDept.id },
    { email: 'staff@neoconnect.com', fullName: 'Staff Member One', role: 'STAFF', password: 'Staff@123', dept: hrDept.id },
    { email: 'staff2@neoconnect.com', fullName: 'Staff Member Two', role: 'STAFF', password: 'Staff@123', dept: itDept.id },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash,
        departmentId: u.dept,
      },
    });
    console.log(`  ✓ ${u.role}: ${u.email} / ${u.password}`);
  }
  console.log('Users seeded successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
