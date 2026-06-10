# Qorshaha Hirgelinta Xaddididda Goobta (Geofencing Plan)

Dukumentigan wuxuu sharraxayaa sida app-ka looga dhigayo mid u gaar ah aagga jaamacadda oo kaliya, iyadoo la isticmaalayo GPS-ka moobaylka.

## 1. Bartilmaameedka (Target Location)
Xuddunta jaamacadda iyo masaafada loo ogol yahay (Radius):
*   **Latitude:** `2.04061`
*   **Longitude:** `45.29997`
*   **Allowed Radius:** `130` mitir
*   **Google Maps:** https://maps.app.goo.gl/h8eJgXmRDyNL44Vq8
*   **Code:** `Frontend/src/utils/campusGeofence.js`

## 2. Tallaabooyinka Farsamada (Technical Steps)

### A. Rakibidda Qalabka
Waxaan isticmaalaynaa library-ga `expo-location` si aan u helno xogta GPS-ka ee qofka.
```bash
npx expo install expo-location
```

### B. Hubinta Xuquuqda (Permissions)
App-ku waa inuu marka hore weydiiyo isticmaalaha ogolaansho ah in la ogaado meesha uu joogo (`Location Permissions`). Haddii la diido, ma soo dhigi karo wax Item ah.

### C. Xisaabinta Masaafada (Geofencing Logic)
Waxaan isticmaalaynaa formula xisaabeed si aan u ogaanno inta mitir oo u dhexaysa **User Location** iyo **University Location**. 
*   Haddii `Masaafada <= 130m`: Ogolow inuu Item-ka soo dhigo.
*   Haddii `Masaafada > 130m`: Tus fariin ah "Ma joogtid campus-ka".

## 3. Geedi-socodka Isticmaalaha (User Workflow)
1.  **Click "Report Item"**: Ardaygu wuxuu riixayaa badanka wax lagu soo dhigo.
2.  **Location Check**: App-ku wuxuu si qarsoodi ah u hubinayaa halka uu joogo qofka.
3.  **Validation**:
    *   Haddii uu joogo Campus-ka -> Waxaa u furmaya foomka (Form) uu ku qorayo faahfaahinta item-ka.
    *   Haddii uusan joogin -> Waxaa soo baxaya Digniin (Warning Toast) sheegaysa inuu ku soo laabto jaamacadda.

## 4. Faa'iidooyinka Habkan
*   **Amniga:** Waxay ka hortagaysaa dadka bannaanka jooga inay app-ka ku soo qoraan waxyaabo been abuur ah.
*   **U-gaarnaan:** App-ku wuxuu si dhab ah u noqonayaa mid ay leeyihiin dadka jooga jaamacadda dhexdeeda.

## 5. Xaaladda Hirgelinta (Implementation Status)
*   **Hirgelin:** User **iyo** Admin **Lost** iyo **Found** report (+ button) — `campusGeofence.js`
*   **GPS server:** Ma la dirayo — hubin maxalliga ah oo kaliya

---
*Dukumentigan waa qorshaha iyo xogta campus-ka ee geofencing.*
