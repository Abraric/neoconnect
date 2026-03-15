require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEPARTMENTS = [
  'Human Resources',
  'Information Technology',
  'Facilities',
  'Safety & Compliance',
  'Operations',
  'Finance',
  'Legal',
  'Other',
];

async function main() {
  console.log('Seeding departments...');
  for (const name of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✓ ${name}`);
  }
  console.log('Departments seeded successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
