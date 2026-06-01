# Qorshaha Hirgelinta Nidaamka Hubinta Ardayda (OTP & Master List)

Dukumentigan wuxuu sharraxayaa talaabooyinka loo qaadayo si app-ka looga dhigo mid ay isticmaalaan kaliya ardayda Jazeera University, iyadoo la isticmaalayo Email OTP bilaash ah.

## 1. Kaydka Ardayda (Master List Table)
Tallaabada ugu horreysa waa in Supabase lagu dhex abuuro table la yiraahdo `student_directory`. Table-kan wuxuu ka koobnaan doonaa:
*   **student_id**: Aqoonsiga gaarka ah ee ardayga (Primary Key).
*   **full_name**: Magaca saddexan ee ardayga.
*   **phone_number**: Lambarka taleefanka ardayga.
*   **faculty**: Kuliyadda uu dhigto (tusaale: Engineering, Medicine, iwm).
*   **status**: Waxay noqon doontaa `pending` marka hore, waxayna isu bedeli doontaa `activated` markuu ardaygu is-diiwaangeliyo.

## 2. Nidaamka Activation-ka (Halkii Register-ka)
App-ka waxaa laga saari doonaa bogga is-diiwaangelinta caadiga ah (Register). Waxaa lagu bedeli doonaa bogga **"Activate Account"**.

### Geedi-socodka (Workflow):
1.  **Validation**: Ardaygu wuxuu qorayaa Student ID-giisa. App-ku wuxuu ka raadinayaa `student_directory`.
2.  **Email Input**: Haddii ID-ga la helo, ardayga waxaa la weydiinayaa inuu qoro Email-kiisa gaarka ah (Gmail/Outlook).
3.  **Sending OTP**: Backend-ka (Node.js + Nodemailer) ayaa OTP 6-digit ah u diraya email-kaas.
4.  **Verification**: Ardaygu wuxuu qorayaa code-kii uu email-ka ku helay.
5.  **Set Password**: Haddii code-ku saxmo, ardaygu wuxuu samaysanayaa Password cusub si uu hadhow ugu galo app-ka.

## 3. Backend Logic (Node.js & Nodemailer)
Folder-ka `@Backend` wuxuu mas'uul ka noqon doonaa dirista email-lada isagoo isticmaalaya Gmail-ka milkiilaha app-ka.
*   **Amniga**: API Keys-ka iyo App Passwords-ka waxay ku dhex jiri doonaan `.env` file si aysan dadka kale u arkin.
*   **Bilaash**: Ma jiro kharash ku baxaya dirista email-lada maadaama aan isticmaalayno Nodemailer.

## 4. Isbedelka Mustaqbalka ee Frontend
*   Bogga `(auth)/register.jsx` waa la bedeli doonaa si uu u waafaqo nidaamka Activation-ka.
*   "Register" badankiisa waa laga saari doonaa, waxaana lagu bedeli doonaa "First time? Activate here".

---
*Dukumentigan waa qorshe bilow ah (Idea Phase), mana jirto wax code ah oo wali la bedelay.*

