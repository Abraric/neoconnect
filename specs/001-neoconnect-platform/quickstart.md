# Quickstart: NeoConnect Platform

**Branch**: `001-neoconnect-platform` | **Date**: 2026-03-15

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 15+ (local) | Running on port 5432 |
| MongoDB | 6+ (local) | Running on port 27017 |
| Redis | Upstash (TLS) | Connection URL available |

---

## Project Structure

```
neo-connect/
├── backend/          # Express.js API server
├── frontend/         # Next.js 14 application
└── scripts/          # Seed scripts
```

---

## 1. Clone and Navigate

```bash
cd c:/Users/abrar/OneDrive/Desktop/Neostat
mkdir neo-connect && cd neo-connect
```

---

## 2. Backend Setup

```bash
cd backend
npm install
```

### Create `.env`

Copy `.env.example` to `.env` and fill in:

```env
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL (Prisma)
DATABASE_URL=postgresql://postgres:Abrar.C@20@localhost:5432/NeoConnect

# MongoDB (Mongoose)
MONGODB_URI=mongodb://localhost:27017/NeoConnect

# Redis (Upstash — use your new URL after password reset)
REDIS_URL=rediss://default:<password>@secure-leopard-72310.upstash.io:6379

# JWT
JWT_SECRET=<generate-32-char-random-string>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10

# CORS
FRONTEND_URL=http://localhost:3000
```

### Run Prisma migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Seed database

```bash
node scripts/seedDepartments.js
node scripts/seedUsers.js
```

### Start backend

```bash
npm run dev
# Server starts at http://localhost:5000
```

---

## 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### Create `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Start frontend

```bash
npm run dev
# App starts at http://localhost:3000
```

---

## 4. Seed User Credentials

After running the seed scripts, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@neoconnect.com | Admin@123 |
| Secretariat | secretariat@neoconnect.com | Secret@123 |
| Case Manager | manager@neoconnect.com | Manager@123 |
| Staff | staff@neoconnect.com | Staff@123 |

---

## 5. Verify Everything Works

1. Open `http://localhost:3000` — should see login page
2. Login with staff credentials — should reach dashboard
3. Submit a test case — should receive tracking ID `NEO-2026-001`
4. Login as Secretariat — should see case in inbox
5. Assign case to Case Manager
6. Login as Case Manager — should see assigned case

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED 5432` | Start PostgreSQL service |
| `ECONNREFUSED 27017` | Start MongoDB service |
| `Redis connection failed` | Check REDIS_URL in .env — ensure `rediss://` (double s for TLS) |
| `prisma: relation does not exist` | Run `npx prisma migrate dev` |
| `JWT_SECRET not set` | Add JWT_SECRET to .env |
| `CORS error in browser` | Confirm FRONTEND_URL in backend .env matches frontend port |

---

## Background Workers

Workers run separately from the Express server:

```bash
cd backend
npm run worker:escalation   # 7-day escalation job processor
npm run worker:analytics    # Analytics snapshot generator
npm run worker:hotspot      # Hotspot detection processor
```

In development, workers can run in the same process via `npm run dev:all` (uses concurrently).
