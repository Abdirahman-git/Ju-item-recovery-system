# Nidaamka Hubinta Ardayda (OTP & Master List)

Dukumentigan wuxuu sharraxayaa **sida app-ku hadda u shaqeeyo** — ma aha qorshe mustaqbal. Ujeedadu waa in kaliya ardayda Jazeera University ay isticmaalaan app-ka, iyadoo la isticmaalayo Email OTP (Nodemailer + Gmail).

---

## 1. Kaydka Ardayda (`student_directory`)

Table-ka Supabase `student_directory` waa liiska rasmiga ah ee ardayda.

| Column | Macnaha |
|--------|---------|
| `student_id` | Aqoonsiga ardayga (Primary Key) — tusaale: `CS1300661` |
| `full_name` | Magaca saddexan |
| `phone_number` | Lambarka taleefanka |
| `faculty` | Kuliyadda |
| `email` | **Email hore loo diiwaangeliyay** — OTP halkan ayaa loo diraa |
| `status` | `pending` (cusub) ama `activated` (marka account la furo) |

**Seed:** `Frontend/seed-directory.js` — ardayda tijaabada.

---

## 2. Activation Flow (Hadda App-ka)

Bogga: `Frontend/app/(auth)/register.jsx`  
Route: `/(auth)/register`  
Login screen wuxuu ku xidhayaa: **"Don't have an account? Sign Up"**

> **Ogolaansho:** Wali ma lahan cinwaanka "Activate Account" — waa isla bogga **Register / Sign Up**.

### Tallaabooyinka (3 steps UI)

```
Step 1 ──► Step 2 ──► Step 3
  ID         OTP       Password
```

#### Step 1 — Student ID Lookup
1. Ardaygu wuxuu qoraa **Student ID**
2. App-ku wuxuu ka raadiyaa `student_directory` (Supabase toos ah)
3. Hubinta:
   - ID ma jiro → qalad
   - `status === 'activated'` → "Already activated, login instead"
   - `email` ma jiro directory-ka → "Contact Admin"
4. Haddii sax → OTP **si toos ah** ayaa loo diraa email-ka **`student_directory.email`**
5. API: `POST /api/send-otp` — frontend wuxuu diraa `{ studentId }` kaliya; email wuxuu ka yimaadaa `student_directory` gudaha app-ka

#### Step 2 — OTP Verification
1. Ardaygu wuxuu qoraa **6-digit OTP** ee email-ka ku yimid
2. API: `POST /api/verify-otp` — `{ email, otp }`
3. OTP wuxuu dhacaa **5 daqiiqo** kadib
4. **Resend:** badhanka "Resend Activation Code" → mar labaad `send-otp`

#### Step 3 — Set Password
1. Ardaygu wuxuu sameeyaa **Password** + **Confirm** (ugu yaraan 6 xaraf)
2. API: `POST /api/activate-account` — `{ studentId, email, password, name, phone }`
3. Backend wuxuu:
   - Ku darayaa `users` table (role: `user`)
   - Beddelaa `student_directory.status` → `activated`
4. Kadib → redirect **Login**

---

## 3. Login (Kadib Activation)

Bogga: `Frontend/app/(auth)/login.jsx`

| Field | Waxa la isticmaalo |
|-------|-------------------|
| Identifier | `student_id` |
| Password | Password-ka la sameeyay activation-ka |

Session waxaa lagu keydiyaa `AsyncStorage` → `userSession`.

---

## 4. Backend (`Backend/server.js`)

Server: `http://0.0.0.0:5000` (telefoonka iyo laptop isku WiFi)

| Endpoint | Method | Waxa sameeya |
|----------|--------|--------------|
| `/api/health` | GET | Hubi in backend socdo |
| `/api/validate-id` | POST | Hubi Student ID (frontend ma isticmaalo toos — wuxuu isticmaalaa Supabase) |
| `/api/send-otp` | POST | Abuur OTP 6-digit, dir email (Nodemailer) |
| `/api/verify-otp` | POST | Hubi OTP + waqtiga |
| `/api/activate-account` | POST | Abuur `users` row + `activated` status |

### OTP kaydinta
- **In-memory** (`otpStore`) — ma aha database
- Key: `email` → `{ otp, expiresAt, studentId, verified }`
- Server restart → OTP-yadii hore way baxaan

### Email (Nodemailer + Gmail)
`.env` Backend:
```
GMAIL_USER=...
GMAIL_PASS=...    # App Password
SUPABASE_URL=...
SUPABASE_KEY=...
PORT=5000
```

Frontend API URL: `Frontend/src/config/api.js` → `BACKEND_URL`

---

## 5. Waxa aan ka duwanayn qorshihii hore

| Qorshihii hore (OTP.md) | Hadda app-ka |
|-------------------------|--------------|
| Ardaygu wuxuu qoraa email-kiisa (Gmail/Outlook) | **Maya** — email waa kan `student_directory.email` |
| 4 tallaabo (ID → Email → OTP → Password) | **3 tallaabo** UI (ID+OTP dirid → OTP → Password) |
| "Activate Account" cinwaan | Wali **"Sign Up" / Register** |
| Ardaygu dooranayo email | Admin/seed ayaa email ku qoray directory |

---

## 6. Shuruudaha si OTP u shaqeeyo

1. **Backend socda:** `cd Backend && npm start`
2. **Gmail .env** sax ah
3. **student_directory** — arday `pending` + `email` leh
4. **Telefoon iyo laptop** isku WiFi (`BACKEND_URL` IP sax ah)
5. Ardaygu wuxuu eegaa **email-ka directory-ka** (ma aha email uu isagu doorto)

---

## 7. Faylasha muhiimka ah

| Fayl | Ujeedo |
|------|--------|
| `Frontend/app/(auth)/register.jsx` | Activation wizard (3 steps) |
| `Frontend/app/(auth)/login.jsx` | Login |
| `Backend/server.js` | OTP + activation APIs |
| `Frontend/seed-directory.js` | Seed ardayda |
| `Frontend/src/config/api.js` | Backend URL |

---

## 8. Ogolaansho farsamo (Backend vs Frontend)

Backend `POST /api/send-otp` wuxuu **sugayaa** `{ studentId, email }` labadaba.  
Frontend `register.jsx` wuxuu diraa **`studentId` kaliya** — email-ku waa kan directory-ka ee app-ku hore u akhriyay.

Haddii OTP-ku fail-garo ("valid email required"), waa in frontend-ka la cusboonaysiiyo si uu `email` ugu daro body-ga `send-otp`.

---

*Dukumentigan wuxuu ku saleysan yahay code-ka hadda jira. Kaliya `OTP.md` ayaa la cusboonaysiiyay — OTP code lama beddelin.*
