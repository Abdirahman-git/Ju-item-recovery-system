# JU LOFO — Supabase Security Fix

## Why Supabase emailed you

| Advisor issue | Meaning |
|---------------|---------|
| **RLS Disabled in Public** | Tables were open: anyone with your anon key could read/edit/delete. |
| **Policy Exists RLS Disabled** | Policies existed but were **off** (useless). |
| **Sensitive columns exposed** | Tables like `users` (passwords) were reachable without RLS. |
| **Security Definer View** | `found_items_public_feed` ran with owner privileges. |
| **RLS Policy Always True** | Policies use `USING (true)` — RLS is on but very open. |
| **RLS Enabled No Policy** (Info) | Table has RLS on and **no** anon policies — clients blocked; Backend `service_role` / `sb_secret_` only. Expected for recycle/archive after Phase 3A. |

Your old script `fix_all_app_table_permissions.sql` **disabled RLS** so the app would work. That caused these alerts.

## Phase 1 — RLS lockdown (required)

Run in **Supabase → SQL Editor**:

**[`secure_rls_lockdown.sql`](./secure_rls_lockdown.sql)**

Enables RLS, client-compatible policies, directory read-only, public feed views.

**Never run** `fix_all_app_table_permissions.sql` again on production.

## Phase 2 — Hide passwords from anon

### Code (in repo)

| Piece | Location |
|-------|----------|
| Login API | `POST /api/auth/login` |
| Change password API | `POST /api/auth/change-password` |
| Web + Mobile login / change password | Backend |

Web env:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### SQL (after Backend login works)

**[`phase2_hide_user_passwords.sql`](./phase2_hide_user_passwords.sql)**

## Phase 3A — Harden admin tables (users writes + recycle + archive)

Moves the highest-risk **admin mutations** to Backend with an `adminToken` issued at login.

### Code (in repo)

| Piece | Location |
|-------|----------|
| Admin token on login | `Backend/server.js` — session.adminToken |
| User approve / delete | `POST /api/admin/users/*` |
| Recycle bin | `GET/POST /api/admin/recycle-bin*` |
| Archive | `GET/POST /api/admin/archived*` / `archive-item` |
| Delete item → recycle | `POST /api/admin/items/delete-to-recycle` |
| Web + Mobile admin screens | send `X-Admin-Token` |

### SQL (after admin APIs work — re-login first)

**[`phase3a_harden_admin_tables.sql`](./phase3a_harden_admin_tables.sql)**

| Table | Anon after SQL |
|-------|----------------|
| `users` | SELECT only |
| `admin_recycle_bin` | No access |
| `archived_items` | No access |

### Smoke test

1. Restart Backend; **log out and log in** as admin (new `adminToken`)
2. Web: approve / suspend / delete user
3. Web: recycle restore / purge
4. Web: archive / restore / purge
5. Mobile admin: approve / delete user
6. Run Phase 3A SQL → repeat 2–5

## Backend keys (required)

`Backend/.env` → `SUPABASE_KEY` must be a **server secret**:

- Preferred: `sb_secret_...` (Supabase → Settings → API Keys → **Secret keys**)
- Or legacy: `service_role` JWT (Legacy API Keys tab)

**Never** use `anon` JWT or `sb_publishable_...` as `SUPABASE_KEY`.

Mobile/Web clients use only:

- `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon or publishable)
- Never `sb_secret_` in any client bundle

### If delete/archive says “permission denied”

1. Fix `Backend/.env` `SUPABASE_KEY` to `sb_secret_` or service_role
2. Restart Backend
3. Web: logout → login → retry

### If a secret was pasted in chat / Discord / email

1. Supabase → API Keys → create a **new** secret key
2. Put the new value in `Backend/.env` only
3. Disable/delete the old secret
4. Restart Backend

## Client env files (gitignored)

| App | File | Vars |
|-----|------|------|
| Backend | `Backend/.env` | `SUPABASE_URL`, `SUPABASE_KEY` (secret) |
| Mobile | `Frontend/.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Web | `Web/.env.local` | `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_BACKEND_URL` |

Copy from `*.env.example` where provided. Never commit real `.env` files.

## Honest security levels

| Level | After Phase 1 | Phase 2 | Phase 3A + secret Backend |
|-------|---------------|---------|---------------------------|
| RLS ON (critical errors) | Fixed | Fixed | Fixed |
| Anon read `users.password` | Open | **Blocked** | Blocked |
| Anon mutate users / recycle / archive | Open | Open | **Blocked** |
| Anon mutate items / claims | Open | Open | Still open |
| Passwords hashed (bcrypt) | No | No | No — later |
| Hardcoded mobile anon in source | Yes | Yes | **Moved to `.env`** |

### Remaining Advisor warnings (expected)

`lost_items` / `found_items` / `item_claims` / notifications may still show **RLS Policy Always True**. Open until a later pass routes those writes through Backend or uses Supabase Auth JWT.

Info **RLS Enabled No Policy** on `admin_recycle_bin` / `archived_items` is **intentional** after Phase 3A.

## Later (not this pass)

1. Route item + claim writes through Backend (or Supabase Auth JWT + tight RLS)
2. Hash passwords (bcrypt/argon2)
3. Rotate anon/publishable if it was ever committed publicly
