# Jurnal de modificări — Davide Chape (Antigravity ↔ Paperclip)

### 2026-11-21 14:29 — Butoane Stilizate 3D (Satelit Hybrid) & Street View 360° în Popup-ul Șoferilor + Optimizare Trafic
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - **Butoane vectoriale stilizate `3D` (`<Box />`) și `Street View` (`<Eye />`) (fără emojis) în popup-ul șoferului/camionului pe harta live (`MiniLiveTrackingMap.jsx` & `LiveTracking.jsx`):**
    - Click pe **`3D`** comută instant harta pe **Google 3D Satellite Hybrid (`lyrs=y`)** și face zoom (`18`) direct pe poziția șoferului.
    - Click pe **`Street View`** deschide direct în aplicație panoul interactiv **Street View 360°** la coordonatele GPS ale camionului (cu numărul de înmatriculare Belgia, viteza și buton de deschidere în Google Maps), cu **zero costuri / credite API**.
  - **Eliminat `setInterval(..., 15000)` pe `/api/public/tenant-config`** din `App.jsx` (configurația de tenant se încarcă o singură dată la pornire, economisind 240 request-uri/oră/tab).
  - **Eliminat timer-ul nefolosit de 1 secundă (`nowTimer`)** din `AdminOverview.jsx` (care forța re-randarea întregii pagini de Planning + Calendar + Hartă de 3.600 ori/oră).
  - **Optimizat polling-ul din `AdminOverview.jsx`, `MiniLiveTrackingMap.jsx` și `HeaderNotifications.jsx`:**
    - Toate intervalele de polling sunt acum **oprite automat când tab-ul este în fundal** (`document.visibilityState !== 'visible'`).
    - Stațiile de nisip (`/admin/logistics/sand-stations`), echipele (`/admin/teams/`) și clienții (`/admin/clients`) se încarcă **o singură dată la deschidere** (nu la fiecare 15 secunde).
    - Stabilizat `updateHudList` cu `workOrdersRef` în `liveWeatherCanvas.jsx` pentru ca timerul meteo de 10 minute să nu fie resetat la actualizarea comenzilor.
- **Fișiere:** `frontend/src/App.jsx`, `frontend/src/pages/admin/AdminOverview.jsx`, `frontend/src/components/MiniLiveTrackingMap.jsx`, `frontend/src/utils/liveWeatherCanvas.jsx`, `frontend/src/components/HeaderNotifications.jsx`
- **Build / Teste:** `npm run build` OK, Audit Gatekeeper 🟢 VERDE (5/5)

### 2026-11-21 14:11 — Carduri Calendar Mai Înalte (120px) pe 4 Rânduri, Interval Orar Dinamic Fără Scroll & Aliniere Header 56px
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - Mărit înălțimea rândului orar în calendar (`ShortWorksCalendar.jsx`) de la `100px` la `120px` (carduri de `111px`).
  - **Interval orar dinamic fără scroll peste ore goale (`dynamicStartHour` / `dynamicEndHour`):** calendarul afișează acum doar intervalul orelor ocupate din săptămâna curentă + câte **1 singură oră liberă tampon** în sus și în jos (ex. dacă lucrările sunt între `08:00` și `14:00`, calendarul afișează doar `07:00`–`15:00`, fără scroll vertical intern).
  - **Aliniere la pixel a antetelor (`h-[56px] rounded-2xl`):** antetul albastru al Calendarului și antetul albastru `DEVIZE ÎN AȘTEPTARE` au exact aceeași înălțime (`56px`), iar coloana din dreapta se întinde automat la exact aceeași înălțime cu calendarul.
  - Reorganizat informația de pe cardurile din calendar pe 4 rânduri clare, păstrând și evidențiind harta estompată pe jumătatea dreaptă (`w-[62%]`):
    1. **Rândul 1 (Antet echipă):** `Nume Client` + pastila `230 m²`.
    2. **Rândul 2 (100% lățime pentru Șapă):** `🥞 Chape 230m²×7cm` (`shrink-0` pe dimensiune, astfel încât `230m²×7cm` nu mai este niciodată tăiat cu `...`).
    3. **Rândul 3 (Localitate curată pe toată lățimea):** `📍 Dilbeek`, `📍 Stekene`, `📍 Bonheiden`, `📍 Ecaussinnes` (extrasă automat fără stradă și cod poștal).
    4. **Rândul 4 (Subsol peste hartă):** pastila de nisip (`25.8T`) + pastila de distanță (`+ 35 km`) + pastila meteo (`☀️ 8°`).
- **Fișiere:** `frontend/src/components/ShortWorksCalendar.jsx`, `frontend/src/pages/admin/AdminOverview.jsx`
- **Build / Teste:** `npm run build` OK, Audit Gatekeeper 🟢 VERDE (5/5)

### 2026-11-21 12:09 — Spațiu Extins 5K pentru Devize în Așteptare, Ștergere Deviz cu Confirmare, Traduceri & Stilistică Hărți/Planning
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - **Spațiu extins în Full Screen / 5K Ultra-Wide pentru „Devize în așteptare” și „Camioane (Echipe)” (`AdminOverview.jsx`, `index.css`, `ShortWorksCalendar.jsx`):**
    - Lățit coloana din dreapta a Planning-ului (`.tps-planning-split-grid`: de la `160px` la `220px`–`260px` pe desktop standard, `295px` la `>=2050px`, `340px` la `>=2480px` și `375px` pe 5K `>=2900px`).
    - Butonul intern din bara calendarului deschide **exclusiv Calendarul de Planificare** (`!isCalendarFull` ascunde panoul lateral), folosește iconița `Scan` (`[ ]` cadru focus) și este aliniat la aceeași înălțime (`h-9` / `36px`) și rotunjire (`rounded-full`) cu toate celelalte 4 controale din bara calendarului.
    - Unificat culoarea barei calendarului (`ShortWorksCalendar.jsx`) și a Header Bar-ului (`AdminDashboard.jsx`) pe culoarea unică a tenantului (`tenant?.primary_color`), eliminând nuanța hardcodată `#0ba5e9` și avatarul mov-indigo.
    - Eliminat trunchierile strânse (`max-w-[65px]` pe oraș și `max-w-[120px]` pe echipă), adăugat badge-uri cu numărul total de devize/echipe în antet și redesenat cardurile cu tipografie clară, badge-uri de suprafață×grosime și distanță.
    - Lățit modalul `Devize în așteptare` la `max-w-7xl 2xl:max-w-[1620px]` și coloana de adresă la `max-w-[260px] xl:max-w-[360px] 2xl:max-w-[480px]`.
  - **Ștergere deviz în așteptare prin Swipe de la Stânga la Dreapta cu Modal de Confirmare (`AdminOverview.jsx`):**
    - Swipe / glisare **de la stânga la dreapta** pe orice card din `DEVIS EN ATTENTE` culisează cardul spre dreapta, dezvăluie banda roșie `Supprimer` cu iconița `Trash2` și deschide automat modalul de confirmare a ștergerii (`DELETE /admin/work-orders/{id}`), în timp ce tragerea spre stânga (spre calendar) păstrează drag & drop-ul normal pe calendar.
    - Eliminat butoanele plutitoare la hover din colțul dreapta-sus al cardului (care acopereau data solicitată `28.11`).
    - Ordonat `CAMIONS (ÉQUIPES)` cu camioanele active cu plăcuțe belgiene primele (`Badea`, `Grue Alexei`, `Petrea`, `Vasea`, `Vitiok`).
  - **Corectare traduceri mixte RO/FR/EN (`ro.json`, `fr.json`, `nl.json`, `en.json`, `MiniLiveTrackingMap.jsx`, `AdminOverview.jsx`):**
    - Corectat `1 MEMBERS` -> `1 membru / 2 membri` (RO), `1 membre / 2 membres` (FR), `1 lid / 2 leden` (NL), `1 member / 2 members` (EN).
    - Corectat `6 activis` și `Sable` pe harta live -> `6 activi` / `Nisip` (RO), `6 actifs` / `Sable` (FR), `6 actief` / `Zand` (NL).
    - Tradus complet coloanele din modalul `Devize în așteptare` (`Data solicitată`, `Adresă`, `Distanță`, `Nisip`, `t nisip`).
  - **Harta Live & Meteo Stil AccuWeather / Apple Weather + Lucrarea din Planning în Legendă (`liveWeatherCanvas.jsx`, `MiniLiveTrackingMap.jsx`, `LiveTracking.jsx`, `clockin.py`):**
    - Piloți/camioane sub formă de pastilă alungită Liquid Glass cu anti-coliziune automată (`computeVehiclePixelOffsets`).
    - **Zoom Toggle pe Camion & Hartă:** Click pe orice camion (direct pe markerul de pe hartă sau în Legendă/Sidebar) salvează vederea curentă și face zoom fluid (`flyTo` la zoom 16) pe camion; al doilea click pe același camion **sau click oriunde pe fundalul hărții** readuce automat harta la zoom-ul și poziția inițială (`restorePreviousView`).
    - **Sincronizare Lucrare Actuală în Legendă (Ora Belgiei `Europe/Brussels` + Poziția GPS a Camioanelor):** Atât backend-ul (`/admin/vehicles/live` în `clockin.py`), cât și frontend-ul (`MiniLiveTrackingMap.jsx`, `liveWeatherCanvas.jsx`) folosesc acum strict fusul orar al Belgiei (`Europe/Brussels`) și distanța GPS reală (Haversine) dintre camion și șantiere: dacă un camion se află fizic la un șantier din ziua respectivă (`< 1.2 km`), afișează exact acea lucrare; în plus, pe rândul camionului se afișează și localitatea în care se află camionul conform poziției GPS (`52 km/h · Enghien`, `Staționează · Ecaussinnes`, etc.).
    - **Design Compact Meteo exclusiv pentru Lucrările de Azi (`today`) Fără Scrollbar + Card Legendă Ultra-Compact Fără Scroll + Eliminare Săgeți de Vânt:** Atât cardul `METEO` din stânga, cât și cardul `LEGENDĂ (6)` din dreapta sunt acum ultra-compacte (în `LEGENDĂ`, numele camionului și viteza/statusul sunt pe același rând `[●] Vasea · Staționează | 24.9km`, iar dedesubt caseta lucrării pe un singur rând fără suprapunere `13:00 · Florin (Ugo) · Ecaussinnes | 40m² +3`), astfel încât toate cele 6 camioane + lucrările lor încap complet în înălțimea hărții fără scroll.
  - **Separare Strictă Subdomenii Tenant vs. Super Admin (`tenantStore.js`, `api.js`, `App.jsx`):**
    - Eliminat fallback-ul forțat pe `'davidechape'` atunci când se accesează `http://localhost:5678` (fără subdomeniu de tenant).
    - Acum `http://localhost:5678/admin` (fără nume de tenant în față) intră direct în **Super Admin (`/admin/organizations`)**, iar tenantul Davide Chape se accesează cu numele tenantului în față: **`http://davidechape.localhost:5678/admin/planning`** (sau pe producție `https://davidechape.pontaj.app`).
  - **Refacere Completă Tabel „Comenzi Recente” & Plăcuțe de Înmatriculare Belgia (`AdminOverview.jsx`, `EuroPlate.jsx`, `MiniLiveTrackingMap.jsx`, `admin_teams.py`, `clockin.py`):**
    - Înlocuit tabelul gol de 4 coloane (`Client`, `Data`, `Status: Ciornă`, `Facturare: —`) cu un tabel complet, informativ și profesional cu 9 coloane: **Plăcuță Înmatriculare Belgia (`[B | 2-FVB-027]`) + Data & Ora execuției** (fără hash-uri UUID trunchiate!), **Client + Telefon**, **Adresă șantier (cu click pe hartă)**, **Echipă / Camion alocat (ecuson colorat)**, **Suprafață / Grosime (`m²` / `cm`)**, **Distanță / Nisip (`km` / `t nisip`)**, **Preț (`€`)**, **Status real (`Planificat` când are dată și echipă alocată)** și **Acțiuni (`Copiere link`, `Vizualizare detalii`)**.
    - Stilizat componenta `EuroPlate.jsx` ca o plăcuță oficială belgiană de înmatriculare (fundal alb reflectorizant, chenar roșu-rubiniu `#b91c1c`, bandă albastră UE `#003399` cu steluțe aurii și `B`, caractere roșu-rubiniu `#991b1b`) și afișat numărul de înmatriculare (`2-FVB-027`, `2-HCN-786`, `2-GXW-680`, `2-HCN-648`, `2-EAZ-821`) în `Comenzi Recente`, `Camioane (Echipe)` și legenda `Urmărire Live`.
  - **Aliniere Perfectă la Pixel între Header Bar și Coloana Dreaptă `Devize în așteptare` (`AdminDashboard.jsx`, `AdminOverview.jsx`, `index.css`):**
    - Eliminat dublul padding orizontal (`p-3 lg:p-4` din `AdminOverview.jsx` peste `p-4` din `.tps-main-inner`) și uniformizat padding-ul `.tps-main-inner` la `1rem` (`16px`) pe toate rezoluțiile, astfel încât marginea din dreapta a panoului `DEVIZE ÎN AȘTEPTARE` și marginea din stânga a Sidebar-ului să fie perfect aliniate la același nivel vertical cu Header Bar-ul de sus (`md:mx-4`).
  - **Refacere Completă Dark Mode în Planning, Header & Carduri (`ShortWorksCalendar.jsx`, `AdminDashboard.jsx`, `AdminOverview.jsx`, `index.css`):**
    - Eliminat efectul `dark:mix-blend-lighten` cu `opacity-40` de pe harta statică Yandex din cardurile calendarului (care albea jumătatea dreaptă a cardurilor și făcea textul invizibil în Dark Mode), înlocuit cu hartă dark-mode discretă (`dark:invert dark:hue-rotate-180 dark:opacity-15`).
    - Corectat contrastul tuturor textelor și ecusoanelor din cardurile de Planning (`Chape: 230m²×7cm`, adresa, km, temperatura, badge-ul `m²` și badge-ul de nisip `T`), eliminat chenarul alb gros punctat (`#cbd5e1`) de pe lucrările finalizate și refăcut Header Bar-ul în Dark Mode pentru vizibilitate 100% a logo-ului Davide Chape.
- **Fișiere:**
  - `frontend/src/pages/admin/AdminOverview.jsx`
  - `frontend/src/components/MiniLiveTrackingMap.jsx`
  - `frontend/src/pages/admin/LiveTracking.jsx`
  - `frontend/src/utils/liveWeatherCanvas.jsx`
  - `frontend/src/index.css`
  - `frontend/src/i18n/ro.json`, `fr.json`, `nl.json`, `en.json`
- **Ramură / Commit:** `main` (local, verificat și gata pentru push)
- **Build / Teste:** `run_prepush_audit.py` + `vite build` — 🟢 VERDE (0 erori)

### 2026-11-21 11:38 — Buton Global Full Screen, Layout 5K Ultra-Wide, Planning 2 Săptămâni (14 zile) & Hărți Live cu Terminator Solar / Radar Doppler / Vânt Canvas
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - **Header Bar (`AdminDashboard.jsx`):** Adăugat butonul global de **Full Screen (`Maximize2` / `Minimize2`)** cu suport `webkitRequestFullscreen` (Safari/Mac), sincronizare automată cu tasta `Esc`, butoane circulare `w-9 h-9 rounded-full` cu highlight Liquid Glass și deblocare lățime `<main>` (`.tps-main-workspace`).
  - **Design System macOS Tahoe / Golden Gate „Liquid Glass” (`index.css`, `DataTable.jsx`, `EuroPlate.jsx`):**
    - Suprafețe `.tahoe-wallpaper`, `.tahoe-glass`, `.tahoe-glass-elevated`, `.tahoe-card-inner`, `.tms-weather-hud-glass` cu suport automat Dark + Light Mode (`[data-theme="light"]`).
    - Butoane capsulă (`border-radius: 9999px` / `rounded-full`), `.tahoe-btn-primary`, `.tahoe-btn-secondary`, tab-uri capsulă fără outline rezidual, tipografie `Inter` fără ligaturi + `.tabular-nums`, antet sticky translucid și rânduri de 48px cu zebră discretă în `DataTable.jsx`, iconițe meteo vectoriale SVG Zi/Noapte (`renderAppleWeatherIcon`) și componenta `EuroPlate.jsx`.
  - **Layout 5K & Ultra-Wide (`index.css`):** Adăugate cele 3 praguri `@media` (`>= 2050px`, `>= 2480px`, `>= 2900px`) cu zero impact pe laptop/mobil (`< 2050px`).
  - **Planning pe 2 Săptămâni / 14 Zile (`ShortWorksCalendar.jsx`):** Comutare automată pe **2 săptămâni (14 zile: Luni–Duminică Săpt. 1 + Luni–Duminică Săpt. 2)** în modul Full Screen / 5K Ultra-Wide + buton manual **`1 Sem. / 2 Sem.`** în header-ul calendarului, cu Drag & Drop, redimensionare multi-zi și totaluri zilnice de Nisip (`T`) & Suprafață (`m²`) pe toate cele 14 zile.
  - **Hărți Live (`solarTerminator.js`, `liveWeatherCanvas.js`, `MiniLiveTrackingMap.jsx`, `LiveTracking.jsx`):**
    - Terminator Solar Zi/Noapte (ecuații astronomice NOAA / Meeus în `solarTerminator.js`, 5 benzi de crepuscul pe `L.GridLayer`, linie de orizont aurie, marker Zénith Solar și buton **🌍 Globe / Belgique**).
    - Telemetrie meteo reală Open-Meteo în 1 singur request batch pentru 24 stații din Belgia și coridorul european (cache 10 min, protecție anti-ploaie falsă).
    - Radar Doppler live **RainViewer** + animație `<canvas>` 100% client-side cu 115 particule de vânt (interpolare IDW) și 120 particule de precipitații (~30fps) + panou **Frosted-Glass Weather HUD** + `ResizeObserver` (`map.invalidateSize`).
- **Fișiere:**
  - `frontend/src/utils/solarTerminator.js` (nou)
  - `frontend/src/utils/liveWeatherCanvas.js` (nou)
  - `frontend/src/pages/admin/AdminDashboard.jsx`
  - `frontend/src/index.css`
  - `frontend/src/components/ShortWorksCalendar.jsx`
  - `frontend/src/components/MiniLiveTrackingMap.jsx`
  - `frontend/src/pages/admin/LiveTracking.jsx`
- **Ramură / Commit:** `main` (local, verificat și gata pentru push)
- **Build / Teste:** `run_prepush_audit.py` + `vite build` — 🟢 VERDE (0 erori)

### 2026-11-21 11:00 — Link Davide Chape (Versiune Vânzător) + Notificare dublă Email & WhatsApp la mesaje în Chat
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - Adăugat **Link Davide Chape (Versiune Vânzător)** (`/confirm/{token}?lang={lang}&role=seller`) alături de **Link Client** (`/confirm/{token}?lang={lang}`) în toate notificările trimise echipei pe grupul WhatsApp `Davide Chape APP` și pe emailul `info@davidechape.be` (la Deviz Nou, Deviz Acceptat și Mesaj Nou în Chat).
  - În `WorkOrderConfirm.jsx` și `public_work_orders.py`, când pagina este deschisă cu `?role=seller`:
    - Se afișează bara verde `Mode Vendeur (Davide Chape)` și selectorul de limbă de traducere (`FR`, `NL`, `EN`, `Sans trad.`).
    - Mesajele trimise din chat sunt înregistrate ca `sender = "admin"` (`Davide Chape`), se traduc automat în limba clientului și apar pe partea vânzătorului (iar pe linkul clientului apar pe partea stângă ca răspuns de la `Davide Chape`, nu ca și cum clientul și-ar scrie singur).
    - Mesajele clientului afișează dedesubt traducerea automată în limba română (`🌐 Traducere (RO)`).
    - Pe **Linkul Davide Chape** (`?role=seller`), formularul de semnare al clientului, bifa „acceptez sans signature” și butonul „Confirmer et signer” sunt ascunse, astfel încât vânzătorul să aibă direct Chatul imediat sub PDF.
    - Pe **Linkul Clientului**, secțiunea „ou acceptez sans signature” și butonul „Confirmer et signer” au fost mutate pe un rând complet (full-width) și compact la baza PDF-ului, păstrând cele două casete de semnătură perfect simetrice.
  - La fiecare răspuns al lui Davide Chape în chat (fie de pe Linkul Davide Chape de pe mobil, fie din panoul Admin de pe PC), clientul primește **permanent atât pe Email** (cu previzualizarea mesajului și buton direct către `/confirm/{token}#chat-section`), **cât și pe WhatsApp**.
- **Fișiere:**
  - `frontend/src/pages/public/WorkOrderConfirm.jsx`
  - `backend/app/api/public_work_orders.py`
  - `backend/app/api/admin_work_orders.py`
  - `backend/app/services/whatsapp_service.py`
  - `backend/app/services/email_service.py`
- **Ramură / Commit:** `main` (modificări locale gata de testare înainte de commit/push)
- **Build / Teste:** `run_prepush_audit.py` — 🟢 VERDE (toate fazele + `npm run build` trecute cu 0 erori)

### 2026-11-09 15:45 — Inițializare sincronizare Antigravity ↔ Paperclip & Stare curentă proiect
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - Configurat regulile de sincronizare continuă cu agentul Paperclip `Dev Davide Chape` în `.agents/rules/paperclip-sync.md`, `.agents/AGENTS.md` și `.agents/CHANGELOG.md`.
  - Rezumatul modificărilor urcate astăzi pe `main`:
    1. `09df581` — Adăugat suita de verificare pre-push `audit-gatekeeper` (`.agents/skills/audit-gatekeeper/SKILL.md` și `scripts/run_prepush_audit.py`).
    2. `6910d8b` — Sincronizare completă stații de nisip în DB (`LogisticSandStation`: 65 stații active în total — 9 cu preț colorate pe grilă + 56 fără preț cu gri, inclusiv Lambert Frères SA Bastogne și Carrière des Limites Rochefort la 32 €/t).
    3. `1a8079a` — Fix eroare `422 float_parsing` la salvarea clienților preferențiali în Tarife când câmpurile numerice sunt lăsate goale, unificare prag 250 m² și măsurători reale per șapă (`Chape 1`, `Chape 2`, ...).
- **Fișiere:**
  - `.agents/rules/paperclip-sync.md` (nou)
  - `.agents/AGENTS.md` (actualizat)
  - `.agents/CHANGELOG.md` (nou)
  - Stare `git status --short` (fișiere urmărite modificate înainte de această intrare: 0; fișiere locale neurmărite `??` de diagnostic/istoric ignorate la commit).
- **Ramură / Commit:** `main` @ `09df581` (`09df581 chore(audit): add Cloudflare-modeled audit-gatekeeper skill and pre-push verification suite`)
- **Build / Teste:** `run_prepush_audit.py` — 🟢 VERDE (6/6 faze trecute, 0 erori critice, `npm run build` OK)

