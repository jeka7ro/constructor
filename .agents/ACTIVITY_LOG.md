# Jurnal de Activitate al Agentului (Activity Log)

Acest fișier reprezintă istoricul modificărilor și acțiunilor întreprinse de asistentul AI pe acest proiect. 
Scopul este asigurarea trasabilității depline: cine a modificat, când a modificat, de ce a modificat și dacă acțiunea a avut sau nu aprobarea utilizatorului.

## 2026-09-20 (Oprire Definitivă Sincronizare Robaws & Blindare Completă Împotriva Suprataxării Google Cloud)
**Agent:** Antigravity (AI)
**Status Aprobare:** Solicitat explicit de Utilizator ("nu vrea ni ci onfondmrai despre robaws. sopoesttele nu am am neoie de ele" și "vrai s anu mai am bucl e sau eori sau nomli sa nu ma supratxze google cloudu").

### Context & Diagnostic:
1. **Scurgere de apeluri Robaws:** În `main.py` rula un scheduler la fiecare 2 ore (`run_all_scrapers`). Acesta parcurgea comenzile din Robaws și, dacă nu aveau coordonate exacte în payload-ul Robaws, apela Google Geocoding API chiar dacă acele comenzi existau deja în baza de date cu coordonate salvate. Utilizatorul a cerut oprirea completă a oricărei integrări sau sincronizări Robaws.
2. **Lipsă Caching Google Distance Matrix:** În `admin_work_orders.py`, `devis_online.py` și `public_calculator.py`, funcția `get_driving_distance_km` apela direct Google Distance Matrix API fără memorie cache. La `devis_online`, fiecare deviz calcula distanța față de toate bazele logistice repetat.
3. **Lipsă Caching Google Place Details:** În `main.py`, endpoint-ul proxy `/api/places/details` (unul dintre cele mai scumpe API-uri Google) nu avea niciun cache, apelând Google la fiecare selecție de adresă din frontend.
4. **Bug & Resetare Cache Frontend:** În `MapView.jsx`, cache-ul era pierdut la fiecare demontare a componentei (schimbare de tab sau modal), iar la linia 381 se salva `{ lat, lon }`, dar la 368 se citea `cached.lng` (`undefined`), generând coordonate invalide.

### Modificări Efectuate:
1. **Oprire Definitivă Robaws:**
   - Dezactivat job-ul `scheduler.add_job(run_all_scrapers, ...)` din `backend/main.py`.
   - În `backend/app/services/robaws_scraper.py`, funcțiile `run_all_scrapers()`, `run_api_sync_for_team()` și `geocode_address_for_scraper()` au fost oprite definitiv (returnează imediat `None`).
2. **Blindare Backend Google Cloud (Caching Thread-Safe):**
   - **`backend/main.py`:**
     - Adăugat `_place_details_cache` permanent în memorie (un `place_id` returnează mereu aceleași coordonate).
     - Adăugat `_place_reverse_cache` indexat după coordonate rotunjite.
     - Extins cache-ul `places_autocomplete` de la 5 minute la 24 de ore.
   - **`backend/app/api/admin_work_orders.py`:**
     - Adăugat `_distance_matrix_cache` thread-safe în `get_driving_distance_km`.
     - Adăugat `_global_geo_cache` la nivel de modul și funcția `_geocode_address_cached` refolosită în `create_work_order`, `update_work_order` și `batch_recalculate_routes`.
   - **`backend/app/api/devis_online.py` & `public_calculator.py`:**
     - Adăugat `_devis_online_dist_cache` și `_calc_dist_cache` thread-safe în `get_driving_distance_km`.
   - **`backend/app/api/admin_sites.py`:**
     - Adăugat `_sites_geo_cache` thread-safe în `geocode_address`.
   - **`backend/app/services/translation_service.py`:**
     - Adăugat `_translation_cache` thread-safe pentru traducerile Google GTX.
3. **Optimizare & Caching Frontend:**
   - **`frontend/src/components/MapView.jsx`:**
     - Promovat `_globalMapGeocodeCache` și `_globalMapRouteCache` la nivel global de sesiune.
     - Corectat salvarea coordonatelor: `{ lat, lng: lon, lon }` și citirea `cached.lng ?? cached.lon`.
   - **`frontend/src/components/AddressAutocomplete.jsx`:**
     - Adăugat `_suggestionsCache` și `_placeDetailsCache` (`Map` client-side) pentru a nu reinteroga serverul la tastare/ștergere/re-selectare.
     - Înlocuit `alert(...)` nativ cu `showToast(...)` conform Regulii 5.
   - **`frontend/src/lib/geocode.js`:**
     - Adăugat cache-uri în-memorie `_frontendReverseGeoCache` și `_frontendGeoCache`.

---

## 2026-09-20 (Rezolvare Eroare "Créer le Devis" din Formularul Rapid QuickAddWizard)
**Agent:** Antigravity (AI)
**Status Aprobare:** Rezolvare bug critic raportat de utilizator cu captură foto.

### Context & Diagnostic:
- Utilizatorul (Corina Carabet) a încercat să creeze un deviz din fereastra de adăugare rapidă (`QuickAddWizard.jsx`), dar la apăsarea butonului "Créer le Devis" apărea notificarea de eroare roșie: `"Erreur lors de l'enregistrement"`.
- Cauze identificate prin analiza fluxului:
  1. **Tip de date nevalid (Pydantic v2):** `QuickAddWizard.jsx` trimitea `estimated_price: parseFloat(form.estimated_price)` (float), în timp ce schema `WorkOrderCreate` accepta strict `Optional[str]`. Pydantic v2 returna eroare 422: `Input should be a valid string`.
  2. **Crash UnboundLocalError pe backend:** În `create_work_order`, când `payload.start_date` era None (comun la devize care au `approximate_date`), linia 972 executa `datetime.now()`, dar din cauza unui import intern redundant `from datetime import datetime` aflat pe linia 974 în blocul `try`, Python genera `UnboundLocalError: local variable 'datetime' referenced before assignment` (HTTP 500).
  3. **Lipsă flag `is_quote: true`:** `QuickAddWizard.jsx` nu transmitea `is_quote: true`, ceea ce ar fi cauzat generarea unui număr de factură (`INV...`) în loc de devis (`DEV...`), încălcând Regula 1 de secvențialitate documente.
  4. **Payload crearea client nou:** La modul `clientMode === 'new'`, formularul trimitea `first_name`, `last_name`, `company_name`, dar nu trimitea cheia cerută `name`, ducând la eroare 422 pe `POST /admin/clients`.

### Modificări Efectuate:
1. **Frontend (`QuickAddWizard.jsx`):**
   - Trimite `is_quote: true`, `title: volumes[0]?.label || 'Devis'`, `status: 'pending'` și `estimated_price: String(...)`.
   - La `clientMode === 'new'`, transmite explicit `name: newClient.name` și `cui: newClient.cui || null`.
   - Extrage și afișează mesajul exact de la server în caz de eroare.
2. **Backend (`admin_work_orders.py`):**
   - În `WorkOrderCreate`, definit `estimated_price: Optional[Union[str, float, int]] = None` și `status: Optional[str] = None`, convertind automat valorile numerice în șir de caractere în `clean_empty_strings`.
   - Eliminat importul intern de `datetime` din `create_work_order` și adăugat fallback pe `payload.approximate_date` pentru generarea titlului.
   - Preluat `initial_status` din payload (sau `'pending'` dacă `is_quote` e True).
   - Securizat adunarea `truck_cost` la `estimated_price` pentru a nu arunca `TypeError` între `str` și `float`.
3. **Backend (`admin_clients.py`):**
   - În `ClientBase.clean_empty_strings`, adăugat fallback automat pentru generarea `name` din `first_name`/`last_name` sau `company_name` dacă `name` nu este furnizat direct.

---

## 2026-09-17 (Clarificare Vizuală Chat Public & Detecție Sesiune Administrator)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ok.").

### Context & Diagnostic:
- În timpul testării paginii publice de confirmare a devizului (`/confirm/:token` / `WorkOrderConfirm.jsx`), s-a creat confuzie la trimiterea mesajelor de chat:
  1. Testatorul a scris atât din postura de client, cât și încercând să răspundă ca Davide Chape din aceeași căsuță publică de input, determinând ambele mesaje să apară în bule albastre pe partea dreaptă (deoarece pe pagina publică toate mesajele au `sender: 'client'`).
  2. Grupul oficial de WhatsApp al echipei a fost notificat că un client a trimis două mesaje, iar pe telefonul clientului nu a sosit nimic deoarece răspunsul nu fusese trimis din panoul de administrare (`/admin/chats` sau `/admin/work-orders/:id`).
  3. Pe bulele primite de la Davide Chape nu exista un antet explicit cu numele expeditorului.

### Modificări & Îmbunătățiri Efectuate:
1. **Identificare Explicită Expeditor pe Fiecare Mesaj (`WorkOrderConfirm.jsx`):**
   - Pentru mesajele trimise de Davide Chape (`!isOwn`): afișat ecuson distinctiv `Davide Chape` cu bulină albastră în partea de sus a bulei albe.
   - Pentru mesajele trimise de client (`isOwn`): afișat indicator subtil `Vous (Client)` / `You (Client)` / `U (Klant)` etc.
2. **Personalizare Placeholder Căsuță Text (`WorkOrderConfirm.jsx`):**
   - Placeholder-ul a fost actualizat din generic în *"Écrivez à Davide Chape..."* (respectiv *"Schrijf naar Davide Chape..."*, *"Write to Davide Chape..."*), clarificând utilizatorului cui i se adresează.
3. **Banner Inteligent Detecție Administrator (`WorkOrderConfirm.jsx`):**
   - Dacă în browserul curent există o sesiune activă de administrator (`localStorage.getItem('admin-storage')`), deasupra chat-ului se afișează automat un banner informativ:
     *"Mode Administrateur : Vous visualisez la vue client. Pour répondre officiellement et notifier le client sur WhatsApp, écrivez depuis l'Espace Admin."*
   - Bannerul include un buton direct de acces: `Ouvrir Admin Chat →` către `/admin/chats?wo_id={order.id}`.

---

## 2026-09-17 (Eliminare Dublu Forfait Deviz DEV1053 și Blocare Salvare Praguri Suprapuse în Tarife)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("da").

### Context & Problemă:
- Pe devizul `DEV1053` (suprafață șapă de 41 m²), în cardul *Calcul des Coûts* se calculau două taxe forfetare distincte sub Chape: `Forfait: 600.00 EUR` și `Forfait: 500.00 EUR`, totalizând 1100 € în loc de 500 €.
- Cauza: În pagina de Tarife, pragurile erau introduse cu aceleași limite de graniță: `0–41` (600 €) și `41–61` (500 €). Atât în `pricingEngine.js`, cât și în `pricing_engine.py`, parcurgerea se făcea cu `forEach` / buclă deschisă și condiție `<=` pe ambele capete (`min_s <= surface <= max_s`). Astfel, la 41 m², ambele intervale erau considerate valide și ambele forfetare erau adăugate.
- De asemenea, sistemul permitea salvarea în Tarife a intervalelor care se suprapun fără nicio avertizare.

### Modificări & Acțiuni Efectuate:
1. **Motor Calcul Frontend (`frontend/src/utils/pricingEngine.js` și `priceCalculator.js`):**
   - Înlocuit `thresholds.forEach` cu `.find()`, sortat crescător după `min_sqm`.
   - Căutare prioritară pe interval semi-deschis: `totalChapeSurface >= minS && totalChapeSurface < maxS` (cu fallback pe `<= maxS` pentru ultimul palier maxim).
   - Rezultat: Se garantează aplicarea a **cel mult unui singur forfait** per lucrare.
2. **Motor Calcul Backend (`backend/app/services/pricing_engine.py`):**
   - Sortat `surface_thresholds` după `min_sqm`, căutare unică cu `break` pe `min_s <= total_surface < max_s`.
   - Aliniat calculul pentru `pur_minimum_execution_price` pentru a include opțiunile de PUR (`pur_gross_before_min = iso_pur_base + iso_pur_opt_total`), asigurând 100% paritate matematică cu frontend-ul.
3. **Validare la Salvare în Tarife (`PricingSettingsPage.jsx`, `PricingSettingsForm.jsx`, `admin_pricing.py`):**
   - Adăugat `validateSurfaceThresholds` în frontend și verificare în endpoint-ul PUT din backend: se verifică `min < max` și lipsa oricărei suprapuneri (`next_min > curr_max`).
   - În caz de suprapunere (ex: 0-41 și 41-60), salvarea este oprită și se afișează mesajul clar: *"Les intervalles ne doivent pas se chevaucher (ex: 0-40, 41-60)"*.
   - Adăugat text explicativ în formularul de Tarife.
4. **Actualizare Deviz DEV1053:**
   - Sincronizat devizul în baza de date cu noile praguri globale (`0-40`: 600€, `41-60`: 500€, `61-119`: 300€, `120-100000`: 0€) și recalculat `estimated_price = 2592.5` (Total Brut cu 6% TVA = 2748.05 €).

---

## 2026-09-16 (Deblocare Google Maps, Securizare Cote/Buget & Populare Coordonate GPS Lucrări)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("da. vezi sa nu im fai vreun loop sau bug").

### Context & Problemă:
- Contul de Google Cloud Billing a fost blocat temporar din cauza unei facturi de 64.30$ cauzată în luna august de apeluri intensive către `Directions API`.
- Din cauza blocării Google Maps API, lucrările create în perioada 15-16 Septembrie au fost salvate fără coordonate GPS (`site_latitude = None`, `site_longitude = None`).
- Consecințe pe ecranul de Logistică (`/admin/logistica`):
  1. Traseele celor 7 echipe nu se desenau, afișând `0 km est.`
  2. Apărea insigna portocalie tradusă eronat ca `"Lipsesc detalii de contact"` (în franceză: `"Coordonnées manquantes"`).
  3. Rutele afișau fallback de linie dreaptă ("linie aeriană").

### Modificări & Acțiuni Efectuate:
1. **Securizare & Plafonare Google Cloud (Prevenire Suprataxare):**
   - Configurat alertă de buget la 10$ cu notificări prin email la 50%, 90% și 100%.
   - Plafonat cotele zilnice la `1000 requests/day` pentru `Directions API`, `Geocoding API` și `Distance Matrix API` (acoperite complet de creditul gratuit de 200$/lună oferit de Google).
2. **Populare Coordonate GPS (`backend/geocode_missing.py`):**
   - Actualizat scriptul pentru filtrare precisă pe adrese din Belgia (`country:BE`).
   - Rulat scriptul controlat: au fost geocodate și salvate în DB toate cele 79 de comenzi care aveau coordonate lipsă (inclusiv toate comenzile din 15 și 16 Septembrie).
   - Verificat starea bazei de date: `Remaining missing coordinates: 0`.
3. **Corecție Traducere (`frontend/src/i18n/ro.json`):**
   - Înlocuit traducerea eronată `"incomplete_coords": "Lipsesc detalii de contact"` cu `"Coordonate GPS lipsă"`.

---

## 2026-09-07 (Afișare Nume Complet Admin la Trimitere Mesaje Chat Client)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ok. dar vreau numele complet. nu doar initiale").

### Context & Diagnostic:
- În panoul de administrare (`AdminChats.jsx` și `WorkOrderDetail.jsx`), când un administrator trimitea un mesaj unui client, mesajul apărea aliniat în dreapta, însă deasupra lui era afișat generic textul `"Equipe Davide Chape"` (sau `"Team Davide Chape"`), fără a se ști cine anume din echipă a trimis acel mesaj.
- În backend (`admin_work_orders.py`), la crearea mesajului (`post_work_order_message`), câmpul `sender_name` nu era populat cu datele adminului curent (`current_admin.full_name`).

### Modificări Efectuate:
1. **Salvare și Returnare Nume Complet Admin (`admin_work_orders.py`):**
   - În `post_work_order_message`, se salvează acum automat `sender_name = current_admin.full_name or "Admin"`.
   - În răspunsurile API (`post_work_order_message`, `put_work_order_message`, `toggle_work_order_message_visibility`), se returnează câmpul `sender_name`.
2. **Afișare Nume Complet în UI Admin (`AdminChats.jsx`, `WorkOrderDetail.jsx`):**
   - Deasupra fiecărui mesaj trimis de un administrator, se afișează numele complet al adminului (`msg.sender_name`, ex: **Eugeniu Cazmal**), alături de pictograma firmei.
   - Dacă pentru mesajele vechi nu există un `sender_name` salvat, rămâne fallback-ul elegant `Equipe Davide Chape`.

---

## 2026-09-07 (Rezolvare Linkuri WhatsApp Publice Fără Admin: Link Curat /confirm/{token}?lang={lang} & Redirecționare de Siguranță)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ds de acord").

### Context & Diagnostic:
- În notificările trimise pe WhatsApp către grupul de admin la confirmarea devizului sau la un mesaj nou primit de la client, linkul generat era de forma `https://davidechape.pontaj.app/work-orders/{wo_id}`.
- La deschiderea acestui link, utilizatorul primea eroarea `404 - Lien introuvable ou expiré` deoarece în aplicația React ruta de admin este `/admin/work-orders/:id`, iar ruta publică a devizului este `/confirm/:token?lang={lang}`.
- Utilizatorul a cerut expres ca linkurile publice să nu conțină niciun fel de `/admin`.

### Modificări Efectuate:
1. **Generare Link Public Curat în WhatsApp (`whatsapp_service.py`):**
   - În funcțiile `send_admin_quote_confirmed_whatsapp` și `send_admin_client_message_whatsapp`, linkul este generat folosind token-ul public al devizului și limba clientului: `https://davidechape.pontaj.app/confirm/{token}?lang={lang}`.
   - Textul a fost actualizat la `🔗 *Deschide devizul:*`.
   - Niciun link public din notificări nu mai include `/admin` sau rute interne.
2. **Transmitere `token` și `client_language` din Apeluri (`public_work_orders.py`, `webhooks.py`):**
   - Atât la confirmarea devizului, cât și la mesajele trimise de clienți (din formularul web public sau prin webhook Meta/UltraMsg), se transmit `token=wo.token` și `client_language`.
3. **Redirecționare Inteligentă de Siguranță în Frontend (`App.jsx`):**
   - În `SmartRedirect`, s-a adăugat o regulă de auto-corecție pentru `/work-orders/:id`: dacă utilizatorul este admin logat, este redirecționat automat către `/admin/work-orders/:id`; dacă este vizitator public, este redirecționat către `/confirm/:id`, prevenind afișarea ecranului 404 pentru orice linkuri trimise anterior în istoricul de mesaje.

---

## 2026-09-07 (Notificare WhatsApp la Mesaje Web Client & Rezolvare Robustă Telefon Client)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ok").

### Context & Problemă:
- Când un client trimitea un mesaj din pagina publică de deviz (`POST /public/work-orders/{token}/messages`), mesajul se salva în DB cu `sender: "client"`, dar nu trimitea nicio notificare către admin pe WhatsApp.
- În plus, când adminul trimitea mesaje din panou, codul căuta telefonul clientului doar pe comanda curentă (`wo.client_phone`), ignorând `wo.client.phone` dacă pe comandă câmpul era gol.

### Modificări Efectuate:
1. **Notificare WhatsApp pentru Mesaje Web de la Client (`public_work_orders.py`):**
   - Conectat `send_admin_client_message_whatsapp` la primirea unui mesaj public pe endpoint-ul `/public/work-orders/{token}/messages`.
   - Când un client trimite un mesaj din interfața web, acesta este redirecționat instant în grupul oficial WhatsApp de administratori cu numele, devizul, mesajul, buton direct de răspuns pe WhatsApp și link către comanda din aplicație.
2. **Rezolvare Dinamică Telefon & Email Client (`admin_work_orders.py`):**
   - Înlocuit citirea rigidă `getattr(wo, 'client_phone', None)` cu rezolvare dinamică cu fallback: `wo.client_phone or (wo.client.phone if getattr(wo, 'client', None) else None)` fără a forța sau hardcoda niciun prefix.
   - Aplicat același fallback robust pentru emailul clientului la trimiterea notificărilor de chat.

---

## 2026-09-07 (Corectare Culoare Tenant & Stil Deviz: Anteturi Chape/Isolation și Caseta TOTAL Negre cu Text Galben Logo Davide Chape, Eliminare Mențiuni HTVA/TVAC)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ok. hai sa facem push!!!!!!").

### Context & Diagnostic:
- Pe `localhost:5678`, neexistând subdomeniu, `tenantStore.js` returna `null` dacă nu exista un slug salvat în browser.
- Din această cauză, `tenant` nu se încărca la accesarea link-ului de deviz pe localhost, iar `DevisView.jsx` cădea pe un fallback vechi de culoare `#059669` (verde de smarald) și nu afișa logo-ul SVG Davide Chape. Setările din baza de date au rămas 100% intacte.

### Modificări Efectuate:
1. **Configurare Tenant pe Localhost (`tenantStore.js`):**
   - Setat ca fallback-ul pe `localhost` și adrese IP să fie `'davidechape'` în loc de `null`. Astfel, la orice accesare locală se încarcă garantat profilul complet al tenantului (logo SVG Davide Chape, favicon și culoarea oficială `#0a9ccd`).
2. **Anteturi Negre cu Text Galben Logo Davide Chape pe `CHAPE`, `ISOLATION` și caseta `TOTAL` (`DevisView.jsx`, `ProformaView.jsx`, `pdf_generator.py`):**
   - Fundalul anteturilor `CHAPE` și `ISOLATION` a fost setat pe negru (`bg-slate-900` / `#0f172a`).
   - Textul anteturilor este colorat în galbenul de aur exact din logo-ul oficial Davide Chape (`#F7CA31`).
   - Caseta de `TOTAL` de la final este de asemenea stilizată cu fundal negru (`bg-slate-900` / `#0f172a`) și text galben (`#F7CA31`), realizând o temă vizuală uniformă și elegantă în armonie cu brandul Davide Chape.
3. **Eliminare mențiuni `(HTVA)` și `(TVAC)` (`DevisView.jsx`, `ProformaView.jsx`, `WorkOrderDetail.jsx`):**
   - Eliminat `(HTVA)` din `Total Net (HTVA)` -> acum este simplu și curat: `Total Net`.
   - Eliminat `(TVAC)` din `{T.totalLabel} (TVAC)` -> acum este simplu: `TOTAL`.
4. **Curățare Căsuță Șantier & Mutare Email (`DevisView.jsx`):**
   - Eliminat rândul cu suprafața și grosimea primului volum (`Surface: X m² · Ép.: Y cm`) din căsuța `CHANTIER / ADRESSE`, datele fiind specificate complet și detaliat în tabelul de mai jos.
   - Mutat adresa de email a clientului (`wo.client_email`) în căsuța `CHANTIER / ADRESSE` sub adresa șantierului, lăsând căsuța `CLIENT` curată cu Numele și Telefonul, ambele carduri devenind perfect simetrice.
5. **Iconițe Galbene în Cercuri Negre (Client, Telefon, Adresă, Email) în Antet (`DevisView.jsx`):**
   - Iconițele Lucide (`User`, `Phone`, `MapPin`, `Mail`) sunt stilizate ca ecusoane rotunde negre (`w-5 h-5 rounded-full bg-slate-900`), cu iconița în galbenul logo-ului (`#F7CA31`) centrată în interior.
   - Ambele carduri (`CLIENT` și `CHANTIER / ADRESSE`) au acum câte două rânduri complet simetrice, cu ecuson și text, oferind un design unitar și premium cu anteturile negre și caseta TOTAL.
6. **Actualizare Iconițe Alerte WhatsApp (`whatsapp_service.py`):**
   - Înlocuit `🧱` cu `🏠` pentru `🏠 *ȘAPĂ:*`.
   - Înlocuit `🛡️` cu `☀️` pentru `☀️ *IZOLAȚIE:*`.
7. **Separare PUR de EPS în Alerte WhatsApp (`whatsapp_service.py`):**
   - În cadrul secțiunii `☀️ *IZOLAȚIE:*`, volumele și opțiunile sunt grupate dedicat pe sub-blocuri: `🟡 *Izolație PUR (Spumă):*` (cu suprafețe și lista de opțiuni bifate) și `⚪ *Izolație EPS (Plăci):*`. Dacă ambele sunt prezente, se afișează și `➡️ *Total cumulat izolație:* X m²`.

---

## 2026-09-07 (Reorganizare Deviz PDF & Alertă WhatsApp: Separare Șapă & Izolație pe Categorii + Forfait sub Fibră)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ok. hai sa facem push!!!!!!").

### Modificări Efectuate:
1. **Deviz PDF & Vizualizare Client (`DevisView.jsx`, `ProformaView.jsx`, `pricingEngine.js`, `priceCalculator.js`, `pdf_generator.py`):**
   - **Poziționare Forfait imediat sub Fibră / Duramint:** În `pricingEngine.js` și `priceCalculator.js`, taxa de suprafață mică (`Forfait`) este inserată direct în lista de itemi pentru Șapă (`chapeItems`), imediat după `Fibre / Duramint`, înainte de izolație. Astfel clientul înțelege clar că acest forfait este asociat lucrărilor de șapă.
   - **Separare Șapă și Izolație în tabel (categorii & subtotaluri):**
     - Dacă lucrarea conține și șapă și izolație (sau mai multe straturi de șapă/izolație), tabelul generează anteturi de categorie (`CHAPE`, `ISOLATION`) și rânduri de subtotal dedicat (`Sous-total Chape : X.XX €`, `Sous-total Isolation : Y.XX €`).
     - Subtotalul de șapă include și `Forfait` atunci când acesta se aplică.
     - Elementele de tip `isHeader` și `isSubtotal` sunt excluse din calculele matematice directe (`net`, `discounts`, TVA) pentru a garanta că totalul general rămâne 100% exact.
   - **Caseta de total de jos a rămas unificată (standard):** Conform cerinței exprese a utilizatorului (*"la totul nu trrbeui separate din in lucae"*), caseta finală de la baza devizului nu se împarte pe categorii; ea conține în continuare totalul unificat al proiectului (`Total Net (HTVA)`, `TVA`, `TOTAL (TVAC)`).
   - **Majusculă la `Forfait`:** Corectată traducerea din `forfait` (minusculă) în `Forfait` (majusculă) în dicționarul de limbi `DEVIS_LANG`.
   - **Sincronizare PDF Generator Backend (`pdf_generator.py`):** Adăugat suport pentru randarea rândurilor `isHeader` și `isSubtotal` în tabelele PDF și inserarea automată a Forfait-ului în secțiunea de șapă dacă itemii sunt generați direct din volume.
   - **Sincronizare Calcul Cost (`WorkOrderDetail.jsx`):** Secțiunea "Calcul Cost" (Estimare Automată) din pagina de administrare afișează de asemenea anteturile și subtotalurile pe categorii, respectând Regula 3 de Unificare UI vs PDF.

2. **Backend (`whatsapp_service.py`):**
   - **Nisip sub preț:** Adăugată funcția `calculate_sand_requirement(volumes)` și afișat `🏖️ *Necesar Nisip:* X tone` imediat sub `💰 *Total:*` în `send_admin_new_quote_whatsapp` și `send_admin_quote_confirmed_whatsapp`.
   - **Separare pe categorii (Șapă vs Izolație):** În `format_volumes_and_materials(volumes)`, suprafețele, grosimile și materialele sunt grupate în două blocuri distincte:
     - `🧱 *ȘAPĂ:*`: listează fiecare strat de șapă cu formatul `• Șapă 1: {qty} m² x {thick} cm`, totalul de suprafață (`➡️ *Total suprafață șapă:* X m²` dacă sunt mai multe), urmat de materialele specifice (`📋 *Materiale șapă:*`, plasă, folie, fibră etc.).
     - `🛡️ *IZOLAȚIE:*`: listează fiecare strat de izolație cu formatul `• Izolație PUR 1: {qty} m² x {thick} cm`, totalul de suprafață (`➡️ *Total suprafață izolație:* X m²` dacă sunt mai multe), urmat de opțiunile specifice (`📋 *Opțiuni izolație:*`, aspirare suport, nivelare laser etc.).
   - Dacă o lucrare conține doar șapă, blocul de izolație nu apare deloc. Dacă o lucrare conține doar izolație, blocul de șapă și necesarul de nisip nu apar.

---

## 2026-09-05 (WhatsApp Alert: Limbă cu Steag, Eliminare Dublare Nisip & Bifă Verde Individuală PUR)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ok push").

### Modificări Efectuate:
1. **Backend (`whatsapp_service.py`):**
   - **Adăugare limbă cu steag**: Adăugată funcția `format_client_language_with_flag` care afișează steagul și denumirea limbii alese de client (`🌐 *Limbă client:* 🇬🇧 Engleză (EN)`, `🇳🇱 Olandeză (NL)`, `🇫🇷 Franceză (FR)`, etc.) atât la primirea devizului nou, cât și la confirmarea comenzii.
   - **Eliminat dublarea necesarului de nisip**: Nisipul este afișat o singură dată clar în secțiunea `📐 Suprafețe & Grosime` (`🏖️ *Necesar Nisip:* X tone`), eliminând rândul duplicat din `📋 Materiale & Opțiuni bifate`.
   - **Bifă verde individuală pentru opțiunile PUR**: Fiecare opțiune PUR bifată de client (Aspirare suport, Nivelare laser, Șlefuire spumă / Ponçage, Protecție peste 1M) este afișată pe propriul ei rând separat cu `✅` (`✅ Opțiune PUR - Aspirare suport: Da`, etc.).
2. **Backend (`devis_online.py` & `public_work_orders.py`):**
   - Transmis `client_language` către funcțiile de notificare WhatsApp admin (`send_admin_new_quote_whatsapp` și `send_admin_quote_confirmed_whatsapp`).

---

## 2026-09-05 (Fix Persistență Limbă Deviz: Primul Mail vs Al Doilea Mail de Confirmare & Numerotare Suprafețe Multiple)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ok. push").

### Cauza Problemei (Al Doilea Mail în Franceză):
1. Pe ruta `GET /public/work-orders/{token}`, backend-ul executa mutație directă în DB (`wo.client_language = lang.lower(); db.commit()`). Când clientul deschidea link-ul fără `?lang=` sau din preview, frontend-ul inițializa `lang` cu `'fr'` și trimitea `?lang=fr`, ceea ce suprascria limba salvată în baza de date cu `'fr'`.
2. La confirmarea comenzii (`POST /public/work-orders/{token}/confirm`), payload-ul nu includea limba selectată de client (`client_language`), iar backend-ul trimitea al doilea e-mail cu limba coruptă (`'fr'`).

### Modificări Efectuate:
1. **Backend (`public_work_orders.py`):**
   - Eliminat complet `db.commit()` și suprascrierea distructivă pe request-urile GET.
   - Adăugat câmpul `client_language` în `ConfirmPayload`.
   - La confirmare, backend-ul reține și actualizează limba confirmată de client (`chosen_lang` -> `wo.client_language`).
   - În `send_order_confirmation_email`, se trimite e-mailul în limba garantată a comenzii/clientului (`client_lang`), generând și link-ul cu `?lang={client_lang}`.
   - Returnat obiectul cu `workOrderData` la rădăcină pentru acces direct la toate proprietățile.
2. **Backend (`devis_online.py`):**
   - Rezolvat `resolved_lang` chiar la început și salvat pe `client.preferred_language` și `wo.client_language`.
3. **Frontend (`WorkOrderConfirm.jsx`):**
   - Eliminat trimiterea implicită a parametrului `?lang=fr` pe GET atunci când `urlLang` nu este specificat.
   - Detectat corect `client_language` din comanda primită și sincronizat `lang` în starea React.
   - Trimis `client_language: lang` la confirmarea comenzii (`handleConfirm` și `handleConfirmDate`).
4. **Numerotare Suprafețe și Izolații Multiple (Sesiunea Curentă):**
   - S-a asigurat că `Șapă 1`, `Șapă 2`, `Izolație PUR 1`, `Izolație PUR 2` etc. sunt numerotate uniform în WhatsApp alert, PDF generator, devis online și pricing engine.

---

## 2026-09-05 (Personalizare Multi-Tenant: Titlu, OpenGraph & Favicon Oficial din SuperAdmin)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator ("ok.push").

### Modificări Efectuate:
1. **Frontend (`frontend/index.html`):**
   - Eliminat complet brandingul vechi ("Smart Timesheet", "Smart Timesheet App").
   - Setat favicon-ul implicit, apple-touch-icon și `og:image` pe favicon-ul oficial PNG al companiei Davide Chape configurat în SuperAdmin (`https://ltxbghtnygnguoegtgfo.supabase.co/storage/v1/object/public/uploads/logos/2ae150ba-bac0-47ad-803e-7ff0a9c69dd1.png`).
   - Actualizat titlul la "Davide Chape" și descrierea la "Chape fluide, chape traditionnelle & isolation en Belgique".

2. **Netlify Edge Function (`frontend/netlify/edge-functions/og-injector.js`):**
   - Corectat apelul API către `/api/public/tenant-config?slug=${subdomain}` (cu fallback pe `/public/tenant-config`), rezolvând eroarea de 404 care bloca injectarea datelor.
   - Implementat suport complet pentru injectarea dinamică a titlului, descrierii, `<link rel="icon">`, `<link rel="apple-touch-icon">` și `og:image` pentru toți tenanții în funcție de subdomeniu (`davidechape`, `qpack`, `trade-invest` etc.).

3. **Backend (`backend/main.py`):**
   - Expus atât `/api/public/tenant-config`, cât și `/public/tenant-config` pentru interoperabilitate sigură.
   - Actualizat `spa_fallback` pentru a injecta dinamic datele și favicon-ul cu MIME type corespunzător (`image/png` sau `image/svg+xml`).

4. **React App (`frontend/src/App.jsx`):**
   - Asigurat update dinamic al atributului `link.type` pentru a preveni respingerea favicon-ului PNG de către browsere când înlocuiesc SVG-ul.

---

## 2026-09-05 (Configurare WhatsApp Hibrid: UltraMsg Devis + Meta Chat, Token Permanent și UI Chat)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat explicit de Utilizator.

### Modificări Efectuate:
1. **Modul Hibrid WhatsApp (`backend/app/services/whatsapp_service.py`):**
   - **Devize noi (`send_quote_whatsapp`):** Trimiterea de devize se face primar prin **UltraMsg** (fără constrângeri de template Meta sau fereastră de 24h). Dacă UltraMsg eșuează sau nu e configurat, se încearcă fallback pe Meta. S-a adăugat suport pentru mesaje traduse în FR, NL, RO și EN.
   - **Chat interactiv (`send_chat_text_whatsapp`):** Trimiterea din chat folosește primar **Meta Cloud API** (pentru a asigura bifele native de citire `✓✓`, sincronizarea traducerilor și emoji reactions). În caz de eroare Meta, se face fallback automat pe UltraMsg.
   - **Token Permanent Meta:** Configurat System User `Adminjk` cu token permanent (fără expirare) pe Railway și local.
   - **UltraMsg integrat:** Instanța `#190717` autentificată și salvată pe Railway și local.
2. **UI Chat Admin (`WorkOrderDetail.jsx` & `AdminChats.jsx`):**
   - **Contrast Oră și Bife:** Adăugată pastilă cu fundal deschis (`bg-white/95 shadow-xs px-2 py-0.5 rounded-full`) sub oră și bife pentru a elimina problema contrastului scăzut pe bula albastră. Bifele de citire sunt acum albastru WhatsApp intens (`text-sky-600`), iar cele de livrare sunt gri WhatsApp.
   - **Zero Suprapunere:** Separarea barei de acțiuni (ștergere, editare, ascundere, reacție) de pastila cu emoji-uri prin adăugarea automată a spațierii `mt-3.5` când există reacții.


### Modificări Efectuate (Frontend & Backend):
1. **Previzualizare Documente (PDF & Deviz Dinamic):**
   - S-a adăugat componenta `WorkOrderPdfModal` pentru a afișa fișierele PDF reale (facturi/proforme) din baza de date (`pdf_path`, `final_invoice_path` etc.).
   - S-a modificat modalul pentru a randa **dinamic** componenta `<ProformaView>` în cazul în care lucrarea este manuală și NU are un PDF fizic, păstrând exact funcționalitatea veche cu care era obișnuit utilizatorul (fără a mai afișa eroarea de "PDF inexistent").
2. **Reparare Prețuri Preferențiale și Respectarea Motorului Unic de Calcul:**
   - **Problema:** În `ProformaView.jsx`, operatorul logic `||` anula valorile de preț setate pe `0` EUR pentru materialele clienților preferențiali (ex. Fibre + Duramint la clientul BV ISOFLEX), forțându-le la un alt preț (etalonul din frontend de 2.50 EUR).
   - **Rezolvarea:** Logica a fost înlocuită cu funcția centrală `getPrice` din `pricingEngine.js` care respectă explicit valoarea `0`, fixând devizele manuale unde totalul era supraevaluat (rezolvat calculul de 730 EUR în loc de 855 EUR).
   - **Lecție Învățată & Regulă Reconfirmată:** Utilizatorul a reiterat cu fermitate existența unui **Motor Unic de Calcul**. NU trebuie să existe formule de calcul sau prețuri fallback ascunse (hardcodate) în sute de fișiere diferite. Orice calcul trebuie să treacă prin `pricingEngine.js` și să extragă valorile **exclusiv** din pagina de Tarife (Pricing Settings).
3. **Corectare Traduceri (Proforma):**
   - Adăugat cheile de traduceri franceze lipsă în funcția `tL` (`total_label`, `quote_comment_1..4`), reparând afișarea numelor variabilelor brute direct pe interfață.
4. **Filtre Interfață (Client Detail):**
   - Implementate filtre funcționale pe `ClientDetail.jsx`: Filtrare pe bază de **Status** (În planificare, Confirmat, etc.) și pe **Perioadă** (Luna curentă, Luna trecută, Anul curent, Personalizat).
5. **Rezolvare Bug-uri (React Hooks):**
   - Reparat eroarea de tip crash (`Rendered more hooks...`, `photos is not defined`, `work_orders is not defined`) prin ordonarea corectă a apelurilor de tip Hook la începutul funcției de render.

---

*Notă: Orice modificare viitoare pe proiect va fi documentată în acest fișier sub o nouă rubrică de dată/oră, incluzând specificarea prealabilă a stării de aprobare de către utilizator.*

## 2026-08-18 (Fix missing pending quotes & hide surface labels)
- **Probleme rezolvate:** 
  1. Frontend-ul afișa panoul de devize gol deși datele existau. Cauza: portul 8000 era ocupat de un alt proiect (`Axis v1`), în timp ce `vite.config.js` pentru proiectul curent proxy-a către `8001`, port la care nu rula niciun backend. Am corectat prin rularea corectă a uvicorn-ului pe portul 8001, restabilind comunicarea API-ului.
  2. Modificarea cerinței vizuale prin care clientul voia să ascundă numele explicit ("Chape", "Șapă") din interfața de detaliu a comenzii (ex. în `WorkOrderDetail.jsx`) folosind doar formatele anonime de tip "Surface 1", "Surface 2". S-a folosit o verificare regex `/chape|[sșş]ap[aăâ]/i`.
- **Aprobare Utilizator:** Modificările au fost discutate și aprobate de utilizator, fiind confirmate prin execuția `git push`.
- **Lecții învățate:** 
  1. Când o interfață (sau secțiuni mari din ea) rămân brusc goale în modul de dezvoltare locală, trebuie neapărat verificat proxy-ul din Vite față de portul pe care rulează FastAPI. Aici, o aplicație terță bloca 8000.
  2. Tratarea datelor Apple/Safari cere ca datele `YYYY-MM-DD HH:MM:SS` să fie transformate conform standardului ISO cu `T` la mijloc.

## 2026-08-18 (Fix NaN error on Fiber pricing display)
**Problem:** In the WorkOrderDetail invoice section, the `Fibres / Duramint` line was displaying `NaN` for the rate when the fiber price was explicitly set to 0. This was caused by an inline ternary condition attempting to calculate the rate manually without fallback.
**Solution:** Refactored `computeChapeTotal` to return all individual rates (`baseRate`, `extraRate`, `fiberRate`) alongside the totals. Updated the UI rendering block to use these clean properties (`autoCalc.fiberRate.toFixed(2)` and `autoCalc.extraRate.toFixed(2)`) instead of doing unsafe inline math and divisions.

## 18 August 2026 (Fix Edit Modal Volumes and Analytics Fiber Calculation)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat pentru `git push` de către utilizator.

### Modificări Efectuate:
1. **Frontend (`WorkOrderDetail.jsx`):**
   - Am corectat funcția `handleCalcEditSave` care salva greșit cantitățile cu 0 din cauză că variabilele structurii vechi (`surface`) fuseseră înlocuite cu structura nouă array (`chapes`) în sesiunile anterioare.
   - Am actualizat calculul și extragerea metadatelor specifice fiecărei poziții de lucrare la salvarea modicului de editare. Aceasta rezolvă bug-ul critic prin care volumele deveneau "0" și dispăreau din platforma de echipe (planning) a lui Petrea/Iulian.
2. **Backend (`pricing_engine.py` și `admin_work_orders.py`):**
   - **Problema:** Pe ecranul de *Analiză Devize (Pricing Analytics)* se afișa o diferență constantă în plus de preț (ex. +146.00 €) între prețul salvat și cel recalculat de Python pentru clienți precum *Eugeniu Cazmal*.
   - **Cauza:** În versiunea veche de backend, `pricing_engine.py` adăuga prețul fibrei/duramint necondiționat pe orice metru pătrat, iar `admin_work_orders.py` la formarea payload-ului pentru Analytics uita să extragă bifarea reală `has_fiber`.
   - **Soluția:** Am modificat `admin_work_orders.py` să încarce flag-urile reale (`has_fiber`, `has_duramint`) din DB în modul de audit și am pus condiții explicite de verificare în `pricing_engine.py` pentru a preveni adăugarea din oficiu a fibrei. Costurile pentru fibră, folie și grosimi adiționale se raportează acum la nivel granular (per poziție, nu per deviz global).

## 19 August 2026 (Securizare Devize Publice și Analiză Diferențe Pricing)
**Agent:** Antigravity (AI) + Utilizator
**Status Aprobare:** Aprobat.

### Modificări Efectuate:
1. **Backend (`public_work_orders.py`):**
   - Am injectat `pricingSettings` direct în răspunsul endpoint-ului public de vizualizare (fără autentificare) a devizului și proformei.
   - Motivul: Dacă un client preferențial deschidea link-ul public înainte ca un admin să acceseze „Calcul Cost” pe platformă, PDF-ul nu avea de unde să știe tarifele lui preferențiale și randa cu 0 EUR sau cu prețurile standard greșite.
2. **Frontend (`DevisView.jsx` & `ProformaView.jsx`):**
   - Am adăugat logica care citește `pricingSettings` din payload-ul primit de la endpoint-ul public, sărind peste cererea extra (care era blocată de lipsa token-ului).
   - Acum primul deviz este garantat 100% corect din punct de vedere al discount-urilor și setărilor de client, direct din prima secundă, chiar dacă adminul nu l-a deschis/validat niciodată manual.
3. **Frontend (`pricingEngine.js` - Fixat de Utilizator):**
   - Pe baza explicațiilor despre discrepantele din pagina „Analiză Devize”, utilizatorul a intervenit și a rescris ierarhia de priorități în `pricingEngine.js`.
   - Modificarea impune ca motorul de calcul să caute prima dată în `wo.prices` (snapshot-ul de la momentul creării devizului/override-ul manual) pentru orice variabilă (inclusiv threshold-uri, EPS, discount-uri) și să folosească `pricingSettings` (tariful general actual) DOAR ca ultim fallback.
   - Astfel, `PricingAnalytics` aliniază calculele istorice cu cele teoretice, eliminând discrepanțele false de +146 EUR.

## 19 August 2026 - Pricing Analytics Layout Fixes
- **Acțiune**: Am adăugat coloanele `TVA` și `TOTAL TTC` în tabelul principal `DataTable` din pagina `PricingAnalytics.jsx`.
- **Acțiune**: Am eliminat cutiile gigantice de comparație din interiorul modalului `PricingAnalytics`.
- **Acțiune**: Am refăcut complet tabelul de materiale din interiorul modalului `PricingAnalytics` pentru a oglindi perfect structura de grid, spațierile și culorile generate în PDF (`DevisView.jsx`), eliminând tabelele clasice HTML.
- **Acțiune**: Am adăugat clasa `whitespace-nowrap` pe toate rândurile de preț pentru a preveni trecerea semnului Euro pe rândul următor.
- **Aprobare Utilizator**: Modificările vizuale au fost realizate la cererea expresă a utilizatorului, care a confirmat structura așteptată ("exact ca în PDF"). 
- **Lecție Învățată**: Pagina de analiză devize are nevoie de consistență totală cu PDF-ul, nu trebuie folosite elemente UI disproporționate care aglomerează modalul, și trebuie respectate cu strictețe formatele de monedă.

- **Acțiune**: Am reparat logica de calcul TVA în backend (`backend/app/services/pricing_engine.py`) pentru a fi 100% identică cu cea din frontend (`frontend/src/utils/pricingEngine.js`). Backend-ul ignora override-urile de `vat_type` (ex. TVA 0 forțat sau 21%) salvate pe deviz, ceea ce cauza discrepanța dintre PDF (TVA 21%) și Analiză Devize (TVA -/0).
- **Acțiune**: Am adăugat traducerile lipsă în limba română (`ro.json`) pentru capetele de tabel din `PricingAnalytics` (care apăreau în franceză chiar și când limba era setată pe RO, din cauză că fallback-ul standard e mereu în franceză).
- **Acțiune**: Am eliminat iconița de "External Link" de lângă numele clientului din tabelul principal al paginii `PricingAnalytics` la cererea utilizatorului pentru a curăța interfața vizual.
- **Acțiune**: Am eliminat cutiile uriașe roșii și verzi de alertă (diferență detectată) de la baza modalului din `PricingAnalytics`, respectând interdicția strictă din regulile proiectului (`AGENTS.md`) care obligă ca acel modal să reflecte strict un PDF curat.
- **Acțiune**: Am adăugat o coloană nouă numită `PDF` la finalul tabelului principal din `PricingAnalytics`. Aceasta conține un buton de descărcare/vizualizare directă care deschide PDF-ul devizului sau proformei într-un tab nou, fără a mai fi necesară deschiderea modalului de detalii.


### 19 August 2026 - Fixed 500 Internal Server Error on Save
- **Issue**: Saving the calculations (discount/client type) in `WorkOrderDetail.jsx` threw a `500 Internal Server Error`.
- **Cause**: The backend route `update_work_order` (`backend/app/api/admin_work_orders.py`) tried to parse `float((wo.prices or {}).get("discount_pct", 0))` directly. If a previous version of the frontend saved an empty string `""` in the database, `float("")` crashed with a `ValueError`.
- **Fix**: Added a `_safe_float(val, default=0.0)` helper function in `update_work_order` to safely parse values and default to `0.0` when encountering empty strings or `None`.
- **Status**: Fixed.

## 2026-08-19: Frontend UI/UX fixes and Bug Fixes
- Fixed PDF preview opening in a new tab instead of modal in PricingAnalytics
- Fixed preferential client pricing discrepancy (WorkOrderDetail now fetches client-specific pricingSettings instead of global ones)
- Fixed 'vatRate is not defined' ReferenceError in WorkOrderDetail
- Approved by user and pushed to main branch

- **Date**: 19 August 2026
- **Actions**: Fix pricing discrepancy by loading PricingSettings in backend audit mode. Fix VAT initialization in frontend UI to respect PricingSettings conditions instead of hardcoding. Fix visibility of un-scheduled online Devize for site managers. Show Surface and Thickness (from volumes) on Worker card.
- **Confirmed**: Pushed successfully.
- **Date**: 19 August 2026
- **Actions**: Updated MobileAgenda (Map View) to remove Team Name pill and injected Surface / Thickness details for all materials (Chape/Iso).
- **Confirmed**: Pushed successfully.
- **Date**: 19 August 2026
- **Actions**: Removed 'Chat' and 'Devis' tabs and notification buttons from the Worker/Team Leader order detail view (WorkerOrdersPage.jsx) as it was a security/privacy breach.
- **Confirmed**: Pushed successfully.
- **Date**: 19 August 2026
- **Actions**: Replaced placeholder colored circles for materials in MobileAgenda with the standard application icons (Wind for PUR, Thermometer for EPS, Layers for Chape).
- **Confirmed**: Pushed successfully.
- **Date**: 20 August 2026
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat pentru `git push` de către utilizator.
- **Acțiune**: Am refăcut modalul de Quick Create (AdminOverview.jsx) pentru a susține adăugarea dinamică a Izolațiilor, separat de Șapă.
- **Acțiune**: Am înlocuit dropdown-ul de selecție PUR/EPS cu două card-uri mari, clare, folosind iconițele `Wind` (PUR) și `Thermometer` (EPS) și am setat iconița `Layers` pentru Șape. Mărimea iconițelor a fost ajustată (`w-5 h-5`) pentru a corespunde mockup-ului original.
- **Acțiune**: Am reparat logica de disabled a butonului "Confirmă Comanda", permițând utilizatorilor să trimită comanda chiar dacă rămân cutii ("Suprafața 1") necompletate, atâta timp cât cel puțin o cutie este corect completată.
- **Acțiune**: Am eliminat butonul confuz de "Aplică TVA" manual din moment ce motorul de prețuri face acest calcul automatizat în funcție de tipul clientului și al lucrării (Nouă vs Renovare).
- **Acțiune**: Am reparat numărătoarea secvențială a Șapelor (Șapă 1, Șapă 2, etc.) ignorând interpunerile de cutii de Izolații, atât vizual în interfață cât și în volumele trimise către baza de date pentru generarea devizului corect.
- **Acțiune**: Am corectat traducerea pentru "One way" în "Dus" pentru fișierul `ro.json`.
- **Date**: 20 August 2026
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat implicit de utilizator prin comanda curentă.
- **Acțiune**: Am ascuns eticheta cu numele echipei (`#1 Echipa Petrea`) din MobileAgenda pentru Șeful de Echipă (WorkerOrdersPage.jsx), afișând-o doar pentru Admini și Șoferi.
- **Acțiune**: Am mutat data lucrării din interiorul primului rând de materiale (unde apărea lângă "Chape 1") direct pe linia de titlu "Détails du travail" și am adăugat iconița de Vreme aliniată la dreapta, curățând astfel aspectul rândurilor de cantități.
- **Date**: 20 August 2026
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat implicit de utilizator prin comanda curentă.
- **Acțiune**: Am adăugat cantitatea de nisip (ex. "15.0 t") imediat lângă distanța în kilometri pe cardurile hartă din `MobileAgenda.jsx`, afișându-se cu culoarea specifică chihlimbar (amber) pentru vizibilitate.
- **Date**: 20 August 2026
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat implicit de utilizator.
- **Acțiune**: Am eliminat spațiul gol rămas după ascunderea numelui echipei în `MobileAgenda.jsx` pentru șefii de echipă. Când numele echipei lipsește, numele clientului (ex. "Eugeniu Cazmal") urcă automat pe primul rând în stânga, iar kilometrii, cantitatea de nisip și vremea rămân frumos aliniate în dreapta. Acest lucru economisește spațiu vertical prețios pe ecranul telefonului.

- **Date**: 20 August 2026
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat explicit de utilizator prin comanda "push".
- **Acțiune**: Am reparat sincronizarea limbii (client_language) pentru devize. Backend-ul (public_calculator.py) actualizează acum corect profilul clienților recurenți, iar panoul de admin (admin_work_orders.py) nu mai suprascrie invizibil limba devizelor cu limba veche din profilul clientului la fiecare actualizare a documentului.
- **Acțiune**: Am integrat calculul prețului pentru izolația EPS bazat pe Suprafețe (mp) în `priceCalculator.js` și `pricingEngine.js` utilizând variabila `custom_eps_price_per_m2`, pentru a acoperi cazurile în care prețul per volum (mc) nu se aplică.
- **Acțiune**: Am actualizat textele din fișierele de traducere `i18n` pentru `truck_distance_sub`, specificând explicit în toate limbile că distanța luată în calcul este "doar dus" (ex. "Si trajet (aller simple) > km").

- **Date**: 23 August 2026
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat explicit de utilizator.
- **Acțiune**: Am rafinat design-ul cardurilor din calendarul desktop (`ShortWorksCalendar.jsx`). S-a forțat header-ul să acopere toată lățimea cu un background colorat, s-a clarificat numerotarea pentru multiple straturi de Șapă (Chape 1, Chape 2), s-a adăugat calculul explicit al `Total` suprafeței la nivelul header-ului, s-a adăugat linia despărțitoare subtilă deasupra adresei (asemenea `MobileAgenda`), iar miniatura hărții a fost mutată complet în dreapta-jos. 
- **Acțiune**: Am scos funcționalitatea automată prin care, la drag&drop al unui client favorit pe grid, adresa lucrării se autocompleta cu sediul social al clientului (generând adrese eronate de tip "Belgique"). Adresa este acum curată și așteaptă adresa reală a șantierului.
- **Acțiune**: Am creat un backup imutabil al logicii și design-ului de card în `.agents/calendar_card_design_v2.md` pentru a proteja modificările de viitoare suprascrieri accidentale de către alți agenți.

## 24 August 2026 - Critical Deadlock Fix & Calendar Auto-Scroll
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat explicit de utilizator.
- **Acțiune**: (Backend) Am descoperit și reparat o problemă critică de Deadlock în baza de date. Rutelor de API pentru GPS (`/admin/vehicles/live` și `/worker/location`) li se adăugaseră anterior logici care rulau `ALTER TABLE` la fiecare interogare (la fiecare 30 secunde), ceea ce solicita `AccessExclusiveLock` continuu pe tabel, blocând total restul platformei (încărcare de devize, lucrări) cu erori de tip `Statement Timeout`. Am șters `ALTER TABLE` din API, lăsând aceste migrări să ruleze exclusiv la pornirea serverului în `main.py`.
- **Acțiune**: (Backend) Am reparat configurația bazei de date. Din cauza deadlock-ului anterior, se trecuse la `NullPool` (fără reutilizare de conexiuni) care deschidea zeci de fire simultan, sugrumând baza de date Supabase/Render. Am revenit la `QueuePool(pool_size=15, max_overflow=30)` care menține performanța ridicată fără a satura TCP-ul.
- **Acțiune**: (Frontend) Am corectat logica de `auto-scroll` în `ShortWorksCalendar.jsx`. Calendarul rula un timeout ascuns de 1 secundă care, dacă datele întârziau din cauza serverului lent, forța scroll la ora 09:00 și îngheța (bloca) interfața acolo, ignorând apariția ulterioară a devizelor de la ora 07:00 sau 08:00. Acum așteaptă prezența datelor reale înainte de a derula inteligent la prima lucrare de dimineață.
- **Aprobare**: S-a dat push pe producție pentru a salva platforma picată.

## 04 Septembrie 2026 - Integrare Oficială WhatsApp Meta Cloud API (Devize Trilingve cu PDF)
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat explicit de utilizator (comenzi "ok", "ok push").
- **Acțiuni Efectuate**:
  1. **Configurare Meta for Developers & WhatsApp Business API**:
     - Creat aplicația `Davide Chape Devize` legată la portofoliul de afaceri `Davide Chape`.
     - Validat numărul de test și webhook-ul prin handshake criptat cu Meta (`hub.challenge` și `hub.verify_token = davide_whatsapp_secret_2026`).
     - Creat modelul oficial de mesaj `devis_client` de tip Utilitare cu suport pentru antet document PDF și variabile dinamice pentru client (`{{1}}`) și link-ul de semnare/confirmare (`{{2}}`).
     - Înregistrat toate cele 3 limbi suportate de platformă: **Franceză (FR)**, **Olandeză (NL)** și **Engleză (EN)**.
  2. **Implementare Backend (`whatsapp_service.py`)**:
     - Dezvoltat funcția `normalize_phone_number` pentru conversia inteligentă a numerelor locale din Belgia (`04...` -> `324...`), Franța (`06/07...` -> `33...`) și internaționale.
     - Implementat funcția `send_quote_whatsapp` prin Meta Graph API `v21.0/{phone_number_id}/messages` cu payload JSON de tip `template` (`devis_client`), trimițând fișierul PDF atașat la antet și link-ul securizat de confirmare în corpul mesajului.
  3. **Integrare Formulare Publice**:
     - `devis_online.py`: Declanșează automat trimiterea WhatsApp imediat după ce Playwright generează PDF-ul devizului pe disc.
     - `public_calculator.py`: Declanșează automat trimiterea WhatsApp similar, menținând separarea strictă și izolarea arhitecturală a celor două sisteme (conform Regulii 12).
     - `webhooks.py`: Rute dedicate `GET /api/webhooks/whatsapp` (verificare handshake Meta) și `POST /api/webhooks/whatsapp` (preluare răspunsuri/replies ale clienților direct în `WorkOrderMessage`).
  4. **Deployment**:
     - Modificările de cod au fost verificate local prin compilare Python și teste unitare de normalizare, comise și urcate pe GitHub prin commit-urile `335d424` și `db9d9f5`.
     - Variabilele de mediu au fost configurate în Railway și `.env`.

## 05 Septembrie 2026 - Conectare Chat WhatsApp, Fix Numerotare Secvențială (DEV1034+) și Upload PDF Supabase
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat explicit de utilizator ("DA!111" și instrucțiuni succesive).
- **Acțiuni Efectuate**:
  1. **Rezolvare Numerotare Secvențială (Eliminare DEV1000 repetitiv)**:
     - **Problema**: Codul vechi rula `func.max(WorkOrder.quote_number)` în SQL pe un câmp `String`. SQL sorta alfabetic (`'DEV999' > 'DEV1033'`), returnând perpetuu `'DEV999'`, ceea ce forța `999 + 1 = 1000` pentru fiecare deviz nou creat.
     - **Soluția**: Creat serviciul centralizat `backend/app/services/sequence_service.py` (`get_next_quote_number` și `get_next_invoice_number`) care extrage valorile numerice reale (Integer) din istoricul complet și returnează garantat `MAXIM ISTORIC + 1`.
     - Integrat noul serviciu în `devis_online.py`, `public_calculator.py` și `admin_work_orders.py`.
     - Renumerotat cele 3 devize duplicate existente în baza de date cu confirmarea utilizatorului: `DEV1034` (Fat Frumos), `DEV1035` (Eugeniu Cazmal) și `DEV1036` (Eugeniu Cazmal). Următorul deviz va fi automat `DEV1037`.
  2. **Încărcare Automată PDF în Cloud Storage (Supabase) & Fallback WhatsApp**:
     - În `whatsapp_service.py`, adăugat încărcarea automată a fișierelor PDF locale pe Supabase Storage (`upload_file`) pentru a genera URL-uri HTTPS publice accesibile de către Meta.
     - Implementat fallback automat către mesaj direct de tip `document` dacă șablonul `devis_client` se află în status `PENDING` la Meta, garantând livrarea instantanee a devizului cu fișier PDF și link de semnare.
  3. **Conectare Chat Admin la Meta Cloud API & Trimitere Strictă în Limba Clientului**:
     - Upgradat funcțiile `send_chat_text_whatsapp` și `send_chat_attachment_whatsapp` din `whatsapp_service.py` să folosească Meta WhatsApp Cloud API (Graph API v21.0).
     - **Fix Traduceri Chat**: Anterior, backend-ul trimitea pe WhatsApp textul brut `payload.message` (draft-ul în română al adminului), ignorând traducerea generată. Am modificat `admin_work_orders.py` să trimită pe WhatsApp obligatoriu versiunea tradusă (`target_lang` sau `client_language` - Franceză/Olandeză/Engleză), respectând regulile stricte ale proiectului.

### 05 Septembrie 2026 - Fix Traducere (Buton Glob) și Sincronizare Chat în Timp Real
- **Problemă raportată**:
  1. Utilizatorul a sesizat că apăsarea butonului Glob nu mai traducea textul.
  2. Mesajele din chat nu apăreau automat în timp real decât după un refresh manual (F5) al paginii.
- **Cauză tehnică identificată**:
  1. `deep_translator` apela vechiul web scraper Google Translate (`translate.google.com/m`) care a returnat pagină HTML de eroare 500 (`Error 500 Server Error`), blocând endpoint-ul `/api/admin/translate`. În plus, trimiterea de mesaje întârzia câte 9 secunde din cauza celor 3 retry-uri eșuate pe `fr`, `nl`, `en`. De asemenea, codurile de limbă trimise cu majuscule (ex. `FR`) nu erau normalizate.
  2. În interfață, intervalul de polling era setat prea rar (4 secunde), iar la schimbarea tab-urilor/revenirea în pagină nu exista un trigger de `focus`/`visibilitychange`. În pagina dedicată de chat (`/admin/chats`), lista din stânga nu se actualiza automat în fundal, iar afișarea mesajelor provoca re-randări continue din cauza lipsei comparației de stare.
- **Soluție implementată**:
  1. Creat `app/services/translation_service.py` folosind direct API-ul rapid Google Translate GTX (`translate.googleapis.com`), cu suport de normalizare automată a codurilor de limbă (`FR` -> `fr`) și fallback elegant. Răspunsul este acum instant (sub 0.1s), fără erori 500.
  2. Actualizat `admin_work_orders.py` la toate endpoint-urile (`/translate`, trimitere și editare mesaje) să folosească `translation_service`.
  3. Redus intervalul de polling pentru chat la 2 secunde în `WorkOrderDetail.jsx` și `AdminChats.jsx`, adăugat listeneri de `focus` și `visibilitychange` (reîmprospătare instantanee când revii pe tab din WhatsApp), și optimizat `HeaderNotifications.jsx` la 6 secunde cu trigger instant la revenirea în fereastră.
  4. Corectat `api.js` pentru Super Admin pe `localhost` să injecteze corect `X-Tenant-Subdomain` din `tenant-storage`.

### 05 Septembrie 2026 - Statusuri Livrare WhatsApp (✓/✓✓), Fallback Email și Reacții Emoji
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat de Utilizator (plan de implementare `implementation_plan.md` aprobat explicit).
- **Probleme adresate**:
  1. Utilizatorul nu putea vedea statusul mesajelor trimise către client (dacă a fost trimis, livrat sau citit ca în WhatsApp).
  2. Nu exista un indicator clar când clientul nu are număr de WhatsApp și mesajul a fost transmis pe Email.
  3. Reacțiile cu emoji puse de admin din interfață nu se sincronizau pe telefonul clientului în WhatsApp.
- **Modificări implementate**:
  1. **Webhook Meta Cloud API (`webhooks.py`)**:
     - Conectat evenimentele `statuses` trimise de Meta (`sent`, `delivered`, `read`, `failed`). La fiecare actualizare, mesajul corespunzător este identificat prin `translations->>'_wamid'` și statusul este actualizat direct în baza de date.
     - Conectat evenimentele `messages` de tip `reaction` trimise de Meta când clientul reacționează din WhatsApp, actualizând dicționarul `reactions` al mesajului.
  2. **Trimitere Mesaje & Fallback Email (`admin_work_orders.py` & `whatsapp_service.py`)**:
     - `send_chat_text_whatsapp` returnează acum `wamid`-ul emis de Meta Graph API v21.0 și este stocat în mesaj.
     - Dacă trimiterea pe WhatsApp eșuează sau clientul nu are număr de telefon setat, se declanșează automat trimiterea notificării pe Email (`send_chat_notification_email`), iar mesajul este marcat cu `delivery_channel = 'email'` și `delivery_status = 'email_sent'`.
     - Adăugată funcția `send_whatsapp_reaction(phone_number, message_wamid, emoji)` în `whatsapp_service.py` și conectată în endpoint-ul `/react` din `admin_work_orders.py`: la adăugarea sau eliminarea unei reacții emoji de către admin, aceasta este expediată instantaneu către WhatsApp pe telefonul clientului.
  3. **Interfață Utilizator (`WorkOrderDetail.jsx` & `AdminChats.jsx`)**:
     - Adăugate iconițe de status lângă ora fiecărui mesaj trimis de admin:
       - ✉️ `Mail` (cu tooltip *"Transmis pe Email (clientul nu are WhatsApp)"*) când canalul este email.
       - ✓ `Check` (un bifat) când mesajul a fost trimis.
       - ✓✓ `CheckCheck` gri când mesajul a fost livrat pe telefonul clientului.
       - ✓✓ `CheckCheck` bleu/cyan intens (`text-sky-300`) când mesajul a fost citit de către client în WhatsApp.

### 05 Septembrie 2026 - Descărcare Directă PDF, Număr Deviz în WhatsApp și Alerte Grup Companie
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat de Utilizator (utilizatorul a aprobat explicit testarea și publicarea).
- **Probleme adresate**:
  1. Utilizatorul dorea descărcarea directă a PDF-ului devizului pe calculator, fără deschiderea ferestrei browserului de imprimare.
  2. Numărul devizului (DEV...) lipsea din mesajele automate WhatsApp către client, îngreunând căutarea rapidă a conversațiilor în WhatsApp.
  3. Directorul General și Directorul de Vânzări doreau să primească toate alertele de deviz nou, confirmare și mesaje de la clienți direct într-un grup intern de WhatsApp (`Davide Chape APP`), având link direct pentru a răspunde clientului privat.
  4. Mesajele din chat-ul cu clientul erau trimise de pe numărul de test Meta Cloud API din SUA (+1 555...), creând confuzie.
- **Modificări implementate**:
  1. **Frontend - Descărcare directă PDF (`WorkOrderDetail.jsx`)**:
     - Integrat pachetul `html2pdf.js` pentru salvarea directă a devizului/facturii ca fișier `.pdf` (fără pop-up de print al browserului).
     - Butoanele « Télécharger PDF » din bara de facturare și din sertarul mare (drawer) descarcă acum instant fișierul cu denumirea curată `{quote_number}_{client_name}.pdf`.
     - Tab-urile DEVIS și FACTURE afișează numărul documentului (`DEVIS · DEV...` / `FACTURE · INV...`).
  2. **Backend - Număr Deviz în WhatsApp Client (`whatsapp_service.py`)**:
     - Mesajul transmis clientului include acum explicit: `📄 Numéro de devis : {quote_number}` în toate limbile suportate (FR/RO/NL/EN).
  3. **Backend - Alerte Grup WhatsApp (`devis_online.py`, `public_work_orders.py`, `webhooks.py`)**:
     - Configurat grupul companiei `Davide Chape APP` (`120363427568793073@g.us`).
     - La deviz nou: grupul primește alertă cu numărul devizului, clientul, adresa șantierului, suma și buton/link direct `https://wa.me/{phone}`.
     - La deviz confirmat: grupul primește alertă cu confirmarea, semnatarul, data dorită și linkul în aplicație.
     - La mesaj primit de la client: webhook-ul redirecționează mesajul în grup cu link direct pentru ca oricare director să poată da tap și să răspundă privat de pe propriul WhatsApp.
     - Prevenite buclele infinite și mesajele de grup în webhook prin filtrarea `@g.us` și `from_me`.
  4. **Backend - Chat exclusiv de pe numărul oficial UltraMsg (`whatsapp_service.py`)**:
     - Eliminat numărul de test Meta (+1 555...) din `send_chat_text_whatsapp` și `send_chat_attachment_whatsapp`. Chat-ul cu clientul se trimite acum strict de pe numărul companiei prin UltraMsg.

### 05 Septembrie 2026 - Trimitere în Planning din Devis en attente & Clarificare Dată Solicitată vs. Dată Definitivă
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat de Utilizator.
- **Probleme adresate**:
  1. În ecranul de Planning (`AdminOverview.jsx`), în tabelul din modalul « Devis en attente », la click pe iconița de calendar utilizatorul era redirecționat în pagina de detalii deviz, în loc să se deschidă modalul de atribuire directă în calendar/planning.
  2. Când un client confirmă/semnează un deviz, data aleasă de client este doar o dată dorită/solicitată, nu o dată definitivă garantată de firmă. Atât pe ecranul clientului, cât și pe email și pe grupul intern de WhatsApp apărea ca o dată confirmată, creând confuzie.
- **Modificări implementate**:
  1. **Frontend - Trimitere directă în Planning din « Devis en attente » (`AdminOverview.jsx`, `fr.json`)**:
     - Conectat butonul cu iconiță de calendar (`CalendarDays`) pentru a deschide direct modalul de planificare (`planningModal`), randat peste tot cu `createPortal(..., document.body)` și `z-[10001]`.
     - Adăugată iconiță separată `Eye` (« Voir les détails ») pentru navigare în fișa devizului.
  2. **Frontend - Ecran Confirmare Client (`WorkOrderConfirm.jsx`)**:
     - Pe bannerul verde de confirmare a fost adăugat mesajul profesionist: *« Merci pour votre confiance ! Votre commande a bien été enregistrée avec votre date souhaitée. Notre équipe de planification prendra contact avec vous dans les plus brefs délais afin de valider ensemble la date définitive d'intervention. »*
     - La secțiunea de dată, eticheta afișează clar *« Date souhaitée »* însoțită de nota *« En attente de validation par l'équipe Davide Chape »*.
     - Eliminat butonul roșu prin care clientul își putea confirma singur data în mod unilateral.
  3. **Backend - Email Confirmare Comandă (`email_service.py`)**:
     - Adaptate textele în FR, NL și EN pentru a preciza clar că data înregistrată este *« date souhaitée d'intervention »* și că echipa de planificare îl va contacta pentru data definitivă.
  4. **Backend - Alertă Grup Companie WhatsApp (`whatsapp_service.py`)**:
     - Mesajul transmis pe grupul intern afișează acum explicit:
       `📅 *Data solicitată de client:* {date}`
       `⚠️ *STATUS DATĂ:* Neconfirmată încă! Data este doar o solicitare a clientului.`
       `👉 *Acțiune:* Davide Chape trebuie să valideze data și să adauge lucrarea în planning.`
     - Adăugat link direct către Google Maps sub adresa șantierului în ambele alerte (deviz nou & deviz confirmat):
       `🗺️ *Deschide în Google Maps:* https://maps.google.com/?q={address}`
       permițând deschiderea instantanee a navigației la o simplă atingere din WhatsApp pe orice telefon sau PC.
     - Adăugată distanța de la bază (`🚗 *Distanță de la bază:* {distance_km} km`) calculată automat față de baza logistică a companiei, afișată direct sub adresa șantierului în alertele WhatsApp de grup.
      - Adăugat bloc detaliat cu **Suprafețe & Grosime** și **Materiale & Opțiuni bifate de client** în ambele alerte de WhatsApp (deviz nou & deviz acceptat):
         - `📐 *Suprafețe & Grosime:*` (șapă m² și grosime cm per suprafață, izolații PUR/EPS cu m² și m³).
         - `📋 *Materiale & Opțiuni bifate:*` (strict ce a bifat clientul în deviz: plasă armare cu m², folie PE cu m², fibră / duramint, opțiuni PUR/EPS).

### 05 Septembrie 2026 - Fix Stabilizare Devis Online & Vizibilitate Selector Limbi pe Mobil
- **Agent**: Antigravity (AI)
- **Status Aprobare**: În curs de aprobare / gata de push.
- **Probleme adresate**:
  1. La trimiterea formularului din `/devisonline` (Pasul 5), backend-ul arunca `TypeError: 'distance_km' is an invalid keyword argument for WorkOrder`.
  2. La confirmarea devizului, se încerca scrierea lui `wo.distance_km` direct pe model.
  3. În `frontend/src/i18n/en.json`, mesajul generic de eroare era rămas hardcodat în franceză.
  4. Pe telefoane mobile, selectorul de limbi (FR/NL/EN) din antet nu era vizibil fără scroll sus sau era chiar ascuns complet (`hidden sm:flex` pe ecranul de confirmare).
- **Modificări implementate**:
  1. **Backend (`devis_online.py`)**: Eliminat parametrul invalid `distance_km` din `WorkOrder(...)`. Distanța se citește direct din deviz (`prices['distance_km']`).
  2. **Backend (`public_work_orders.py`)**: Eliminată atribuirea invalidă `wo.distance_km`; distanța se ia direct din devizul salvat.
  3. **Frontend (`en.json`)**: Tradus `"errors.generic"` în engleză (`"An error occurred. Please try again."`).
  4. **Frontend (`DevisOnline.jsx`)**:
     - Header-ul a fost transformat în `sticky top-0 z-40` pentru a rămâne mereu ancorat și vizibil la partea de sus a ecranului pe mobil la orice pas.
     - Logo-ul și selectorul de limbi (cu iconiță Globe, steaguri și butoane tactile FR / NL / EN) sunt afișate compact pe un singur rând, imediat vizibile fără niciun scroll.
  5. **Frontend (`WorkOrderConfirm.jsx`)**:
     - Eliminat `hidden sm:flex` din header: selectorul de limbi este acum vizibil direct și pe mobil.
     - Header sticky cu butoane clare cu steaguri pentru FR, NL, EN.

### 05 Septembrie 2026 - Fix Transmitere & Sincronizare Limbă (Devis Online -> Devis Confirm / PDF)
- **Agent**: Antigravity (AI)
- **Status Aprobare**: În curs de aprobare / gata de push.
- **Probleme adresate**:
  1. Când clientul alegea Olandeza (NL) sau Engleza (EN) în `/devisonline`, pagina de devis (`/public/proforma/:token`) se deschidea automat în Franceză (FR).
  2. Cauza 1: Endpoint-ul `_public_serialize` din backend omitea câmpul `client_language` din JSON, astfel că frontend-ul primea `data.client_language = undefined`.
  3. Cauza 2: `WorkOrderConfirm.jsx` nu sincroniza starea `lang` cu limba salvată a comenzii dacă URL-ul nu avea parametru `?lang=`.
  4. Cauza 3: `navigate()` din `DevisOnline.jsx` redirecționa la `/public/proforma/:token` fără să adauge parametrul `?lang=${chosenLang}`.
  5. Cauza 4: `submit_calculator` din `devis_online.py` genera `proforma_url` fără parametrul de limbă.
- **Modificări implementate**:
  1. **Backend (`public_work_orders.py`)**: Adăugat `client_language` în răspunsul serializat al comenzii (`_public_serialize`).
  2. **Backend (`devis_online.py`)**: Sincronizat `client_language` din payload sau din profilul clientului și adăugat `?lang={resolved_lang}` la `proforma_url`.
  3. **Frontend (`DevisOnline.jsx`)**: Asigurat că `chosenLang` (din `i18n.language` sau `formData`) este trimis către backend, către webhook-ul n8n și către `navigate('/public/proforma/:token?lang=' + chosenLang)`.
  4. **Frontend (`WorkOrderConfirm.jsx`)**: La încărcarea comenzii, dacă URL-ul nu conține un override manual de limbă, `lang` se sincronizează automat cu `data.client_language`.
  5. **Backend (`whatsapp_service.py`)**: Adăugat calculul automat și afișarea necesarului de nisip în tone (`🏖️ *Necesar Nisip:* {sand_tons} tone`) bazat pe formula oficială a firmei (`Suprafață × Grosime × 16 / 1000`), afișat atât la `Suprafețe & Grosime` cât și la `Materiale & Opțiuni bifate`.
### 05 Septembrie 2026 - Numerotare Secvențială Suprafețe Multiple (Șapă 1, Șapă 2 & Izolație 1, Izolație 2)
- **Agent**: Antigravity (AI)
- **Status Aprobare**: În curs de aprobare / gata de push.
- **Probleme adresate**:
  1. Când clientul adăuga 2 sau mai multe suprafețe de șapă sau de izolație, în notificare și în deviz acestea nu erau diferențiate clar cu numere de ordine (ex. *Șapă 1*, *Șapă 2*, *Izolație PUR 1*, *Izolație PUR 2*).
  2. În formularul de deviz online (`DevisOnline.jsx`), dacă se adăugau mai multe suprafețe, nu exista un indicator vizual/badge care să arate clientului care este suprafața 1 și care este suprafața 2.
  3. În alerte și în devizul tipărit/PDF, liniile de deviz trebuiau să reflecte fidel numerotarea fiecărei suprafețe în limba corespunzătoare (FR, NL, EN, RO).
- **Modificări implementate**:
  1. **Frontend - Formular Devis Online (`DevisOnline.jsx`)**:
     - Adăugate badge-uri vizuale distincte deasupra fiecărei suprafețe când există mai mult de una: `Chape 1`, `Chape 2`, etc. și `Isolation 1`, `Isolation 2`, etc.
     - Înainte de trimitere, câmpul `label` este generat automat ca `Chape 1`, `Chape 2` (sau simplu `Chape` dacă e doar o singură suprafață) și `Isolation PUR 1`, `Isolation PUR 2` (sau `Isolation PUR` dacă e una singură).
     - Trimise suprafețele etichetate atât către backend-ul aplicației cât și către webhook-ul n8n.
  2. **Backend - Generare Volume (`devis_online.py` & `pricing_engine.py`)**:
     - Funcția `_build_volumes` atribuie secvențial etichete numerotate (`Chape 1`, `Chape 2`, etc. și `Isolation PUR 1`, `Isolation PUR 2`, etc.) atunci când există multiple suprafețe pe aceeași categorie.
     - `calculate_quote_price` din backend folosește aceleași etichete numerotate pentru defalcarea liniilor de cost.
  3. **Backend - Notificări WhatsApp Admin (`whatsapp_service.py`)**:
     - `format_volumes_and_materials` numără volumele din fiecare categorie (`chape_vols`, `pur_vols`, `eps_vols`).
     - Dacă există multiple suprafețe, afișează automat:
       `• Șapă 1: 90 m² | Grosime: 6 cm`
       `• Șapă 2: 45 m² | Grosime: 8 cm`
       `• Izolație PUR 1: 70 m² | Grosime: 5 cm`
       `• Izolație PUR 2: 35 m² | Grosime: 8 cm`
     - Dacă există o singură suprafață, afișează curat, fără număr:
       `• Șapă: 100 m² | Grosime: 6 cm`
       `• Izolație PUR: 80 m² | Grosime: 7 cm`
  4. **Frontend & Backend - Vizualizare Deviz & Generare PDF (`pricingEngine.js`, `DevisView.jsx`, `pdf_generator.py`)**:
     - În `buildQuoteItems` (`pricingEngine.js`), fiecare suprafață primește descrierea aferentă numărului său de ordine (`Chape 1 - Base`, `Chape 2 - Base`, `Isolation PUR 1`, `Isolation PUR 2`).
     - În `DevisView.jsx` și `pdf_generator.py`, descrierile sunt traduse și numerotate conform limbii documentului (ex: `Pose de chape 1 6 cm`, `Dekvloer leggen 1 6 cm`, `Chape 1 6 cm`, `Isolation PUR 1 8 cm`).

### 05 Septembrie 2026 - Formatare Uniformă Alerte WhatsApp & Afișare Dată Solicitată Lucrare
- **Agent**: Antigravity (AI)
- **Status Aprobare**: În curs de aprobare / gata de push la confirmarea utilizatorului.
- **Probleme adresate**:
  1. În alertele de deviz nou (Deviz Nou Primit!) pe WhatsApp nu apărea deloc data dorită/solicitată pe care clientul a selectat-o în formularul Devis Online (wo.approximate_date).
  2. EPS afișa volumul în loc de suprafață pe primul plan (3.5 m³ (70 m² la 5 cm)), creând impresia că suprafața este de 3.5 mp. Utilizatorul a cerut eliminarea completă a volumului.
  3. În alertele de deviz acceptat și în emailul de confirmare a comenzii, dacă start_date nu era setată încă în planning, data cădea pe None sau À déterminer, ignorând data solicitată de client (approximate_date).
- **Modificări implementate**:
  1. **Backend (whatsapp_service.py)**:
     - În send_admin_new_quote_whatsapp: adăugat parametrul approximate_date și afișat în mesaj: 📅 *Data solicitată de client:* DD/MM/YYYY (sau Nespecificată dacă pasul a fost sărit).
     - În format_volumes_and_materials: eliminat complet volumul (m³) pentru EPS. Acum se afișează uniform: • Izolație EPS: {qty} m² | Grosime: {thick} cm.
  2. **Backend (devis_online.py)**:
     - Extras saved_approximate_date din comandă/payload și transmis către ambele notificări WhatsApp de admin (pe grup și individual).
  3. **Backend (public_work_orders.py)**:
     - Adăugat fallback pe wo.approximate_date pentru date_str atât în emailul de confirmare trimis clientului, cât și în alerta WhatsApp transmisă către grupul de admini.
  4. **Verificare Automată Disponibilitate Planning în Notificare WhatsApp**:
     - Creat funcția get_jobs_count_on_date(target_date, org_id) în whatsapp_service.py.
     - În ambele alerte de WhatsApp (Deviz Nou și Deviz Acceptat), lângă data solicitată se afișează automat dacă ziua este liberă sau ocupată și câte lucrări sunt deja planificate în paranteze:
       * Dacă sunt 0 lucrări: 📅 *Data solicitată de client:* 26/09/2026 (✅ Liber - 0 lucrări)
       * Dacă este 1 lucrare: 📅 *Data solicitată de client:* 26/09/2026 (⚠️ Ocupat - 1 lucrare)
       * Dacă sunt mai multe: 📅 *Data solicitată de client:* 26/09/2026 (⚠️ Ocupat - X lucrări)
     - Afișare clienți existenți în paranteze: dacă în acea zi există deja lucrări, se afișează numele clienților separați prin virgulă (ex: (⚠️ Ocupat - 1 lucrare: Demoulin Laurent) sau (⚠️ Ocupat - 2 lucrări: Client A, Client B)).

### 05 Septembrie 2026 - Vizibilitate Permanentă Header / Antet (Logo & Limbi) pe Mobil
- **Agent**: Antigravity (AI)
- **Status Aprobare**: Aprobat de utilizator ("rezolva baoidebilue").
- **Problema**: Pe dispozitive mobile (iOS Safari), la deschiderea Devis Online, antetul paginii („capul” cu logo-ul Davide Chape și selectorul de limbi FR / NL / EN) nu apărea deloc, formularul începând direct de la indicatorul de pași (Détails, Adresse...). Cauza tehnică: în `DevisOnline.jsx` era copiată logica `isIframe` care injecta `header, nav { display: none !important; }` și ascundea condiționat header-ul.
- **Modificări**:
  1. În `DevisOnline.jsx`: eliminat complet blocul `isIframe` și injecția de stiluri; `<header>`-ul este acum permanent și necondiționat vizibil în capul paginii.
  2. În `PublicCalculator.jsx`: corectată logica `isIframe` pentru a ascunde header-ul exclusiv atunci când rulează într-adevăr într-un iframe extern sau cu parametrul `?iframe=true`, nu și la accesarea directă din browser.
  3. Rulat `npm run build` în `frontend` (compilare cu succes, fără erori).
  4. Corectat referințele reziduale `is_iframe: isIframe` din `handleSubmit` în `DevisOnline.jsx` la `is_iframe: false` pentru a preveni `ReferenceError` la trimiterea devizului.
