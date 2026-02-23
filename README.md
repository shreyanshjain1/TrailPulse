# TrailPulse (Next.js + TypeScript)

Trail discovery + hike planning with Google OAuth, Google Calendar event creation, and BullMQ background jobs for weather sync + weekly digest notifications.

## Tech
- Next.js (App Router) + TypeScript
- Auth.js / NextAuth v5 (Google OAuth)
- Prisma ORM + PostgreSQL
- Redis + BullMQ (worker + repeatable jobs)
- Tailwind + shadcn/ui-style components
- Zod validation (server-side)
- Layered security: object-level authz, rate limits, security headers, audit logs

---

## 1) Prereqs
- Node.js 18+ (Node 20+ recommended)
- pnpm (recommended) or npm/yarn
- Docker Desktop (for Postgres + Redis)
- Google Cloud project with OAuth credentials

---

## 2) Create Google OAuth credentials
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create **OAuth Client ID** (Application type: Web application)
3. Add **Authorized JavaScript origins**:
   - `http://localhost:3000`
4. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
5. Save `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

**Scopes used**
- `openid email profile`
- `https://www.googleapis.com/auth/calendar.events` (for creating calendar events)

---

## 3) Configure env vars
```bash
cp .env.example .env
```

Fill:
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- (optional) `ADMIN_EMAILS=your.email@domain.com`

---

## 4) Start Postgres + Redis
```bash
docker compose up -d
```

---

## 5) Install deps
```bash
pnpm i
```

---

## 6) Prisma migrate + seed (30+ trails)
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

---

## 7) Run web + worker (2 terminals)
Terminal A:
```bash
pnpm dev
```

Terminal B:
```bash
pnpm worker:dev
```

Or run both together:
```bash
pnpm all:dev
```

Open:
- Web app: `http://localhost:3000`
- Sign in: `/signin`
- Trails: `/trails`
- Jobs Admin (ADMIN only): `/jobs-admin`

---

## 8) What the jobs do
### weatherSync (repeatable)
- Runs every `WEATHER_SYNC_EVERY_HOURS`
- Finds trails that any user saved or planned recently
- Fetches conditions (Open-Meteo) and stores snapshots in `WeatherSnapshot`

### digest (repeatable)
- Runs daily at `DIGEST_HOUR_LOCAL` (Asia/Manila)
- Creates a personalized "Weekly trail picks" notification for each user with some activity

---

## 9) Security notes (what’s implemented)
- **Server-side validation**: Zod on every write endpoint
- **Object-level authorization**: users can only access their own plans/notifications; enforced server-side
- **Session strategy**: database sessions (HttpOnly cookies by Auth.js / NextAuth)
- **CSRF**: Auth.js default protections for auth routes + same-site cookies
- **Rate limiting** (Redis sliding-window):
  - `/api/plans` (plan creation)
  - `/api/trails/save`
  - `/api/calendar/create`
  - `/api/notifications/read`
  - `/api/jobs/retry` (admin)
- **Safe output**: no secrets returned; JSON responses are minimal
- **Security headers** (middleware):
  - CSP starter
  - nosniff
  - frame-ancestors none / DENY
  - referrer-policy
  - basic permissions policy

---

## 10) Verification checklist
### Cookie flags / session behavior
- Sign in with Google.
- In DevTools → Application → Cookies:
  - Ensure session cookies are **HttpOnly**
  - `SameSite` should be **Lax**
  - `Secure` should be enabled in production HTTPS

### Authz denial tests
- Open a plan URL that isn’t yours:
  - `/plans/{someOtherPlanId}` should return 404
- Try to call calendar creation with someone else’s planId:
  - `POST /api/calendar/create` should return **403**

### Rate limiting checks
- Spam `POST /api/plans` quickly (10+ in a minute):
  - Expect **429 Too many requests**
- Spam calendar creation:
  - Expect **429**

### Headers verification
- In DevTools → Network:
  - Check any page response headers include:
    - `Content-Security-Policy`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy`

### Jobs Admin checks
- Add your email to `ADMIN_EMAILS`, sign out, sign in again.
- Visit `/jobs-admin`.
- Observe:
  - Queue counts (waiting/active/failed/completed)
  - Recent runs (from DB)
  - Retry button appears on failed runs

---

## 11) Optional: tests
```bash
pnpm test
```

---

## Repo structure (high level)
- `app/` Next.js App Router pages + API route handlers
- `src/server/` Prisma/Redis/authz/rate-limit + Google Calendar integration
- `src/worker/` BullMQ worker + repeatable jobs
- `prisma/` schema, migrations, seed
- `docker-compose.yml` Postgres + Redis

