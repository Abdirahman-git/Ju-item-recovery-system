# Qorshaha Hirgelinta Web App-ka (Next.js Plan)

Dukumentigan wuxuu sharraxayaa sida LOFO looga dhigi karo **web + mobile** iyadoo app-ka mobile-ka ah (**Frontend/**) aan la burburin.

---

## 1. Go'aanka La Isku Afgartay

| Go'aan | Faahfaahin |
|--------|------------|
| **Mobile app-ka ha taabanno** | `Frontend/` (Expo) wuu sii socdaa sida hadda |
| **Web cusub la sameeyo** | Folder cusub: `Web/` — Next.js |
| **Hal database + hal backend** | Isla Supabase iyo isla `Backend/` (OTP API) |
| **Expo Web (`w`) ma aha xalka** | Demo kaliya — ma aha web rasmi ah oo fiican |

**Hal jumlad:** Laba client (Mobile + Web), hal qalbi (Supabase + Backend).

---

## 2. Sababta Expo Web Aan Loo Dooran

| Arrin | Expo Web (`npx expo start` → `w`) | Next.js Web App |
|-------|-----------------------------------|-----------------|
| UI | Mobile UI browser-ka ku yaal | UI web u gaar ah (desktop + mobile browser) |
| Navigation | Drawer + bottom tab | Sidebar / top nav |
| Sawir | ImagePicker — dhibaato web | File input / drag & drop |
| Wicitaan | `tel:` / `sms:` — mobile kaliya | Email, copy phone, link |
| Admin desktop | Ma fiicna | Tables, filters, dashboard fiican |
| Natijo | Tijaabo degdeg ah | Web rasmi ah ardayda & admin |

---

## 3. Qaab-dhismeedka (Architecture)

```
┌─────────────────────┐     ┌─────────────────────┐
│   Frontend/         │     │   Web/              │
│   React Native      │     │   Next.js           │
│   (Expo — Mobile)   │     │   (Browser)         │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └─────────────┬─────────────┘
                         ▼
              ┌──────────────────────┐
              │      Supabase        │
              │  users               │
              │  student_directory   │
              │  lost_items          │
              │  found_items         │
              │  (+ storage)         │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │   Backend/           │
              │   Express + OTP      │
              │   /api/send-otp      │
              │   /api/verify-otp    │
              │   /api/activate-...  │
              └──────────────────────┘
```

**Wax la wadaagaa (shared):**
- Dhammaan tables Supabase
- Backend OTP endpoints
- Auth logic: Student ID + password (custom, ma aha Supabase Auth)
- Nidaamka `is_approved` ee items-ka

**Wax aan la wadaagin:**
- UI components (mobile StyleSheet ≠ web CSS/Tailwind)
- Navigation (drawer/tab ≠ pages/routes)
- Session storage (AsyncStorage mobile | cookies/localStorage web)

---

## 4. Tech Stack — Web

| Layer | Doorasho |
|-------|----------|
| Framework | **Next.js** (App Router) |
| Language | JavaScript ama TypeScript |
| Styling | **Tailwind CSS** |
| Database | `@supabase/supabase-js` (isla project mobile-ka) |
| Auth session | `localStorage` ama HTTP cookies |
| Icons | Lucide / Heroicons |
| Deploy | Vercel (web) + Railway/Render (backend) |

---

## 5. Qaab-dhismeedka Folder-ka `Web/`

```
Web/
├── src/
│   └── app/
│       ├── page.jsx                 # Landing / redirect
│       ├── login/page.jsx           # Student ID + password
│       ├── register/page.jsx        # Activation 3-tallaabo (OTP)
│       ├── dashboard/page.jsx       # Home feed
│       ├── lost/
│       │   ├── page.jsx             # Liiska lost items
│       │   └── report/page.jsx      # Form cusub
│       ├── found/
│       │   ├── page.jsx
│       │   └── report/page.jsx
│       ├── my-items/page.jsx
│       ├── item/[id]/page.jsx       # Faahfaahin item
│       ├── profile/page.jsx
│       └── admin/
│           ├── page.jsx             # Dashboard
│           ├── pending/page.jsx
│           ├── users/page.jsx
│           ├── items/page.jsx
│           └── change-password/page.jsx
├── src/
│   ├── lib/
│   │   └── supabase.js              # Client (la mid mobile helpers)
│   ├── components/                  # Buttons, cards, sidebar, toast
│   └── hooks/                       # useSession, iwm.
├── .env.local                       # Keys (ha commit gareyn)
├── package.json
└── next.config.js
```

---

## 6. Pages & Features (La Mid Mobile)

### Arday (User)

| Page | Waxa ay qabataa |
|------|-----------------|
| `/login` | Student ID + password → session |
| `/register` | 1) ID validate 2) OTP verify 3) Password set |
| `/dashboard` | Items la ansixiyay + quick actions |
| `/lost` | Liis + search |
| `/lost/report` | Form: magac, category, location, sawir, taariikh |
| `/found` | Liis + search |
| `/found/report` | Form found item |
| `/my-items` | Reports-kaaga (approved + pending) |
| `/item/[id]` | Faahfaahin + contact info |
| `/profile` | Macluumaadka ardayga + logout |

### Admin

| Page | Waxa ay qabataa |
|------|-----------------|
| `/admin` | Stats: pending, students, lost, found |
| `/admin/pending` | Approve / reject reports |
| `/admin/users` | Approve, suspend, delete students |
| `/admin/items` | Dhammaan lost & found |
| `/admin/change-password` | Beddel password admin |

---

## 7. Auth Flow (Isku Mid Mobile)

### Login
1. User qoraa **Student ID** + **password**
2. Query `users` table by `student_id`
3. Compare password
4. Save session → redirect admin ama user dashboard

### Activation (Register)
1. **Step 1:** Student ID → hubi `student_directory` (status = `pending`)
2. **Step 2:** OTP u dir email-ka ku xiran ID-ga (`Backend` API) → verify
3. **Step 3:** Set password → `POST /api/activate-account`
4. Redirect → `/login`

> **Xusuusin:** Email-ku ma aha `ID@jazeerauniversity.edu.so` — waa email hore ugu jira `student_directory.email`.

---

## 8. Tallaabooyinka Hirgelinta (Phases)

### Phase 1 — Setup
- [ ] `npx create-next-app@latest Web`
- [ ] Rakib `@supabase/supabase-js`
- [ ] Samee `.env.local` (Supabase URL + key + Backend URL)
- [ ] Copy/adapt helpers from `Frontend/src/services/supabase.js`

### Phase 2 — Auth
- [ ] Login page
- [ ] Register / activation (3 steps + Backend fetch)
- [ ] Session hook (localStorage)
- [ ] Protected routes (middleware ama layout guard)

### Phase 3 — User Features
- [ ] Dashboard + item cards
- [ ] Lost / Found lists + search
- [ ] Report forms + image upload (Supabase Storage)
- [ ] My Items
- [ ] Item detail page

### Phase 4 — Admin
- [ ] Admin layout (sidebar)
- [ ] Pending reports (approve/reject)
- [ ] All users management
- [ ] All items
- [ ] Change password

### Phase 5 — Polish & Deploy
- [ ] Responsive design (mobile browser + desktop)
- [ ] Loading states, error toasts
- [ ] Deploy web → Vercel
- [ ] Deploy backend → Railway/Render
- [ ] Update mobile `BACKEND_URL` → production URL

---

## 9. Sida Loo Run Gareeyo (Local Development)

**3 terminal:**

```bash
# Terminal 1 — Backend (OTP)
cd Backend
npm run dev
# → http://localhost:5000

# Terminal 2 — Web (Next.js)
cd Web
npm run dev
# → http://localhost:3000

# Terminal 3 — Mobile (optional)
cd Frontend
npx expo start
# → a (Android) | i (iOS)
```

### Abuurista Web project (marka hore)

```bash
cd JU-item-recovry
npx create-next-app@latest Web
cd Web
npm install @supabase/supabase-js
npm run dev
```

### `.env.local` (Web/)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

---

## 10. Deploy (Production)

| Qayb | Platform | URL tusaale |
|------|----------|-------------|
| Web | Vercel | `https://lofo.jazeerauniversity.edu.so` |
| Backend | Railway / Render | `https://api-lofo.example.com` |
| Database | Supabase Cloud | (hadda jira) |

**Kadib deploy:**
- Web `.env` → production backend URL
- Mobile `register.jsx` → `BACKEND_URL` production
- Supabase RLS policies hubi (security)

---

## 11. Waxa La Iska Ilaalinayo

- ❌ Ha isku dayin in mobile UI toos browser loo shubo (Expo Web) haddii web rasmi ah la rabo
- ❌ Ha commit gareyn `.env` / Gmail passwords
- ❌ Ha iloobin in items cusub `is_approved: false` yihiin ilaa admin approve gareeyo
- ❌ LAN IP (`192.168.x.x`) production-ka ha isticmaalin

---

## 12. Mustaqbalka (Kadib Web La Dhisayo)

| Feature | Qoraal |
|---------|--------|
| Geofencing | `Map.md` — campus GPS restriction (mobile + web) |
| PWA | Web app "install" phone-ka |
| Password hashing | Mobile + Web + Backend |
| User change password (web) | Implement halkii mobile placeholder-ka |

---

## 13. Koobid

```
Mobile (Frontend/)  →  Ardayda phone-ka     →  Ha beddelin
Web (Web/)          →  Browser desktop/mob  →  Next.js cusub
Backend/            →  OTP email            →  Isku mid
Supabase            →  Database             →  Isku mid
```

**Xalka la isku haleyn karo:** Laba app, hal database, hal backend — web UI u gaar ah, shaqo isku mid ah.

---

*Dukumentigan waa qorshe hirgelin — `Web/` folder weli lama abuurin. Marka la bilaabo, Phase 1 ka bilow.*
