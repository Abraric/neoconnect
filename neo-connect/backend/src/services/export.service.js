const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCasesForExport({ status, category, departmentId, from, to }) {
  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (departmentId) where.departmentId = departmentId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  return prisma.case.findMany({
    where,
    include: {
      department: { select: { name: true } },
      submitter: { select: { fullName: true } },
      assignments: { where: { isActive: true }, include: { manager: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });
}

function generateCSV(cases) {
  const headers = ['Tracking ID', 'Category', 'Severity', 'Status', 'Department', 'Location', 'Submitter', 'Assigned To', 'Created At', 'Resolved At', 'Priority'];
  const rows = cases.map(c => [
    c.trackingId,
    c.category,
    c.severity,
    c.status,
    c.department?.name ?? '',
    c.location,
    c.isAnonymous ? 'Anonymous' : (c.submitter?.fullName ?? ''),
    c.assignments?.[0]?.manager?.fullName ?? 'Unassigned',
    new Date(c.createdAt).toISOString().split('T')[0],
    c.resolvedAt ? new Date(c.resolvedAt).toISOString().split('T')[0] : '',
    c.isPriority ? 'URGENT' : '',
  ]);
  return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

async function generatePDF(cases) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  // Header
  doc.fontSize(18).fillColor('#2563eb').text('NeoConnect — Case Report', { align: 'center' });
  doc.fontSize(10).fillColor('#6b7280').text(`Generated: ${new Date().toLocaleString()}  |  Total: ${cases.length} cases`, { align: 'center' });
  doc.moveDown(1.5);

  // Cases
  cases.forEach((c, i) => {
    if (i > 0) doc.moveDown(0.5);
    const color = c.isPriority ? '#dc2626' : '#1e293b';
    doc.fontSize(11).fillColor(color).text(`${c.trackingId}${c.isPriority ? '  [URGENT]' : ''}  —  ${c.status}`, { continued: false });
    doc.fontSize(9).fillColor('#374151')
      .text(`Category: ${c.category}  |  Severity: ${c.severity}  |  Dept: ${c.department?.name ?? '—'}`)
      .text(`Location: ${c.location}`)
      .text(`Submitter: ${c.isAnonymous ? 'Anonymous' : (c.submitter?.fullName ?? '—')}  |  Manager: ${c.assignments?.[0]?.manager?.fullName ?? 'Unassigned'}`)
      .text(`Created: ${new Date(c.createdAt).toLocaleDateString()}${c.resolvedAt ? '  |  Resolved: ' + new Date(c.resolvedAt).toLocaleDateString() : ''}`);
    doc.moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).strokeColor('#e5e7eb').stroke();
  });

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = { getCasesForExport, generateCSV, generatePDF };
