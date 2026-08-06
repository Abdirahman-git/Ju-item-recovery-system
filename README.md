# JU Item Recovery System (LOFO)

Lost and Found platform for **Jazeera University**. Students report lost or found items on campus; administrators review listings, verify ownership claims, and manage returns.

The repo has three apps plus Supabase:

| Part | Folder | Role |
|------|--------|------|
| **Mobile** | `Frontend/` | Expo (React Native) — students + mobile admin |
| **Web** | `Web/` | Next.js — public landing/browse + admin console |
| **API** | `Backend/` | Express — login, OTP SMS, password reset, admin-sensitive ops |
| **Database** | `supabase/` | PostgreSQL schema + RLS security SQL |

---

## How it works

1. **Report** — Student (or admin) submits lost/found in the mobile app or admin Web console.
2. **Staff checks** — Admins review pending reports; only approved items go **live**.
3. **Recover** — Approved items appear on the public Web feed and in the app. Owners claim through the app; staff confirm and mark returned.

Public Web landing sorts by **latest approved** (`approved_at`), not just created date.

---

## Roles

| Role | Can do |
|------|--------|
| **Student** | Activate account (SMS OTP), log in, report items, browse live feed, claim ownership, track requests/notifications |
| **Admin** | Approve/reject reports, manage users, claims, returned items, drafts, secure found holds, recycle/archive (via Backend), system reports |

---

## Tech stack

### Mobile (`Frontend/`)

- React Native `0.81` + Expo `~54` + Expo Router `~6`
- Supabase JS client (anon / publishable key via `.env`)
- Session in AsyncStorage (`userSession`; admins also store `adminToken`)

### Web (`Web/`)

- Next.js `16` + React `19` + Tailwind CSS `4`
- Public site: Home, Browse, About, How it works
- Admin console: dashboard, pending, items, users, claims, returned, drafts, secure found, archive/backup, reports
- Login + sensitive admin actions go through Backend

### Backend (`Backend/`)

- Node.js + Express `4`
- Supabase **server secret** (`sb_secret_...` or legacy `service_role`)
- **Tabaarak SMS** for activation + forgot-password OTP
- Optional Gmail (legacy email path)
- Issues short-lived `adminToken` on admin login for hardened admin APIs

### Infrastructure

- **Supabase** — PostgreSQL + Storage (`item-images`)
- **Custom auth** — passwords in `users` (not Supabase Auth); login via Backend
- **RLS** — see `supabase/SECURITY.md`

---

## Repository structure

```
JU-item-recovry/
├── Frontend/                 # Expo mobile (student + admin)
│   ├── app/(auth)/           # login, register, forgot-password
│   ├── app/(user)/           # dashboard, lost/found, my items, claims, notifications
│   ├── app/(admin)/          # pending, users, items, claims, drafts, secure found, …
│   ├── src/services/         # supabase helpers
│   └── .env.example
├── Web/                      # Next.js public + admin
│   ├── src/app/(public)/     # landing, browse, about, how-it-works
│   ├── src/app/admin/        # admin console pages
│   ├── src/app/login/        # admin web login
│   └── src/lib/              # supabase, publicItems, session, …
├── Backend/
│   ├── server.js             # auth, OTP, claims submit, admin APIs
│   └── .env.example
├── supabase/
│   ├── SECURITY.md           # RLS phases + key rules
│   ├── secure_rls_lockdown.sql
│   ├── phase2_hide_user_passwords.sql
│   ├── phase3a_harden_admin_tables.sql
│   ├── phase3b_latest_approved_sorting.sql
│   └── …other schema / feature SQL
└── README.md
```

---

## Main data tables

| Table | Purpose |
|-------|---------|
| `student_directory` | Official student list (ID, phone for SMS OTP, status) |
| `users` | App accounts (`role`: `user` / `admin`, password, approval) |
| `lost_items` / `found_items` | Listings (`status`, `is_approved`, `approved_at`, optional `listing_mode=secure`) |
| `item_claims` | Direct ownership claims (“this is mine”) |
| `returned_items` | Archive of returned items |
| `admin_recycle_bin` / `archived_items` | Soft-delete / archive (Backend + service role only after Phase 3A) |
| `app_notifications` | In-app feed notifications |

Item lifecycle (simplified): `draft` → `pending_review` → `live` (public) → claim / return / recycle / archive.

---

## Backend API (high level)

| Area | Routes |
|------|--------|
| Health | `GET /api/health` |
| Activation | `POST /api/validate-id`, `/api/send-otp`, `/api/verify-otp`, `/api/activate-account` |
| Forgot password | `POST /api/forgot-password/send-otp`, `verify-otp`, `reset` |
| Auth | `POST /api/auth/login`, `/api/auth/change-password` |
| Claims | `POST /api/claims/submit` |
| Admin (needs `X-Admin-Token`) | users approve/delete, recycle bin, archive, delete-to-recycle |

OTP codes are **in-memory** (lost on Backend restart). Prefer SMS credentials in `.env`; if missing, Backend can simulate SMS in the console for local testing.

---

## Getting started

### Prerequisites

- Node.js 18+
- Supabase project
- Expo Go (or emulator) for mobile
- Tabaarak SMS credentials (production OTP)

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env
```

Fill `Backend/.env`:

```env
PORT=5000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your_sb_secret_or_service_role_here
TABARAAK_SMS_USER=
TABARAAK_SMS_PASSWORD=
```

```bash
npm start
```

Listens on `0.0.0.0:5000` so phones on the same Wi‑Fi can reach it.

### 2. Mobile

```bash
cd Frontend
npm install
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_or_publishable_key_here
```

Point the app at your Backend LAN IP (see `Frontend/src/config/api.js` / your local setup), then:

```bash
npm start
```

### 3. Web

```bash
cd Web
npm install
```

Create `Web/.env.local` (gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_or_publishable_key_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — public site + `/login` for admin.

### 4. Supabase SQL (recommended order)

Run in **Supabase → SQL Editor** as needed:

1. `supabase/secure_rls_lockdown.sql` — Phase 1 RLS
2. `supabase/phase2_hide_user_passwords.sql` — after Backend login works
3. `supabase/phase3a_harden_admin_tables.sql` — after admin APIs work (re-login as admin)
4. `supabase/phase3b_latest_approved_sorting.sql` — `approved_at` for Web “latest approved”
5. Feature scripts as required (`item_status.sql`, `app_notifications.sql`, `secure_found_items.sql`, …)

Full notes: [`supabase/SECURITY.md`](./supabase/SECURITY.md).

---

## Security rules (do not skip)

| Do | Don’t |
|----|--------|
| Keep real `.env` / `.env.local` local only | Commit secrets or `sb_secret_` into mobile/Web |
| Backend uses **secret** / service_role key | Put anon/publishable as `SUPABASE_KEY` |
| Clients use anon / publishable only | Paste Tabaarak passwords into the repo |
| Re-login after Phase 3A (new `adminToken`) | Re-run scripts that disable RLS on production |

Still open / later: hash passwords (bcrypt), tighten item/claim RLS further, rotate any key that was ever shared publicly.

---

## Color palette

Primary brand blue used across mobile + Web:

| Token | Value |
|-------|-------|
| Primary | `#1A56DB` |
| Primary dark | `#1E40AF` |
| Text | `#0F172A` |
| Background | `#F8FAFC` |

---

## License

Private project for Jazeera University — Lost & Found (LOFO).
