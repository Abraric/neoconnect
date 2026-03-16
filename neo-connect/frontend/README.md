# NeoConnect — Frontend

Next.js 14 web application for the NeoConnect staff feedback and complaint management platform.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.1 | React framework (App Router) |
| React | 18.2 | UI library |
| TypeScript | 5.4 | Static typing |
| Tailwind CSS | 3.4 | Utility-first styling |
| shadcn/ui | latest | 22 accessible UI components (Radix UI) |
| Zustand | 4.5 | Global state management |
| Axios | 1.6 | HTTP client with interceptors |
| Socket.io-client | 4.7 | Real-time notifications |
| Recharts | 2.12 | Charts and sparklines |
| Lucide React | 0.344 | Icons |
| jose | 5.2 | JWT verification in edge middleware |

## Project Structure

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Root redirect → /dashboard
│   │   ├── login/                  # Login + OTP page
│   │   ├── dashboard/              # Main dashboard
│   │   ├── cases/                  # Case list + detail ([caseId])
│   │   ├── submit-case/            # Case submission form
│   │   ├── analytics/              # Analytics dashboard
│   │   ├── admin/                  # Admin panel (users, depts, system)
│   │   ├── workload/               # Case manager workload
│   │   ├── polls/                  # Polls list and voting
│   │   ├── public-hub/             # Impact records, digest, minutes
│   │   ├── notifications/          # Notification centre
│   │   ├── announcements/          # Announcements feed
│   │   ├── sla-settings/           # SLA configuration
│   │   ├── audit-log/              # Audit log viewer
│   │   └── system-health/          # Live system health (Admin only)
│   ├── components/
│   │   ├── AppShell.tsx            # Main layout wrapper (Navbar + Sidebar)
│   │   ├── AuthProvider.tsx        # Auth context provider
│   │   ├── ThemeProvider.tsx       # Dark/light mode provider
│   │   ├── Navbar.tsx              # Top navigation bar
│   │   ├── Sidebar.tsx             # Left navigation sidebar
│   │   ├── CaseCard.tsx            # Case summary card component
│   │   ├── CaseProgressStepper.tsx # Case lifecycle stepper
│   │   ├── CaseTimeline.tsx        # Case event timeline
│   │   ├── DashboardCharts.tsx     # Analytics chart components
│   │   ├── DepartmentHeatmap.tsx   # Dept heatmap component
│   │   ├── PollCard.tsx            # Poll display with vote bars
│   │   └── ui/                     # 22 shadcn/ui components
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth state + helpers (hasRole, isAuthenticated)
│   │   └── useSocket.ts            # Socket.io client hook
│   ├── services/
│   │   ├── api.ts                  # Axios instance with token refresh interceptor
│   │   ├── auth.service.ts
│   │   ├── case.service.ts
│   │   ├── analytics.service.ts
│   │   ├── department.service.ts
│   │   └── poll.service.ts
│   ├── store/
│   │   └── auth.store.ts           # Zustand: user, accessToken, setAuth, clearAuth
│   ├── types/                      # TypeScript interfaces
│   ├── utils/                      # Helpers: formatDate, constants, resolutionEstimate
│   ├── lib/
│   │   └── utils.ts                # cn() utility (clsx + tailwind-merge)
│   └── globals.css                 # Tailwind base + custom CSS variables + utilities
├── middleware.ts                   # Next.js edge middleware (JWT auth + redirects)
├── next.config.js                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── components.json                 # shadcn/ui configuration
└── package.json
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in this directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Start the development server

```bash
npm run dev       # Starts on http://localhost:3000
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm start` | Serve production build |
| `npm run lint` | ESLint check |
| `npm test` | Run Jest component tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |

## Pages by Role

| Page | Staff | Case Manager | Secretariat | Admin |
|------|-------|-------------|-------------|-------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Submit Case | ✓ | — | — | — |
| Cases | Own only | Assigned | All | All |
| My Workload | — | ✓ | — | — |
| Polls | ✓ | ✓ | ✓ | ✓ |
| Public Hub | ✓ | ✓ | ✓ | ✓ |
| Analytics | — | ✓ | ✓ | ✓ |
| Announcements | ✓ | ✓ | ✓ | ✓ |
| SLA Settings | — | — | ✓ | ✓ |
| Admin Panel | — | — | — | ✓ |
| Audit Log | — | — | — | ✓ |
| System Health | — | — | — | ✓ |

## Key Design Decisions

- **No localStorage for tokens** — access token lives in Zustand (memory only); refresh token in HTTP-only cookie
- **Edge middleware** — JWT verified at the edge before any page renders, enabling instant redirects
- **Recharts with `next/dynamic`** — loaded client-side only (`ssr: false`) to prevent hydration errors
- **Time-based rendering in `useEffect`** — greetings and clocks computed client-side only to avoid SSR/client mismatch
- **Custom CSS variables** — full dark mode support via Tailwind CSS variable overrides in `globals.css`

## Deployment (Vercel)

- **Root Directory:** `neo-connect/frontend`
- **Framework:** Next.js (auto-detected)
- **Build Command:** `next build`
- Add environment variables in Vercel → Settings → Environment Variables:
  - `NEXT_PUBLIC_API_URL` → `https://neoconnect-api-ghz4.onrender.com/api`
  - `NEXT_PUBLIC_SOCKET_URL` → `https://neoconnect-api-ghz4.onrender.com`
