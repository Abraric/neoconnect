const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateTrackingId } = require('../../utils/trackingId');
const { attachmentRepository } = require('../../repositories/attachment.repository');
const { caseLogRepository } = require('../../repositories/caseLog.repository');

const createCaseService = async ({ category, departmentId, location, severity, description, isAnonymous, submitterId, files = [] }) => {
  const trackingId = await generateTrackingId();

  const caseData = {
    trackingId,
    category,
    departmentId,
    location,
    severity,
    description,
    isAnonymous,
    submitterId: isAnonymous ? null : submitterId,
    status: 'NEW',
  };

  // Create case + outbox event in single PostgreSQL transaction
  const newCase = await prisma.$transaction(async (tx) => {
    const created = await tx.case.create({ data: caseData });
    await tx.outboxEvent.create({
      data: {
        eventType: 'case_created',
        caseId: created.id,
        payload: { trackingId, category, departmentId, severity },
      },
    });
    return created;
  });

  // Save attachments to MongoDB (outside transaction — eventually consistent)
  if (files.length > 0) {
    await Promise.all(
      files.map((file) =>
        attachmentRepository.save({
          caseId: newCase.id,
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath: file.path,
          uploadedById: submitterId || 'anonymous',
        })
      )
    );
  }

  // Log to MongoDB audit trail
  await caseLogRepository.log({
    caseId: newCase.id,
    actorId: submitterId || 'anonymous',
    actorRole: 'STAFF',
    action: 'case_created',
    details: { trackingId, category, severity, isAnonymous },
  });

  return { id: newCase.id, trackingId: newCase.trackingId, status: newCase.status, createdAt: newCase.createdAt };
};

module.exports = { createCaseService };
