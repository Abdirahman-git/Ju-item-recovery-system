# JU Item Recovery System (LOFO)

Lost and Found mobile application for **Jazeera University**. Students report lost or found items on campus; administrators review reports and manage users.

The project is split into a **React Native (Expo) frontend** and a **Node.js backend** for email OTP account activation. Data is stored in **Supabase** (PostgreSQL + Storage).

---

## Project Overview

| Role | What they can do |
|------|------------------|
| **Student** | Activate account, log in, report lost/found items, browse approved listings, view own reports, contact reporters |
| **Admin** | View dashboard stats, approve/reject item reports, manage student accounts, change admin password |

New item reports start as **`pending_review`** (legacy: `is_approved: false`) and only appear on the public feed after admin approval (**`live`**). Students contact each other via **Call/SMS** on item details. Admins can mark items as returned from the item detail screen.

**Database:** run `supabase/item_status.sql` in the Supabase SQL Editor (optional; legacy `matched` / `claim_pending` rows are shown as **Live** in the app).

---

## Tech Stack

### Frontend (`Frontend/`)

| Layer | Technology |
|-------|------------|
| Framework | React Native `0.81.5` + Expo `^54` |
| UI | React `19.1.0`, StyleSheet, `@expo/vector-icons` |
| Navigation | Expo Router `~6` — Stack + Drawer + custom bottom tab |
| Fonts | Inter & Poppins (`@expo-google-fonts/*`) |
| Database client | `@supabase/supabase-js` |
| Session | `@react-native-async-storage/async-storage` |
| Media | `expo-image-picker`, `expo-file-system` |
| Other | `expo-linear-gradient`, `@react-native-community/datetimepicker`, `react-native-reanimated` |

### Backend (`Backend/`)

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + Express `4` |
| Email OTP | Nodemailer (Gmail) |
| Database | Supabase service client (`@supabase/supabase-js`) |
| Config | `dotenv`, `cors` |

### Infrastructure

- **Supabase** — PostgreSQL tables + optional image storage buckets
- **Custom auth** — passwords stored in the `users` table (not Supabase Auth)
- **Session** — JSON object in AsyncStorage under key `userSession`

---

## Repository Structure

```
JU-item-recovry/
├── Frontend/                    # Expo mobile app
│   ├── app/
│   │   ├── index.jsx            # Splash screen + session redirect
│   │   ├── _layout.jsx          # Root stack layout + font loading
│   │   ├── (auth)/
│   │   │   ├── login.jsx        # Student ID + password login
│   │   │   └── register.jsx     # 3-step account activation (OTP)
│   │   ├── (user)/
│   │   │   ├── DashBoard/       # Home feed + quick actions
│   │   │   ├── Lost/            # Lost items list + report modal
│   │   │   ├── Found/           # Found items list + report modal
│   │   │   ├── MyItems/         # User's own lost & found reports
│   │   │   ├── MyProfile/       # Profile + logout
│   │   │   ├── item/[id].jsx    # Item detail (call / SMS)
│   │   │   ├── Help/
│   │   │   ├── AboutUs/
│   │   │   ├── PrivacyPolicy/
│   │   │   └── ChangePassword/  # Placeholder (not implemented)
│   │   └── (admin)/
│   │       ├── DashBoard/       # Stats overview
│   │       ├── PendingReports/  # Approve or reject new reports
│   │       ├── AllUsers/        # Approve, suspend, delete students
│   │       ├── AllItems/        # All lost & found logs
│   │       ├── MyProfile/
│   │       └── ChangePassword/  # Admin password update
│   ├── src/
│   │   ├── services/supabase.js # Supabase client + CRUD helpers
│   │   ├── components/          # Bottom tab, sidebars, toast, etc.
│   │   └── constants/           # colors.js, categories.js
│   ├── assets/
│   ├── app.json
│   └── package.json
├── Backend/
│   ├── server.js                # Express API (OTP + activation)
│   ├── test-email.js
│   ├── .env                     # Secrets (do not commit)
│   └── package.json
├── OTP.md                       # OTP activation design notes (Somali)
├── Map.md                       # Geofencing plan (not implemented yet)
└── README.md
```

---

## Database Schema (Supabase)

### `student_directory`

Master list of Jazeera University students used during account activation.

| Column | Description |
|--------|-------------|
| `student_id` | Primary key (e.g. `JU-2026-001`) |
| `full_name` | Student full name |
| `phone_number` | Phone number |
| `email` | Pre-registered email for OTP delivery |
| `faculty` | Faculty / department |
| `status` | `pending` → `activated` after registration |

### `users`

App accounts for students and admins.

| Column | Description |
|--------|-------------|
| `student_id` | Student ID (login identifier) |
| `email` | Account email (lowercase) |
| `password` | Plain-text password (custom auth) |
| `name` | Display name |
| `phone` | Phone number |
| `role` | `user` or `admin` |
| `is_approved` | Account access flag (students activated via OTP are set to `true`) |

### `lost_items`

| Column | Description |
|--------|-------------|
| `id` | Auto-generated |
| `itemName`, `category`, `description`, `location` | Item details |
| `dateLost`, `timeLost` | When the item was lost |
| `ownerName`, `phnum`, `email`, `userId` | Reporter info |
| `imageURI` | Photo URL or local URI |
| `is_approved` | `false` until admin approves |
| `created_at` | Timestamp (used for sorting) |

### `found_items`

| Column | Description |
|--------|-------------|
| `id` | Auto-generated |
| `itemName`, `category`, `description`, `location` | Item details |
| `dateFound`, `timeFound` | When the item was found |
| `finderName`, `phnum`, `email`, `finderId` | Reporter info |
| `imageURI` | Photo URL or local URI |
| `is_approved` | `false` until admin approves |
| `created_at` | Timestamp |

---

## Authentication & Activation

### Login (`Frontend/app/(auth)/login.jsx`)

1. User enters **Student ID** and **password**
2. App queries `users` by `student_id`
3. Password is compared directly (no hashing)
4. Session saved to AsyncStorage:

```json
{
  "email": "...",
  "role": "user | admin",
  "isLoggedIn": true,
  "userName": "...",
  "studentId": "...",
  "phone": "..."
}
```

5. Redirect: `admin` → `/(admin)/DashBoard`, `user` → `/(user)/DashBoard`

### Account Activation (`Frontend/app/(auth)/register.jsx`)

Three-step wizard (labeled "Sign Up" in the UI):

| Step | Action |
|------|--------|
| 1 | Enter Student ID → validate against `student_directory` (must be `pending`, must have `email`) |
| 2 | OTP sent to pre-registered email via backend → user enters 6-digit code |
| 3 | Set password → backend creates `users` row and marks directory entry `activated` |

Activation uses the Node.js backend; all other app data operations go through Supabase from the frontend.

### Backend API (`Backend/server.js`)

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/validate-id` | Validate student ID in directory |
| `POST` | `/api/send-otp` | Send 6-digit OTP email (expires in 5 minutes) |
| `POST` | `/api/verify-otp` | Verify OTP code |
| `POST` | `/api/activate-account` | Create user + mark student as activated |

OTP codes are stored in an **in-memory** object on the server (cleared on restart).

---

## User App Features

### Navigation

- **Drawer** — Home, Report Lost, Report Found, My Items, Profile, Help, About, Privacy
- **Custom bottom tab** — Home, Lost, Found, Items, Profile

### Screens

| Screen | Description |
|--------|-------------|
| **Dashboard** | Rotating banners, quick report buttons, 10 most recent approved items |
| **Lost / Found** | Searchable list of approved items; modal form to submit new report |
| **My Items** | User's own lost and found reports (all approval states) |
| **Item Detail** | Full info, photo, call/SMS reporter |
| **My Profile** | Student info from session + `student_directory`, logout |

### Reporting an Item

Required: item name, location. Optional: category, description, photo, date/time.

- Categories include: Electronics, Clothing, Accessories, Books, Documents, Keys, Bags, ID/Cards, Other (UI pills; `categories.js` has additional entries)
- New reports default to `is_approved: false`
- Public lists (`getAllLostItems` / `getAllFoundItems`) only return approved items

---

## Admin App Features

| Screen | Description |
|--------|-------------|
| **Dashboard** | Pending count, student count, lost/found totals, shortcuts |
| **Pending Reports** | Tabbed list of unapproved lost/found items — approve or delete |
| **All Users** | List students — approve/suspend (`is_approved`) or delete |
| **All Items** | Full lost & found archive |
| **My Profile** | Admin stats and profile |
| **Change Password** | Update password in `users` table |

---

## Color Palette

Defined in `Frontend/src/constants/colors.js`:

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1A56DB` | Buttons, links, accents |
| Primary Dark | `#1E40AF` | Headers, active states |
| Success | `#10B981` | Found items |
| Error | `#EF4444` | Lost items, errors |
| Warning | `#F59E0B` | Pending states |
| Background | `#F8FAFC` | App background |
| Text | `#0F172A` | Primary text |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app (physical device) or Android/iOS emulator
- Supabase project with tables above
- Gmail account with App Password (for OTP emails)

### 1. Backend

```bash
cd Backend
npm install
```

Create `Backend/.env`:

```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_or_service_key
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_gmail_app_password
```

```bash
npm run dev
```

Server runs at `http://localhost:5000`.

### 2. Frontend

```bash
cd Frontend
npm install
```

Update Supabase credentials in `Frontend/src/services/supabase.js` if needed.

Update the backend URL in `Frontend/src/config/api.js` if needed — it auto-detects your Metro LAN IP for physical devices.

Ensure the backend is running before registration OTP:

```bash
cd Backend
npm run dev
```

Use your machine's LAN IP when testing on a physical phone (not `localhost`). The backend now listens on `0.0.0.0` so Expo Go on the same WiFi can reach it.

```bash
npm start
```

Then press `a` (Android), `i` (iOS), or scan the QR code with Expo Go.

### 3. Supabase Setup

Create these tables in your Supabase project and seed `student_directory` with student records (including `email` for OTP).

Automatic item matching and ownership claims are **not used** in the current app build. Old `item_matches` / `item_claims` tables in Supabase can remain unused.

Optionally create storage buckets for item images if you enable `uploadImage()` in `supabase.js`.

---

## Planned / Not Yet Implemented

| Feature | Notes |
|---------|-------|
| **Geofencing** | Documented in `Map.md` — restrict reporting to campus via GPS (`expo-location`) |
| **User change password** | Screen exists at `(user)/ChangePassword` but is empty |
| **Supabase Auth** | App uses custom password auth instead |
| **Password hashing** | Passwords stored as plain text in `users` |
| **Image upload to Supabase Storage** | Helper exists; reports currently use local `imageURI` |

The admin dashboard shows "Geofencing Active" as UI placeholder — geofencing is **not** implemented in code yet.

---

## Security Notes

- Do **not** commit `.env` files or expose Gmail credentials
- Supabase anon key is embedded in the frontend — configure Row Level Security (RLS) policies in Supabase for production
- OTP store is in-memory only; restarting the backend invalidates pending OTPs
- Consider hashing passwords and moving secrets to environment variables on the frontend (`expo-constants` / EAS secrets)

---

## Related Documentation

- [`OTP.md`](./OTP.md) — OTP activation workflow (Somali)
- [`Map.md`](./Map.md) — Geofencing implementation plan (Somali)

---

## License

Private project for Jazeera University — Lost & Found System.
