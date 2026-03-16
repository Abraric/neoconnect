const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const { generalLimiter } = require('./middleware/rateLimit.middleware');
const { errorMiddleware } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const caseRoutes = require('./routes/case.routes');
const pollRoutes = require('./routes/poll.routes');
const publicRoutes = require('./routes/public.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const departmentRoutes = require('./routes/department.routes');
const usersRoutes = require('./routes/users.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const announcementRoutes = require('./routes/announcement.routes');
const slaRoutes = require('./routes/sla.routes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(generalLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/sla', slaRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorMiddleware);

module.exports = app;
