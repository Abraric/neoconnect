# NeoConnect — Backend API

Node.js + Express REST API for the NeoConnect staff feedback and complaint management platform.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18 | HTTP framework |
| PostgreSQL | 15 | Users, cases, polls, assignments |
| Prisma | 5.10 | ORM for PostgreSQL |
| MongoDB | 7 | Logs, comments, snapshots |
| Mongoose | 8.2 | ODM for MongoDB |
| Redis (Upstash) | serverless | BullMQ queue storage |
| BullMQ | 5.4 | Background job workers |
| Socket.io | 4.7 | Real-time notifications |
| JWT + bcryptjs | 9.0 / 2.4 | Auth and password hashing |
| Multer | 1.4 lts | File uploads |
| Joi | 17.12 | Request validation |
| Winston | 3.12 | Logging |
| Helmet | 7.1 | HTTP security headers |

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma           # PostgreSQL schema (12 models)
├── src/
│   ├── app.js                  # Express app configuration
│   ├── server.js               # Entry point
│   ├── socket.js               # Socket.io setup
│   ├── config/                 # DB and Redis connection configs
│   ├── constants/              # Roles, statuses, queue names
│   ├── controllers/            # Request handlers (9)
│   ├── domain/case/            # Case lifecycle, permissions, rules
│   ├── middleware/             # Auth, RBAC, validation, upload, rate limit
│   ├── models/
│   │   ├── auditLog.model.js
│   │   └── mongo/              # Mongoose schemas (12 collections)
│   ├── queues/                 # BullMQ queue definitions
│   ├── repositories/           # Data access layer (9 repos)
│   ├── routes/                 # Express route files (11)
│   ├── seeds/                  # Database seed scripts
│   ├── services/               # Business logic services
│   ├── utils/                  # Logger, pagination, tracking ID generator
│   ├── validators/             # Joi validation schemas
│   └── workers/                # Background workers (escalation, analytics, hotspot)
├── uploads/                    # Multer file storage (ephemeral on Render free tier)
└── package.json
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in this directory:

```env
PORT=5000
NODE_ENV=development

POSTGRES_URL=postgresql://user:password@localhost:5432/NeoConnect
MONGODB_URI=mongodb://localhost:27017/NeoConnect
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
```

### 3. Set up the database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (development)
npx prisma migrate dev

# Or push schema directly (no migration history)
npx prisma db push

# Seed initial users and departments
npm run db:seed
npm run db:seed:data
```

### 4. Start the server

```bash
npm run dev       # Development with nodemon (port 5000)
npm start         # Production
```

### 5. Run background workers (separate terminals)

```bash
npm run worker:escalation   # Auto-escalates overdue cases
npm run worker:analytics    # Generates analytics snapshots
npm run worker:hotspot      # Detects department hotspots
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Production start |
| `npm test` | Run Jest tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Prettier format |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed` | Seed departments and users |
| `npm run db:seed:data` | Seed sample case data |

## API Base URL

- Development: `http://localhost:5000/api`
- Production: `https://neoconnect-api-ghz4.onrender.com/api`

## Health Check

```
GET /health
→ { "status": "ok", "timestamp": "..." }
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

Access tokens expire in 15 minutes. The frontend automatically refreshes them using the HTTP-only refresh token cookie.

## Database Models

### PostgreSQL (via Prisma)
`User`, `Department`, `Case`, `CaseAssignment`, `CaseStatusLog`, `Poll`, `PollOption`, `Vote`, `Notification`, `ImpactRecord`, `MeetingMinute`, `OutboxEvent`

### MongoDB (via Mongoose)
`CaseComment`, `CaseInternalNote`, `CaseLog`, `CaseReminder`, `CaseRating`, `Attachment`, `EscalationRule`, `SlaTarget`, `Announcement`, `AnalyticsSnapshot`, `RoleChangeLog`, `SystemLog`

## Deployment (Render)

- **Root Directory:** `neo-connect/backend`
- **Build Command:** `npm install && npx prisma generate`
- **Start Command:** `node src/server.js`
- Add all `.env` variables in Render → Environment tab
