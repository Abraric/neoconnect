const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { sendSuccess } = require('../utils/response');

const router = Router();
const prisma = new PrismaClient();

// Public (authenticated): only active departments
router.get('/', authenticate, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, departments);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
