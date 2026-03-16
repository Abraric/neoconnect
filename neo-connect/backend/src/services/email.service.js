const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST) {
    return null; // Email disabled
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

async function sendStatusUpdateEmail({ toEmail, toName, trackingId, newStatus, note, caseUrl }) {
  const t = getTransporter();
  if (!t) {
    logger.info(`[EMAIL DISABLED] Would send status update to ${toEmail}: ${trackingId} → ${newStatus}`);
    return;
  }

  const statusLabel = newStatus.replace('_', ' ');
  const noteHtml = note ? `<p><strong>Note:</strong> ${note}</p>` : '';

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || `"NeoConnect" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[NeoConnect] Case ${trackingId} status updated to ${statusLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #2563eb;">NeoConnect — Case Update</h2>
          <p>Hello ${toName},</p>
          <p>Your case <strong>${trackingId}</strong> has been updated.</p>
          <p><strong>New Status:</strong> ${statusLabel}</p>
          ${noteHtml}
          <p><a href="${caseUrl}" style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Case</a></p>
          <p style="color: #6b7280; font-size: 12px;">NeoConnect — Staff Feedback Platform</p>
        </div>
      `,
    });
    logger.info(`Status update email sent to ${toEmail} for case ${trackingId}`);
  } catch (err) {
    logger.error(`Failed to send email to ${toEmail}: ${err.message}`);
  }
}

module.exports = { sendStatusUpdateEmail };
