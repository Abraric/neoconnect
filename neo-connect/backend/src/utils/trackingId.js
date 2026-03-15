const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate a unique NEO-YYYY-NNN tracking ID.
 * Queries existing cases for the current year and increments.
 */
const generateTrackingId = async () => {
  const year = new Date().getFullYear();
  const prefix = `NEO-${year}-`;
  const existing = await prisma.case.findMany({
    where: { trackingId: { startsWith: prefix } },
    select: { trackingId: true },
    orderBy: { trackingId: 'desc' },
    take: 1,
  });
  let next = 1;
  if (existing.length > 0) {
    const last = existing[0].trackingId;
    const lastNum = parseInt(last.split('-')[2], 10);
    next = lastNum + 1;
  }
  return `${prefix}${String(next).padStart(3, '0')}`;
};

module.exports = { generateTrackingId };
