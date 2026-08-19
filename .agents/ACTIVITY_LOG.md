# Jurnal de Activitate al Agentului (Activity Log)

Acest fișier reprezintă istoricul modificărilor și acțiunilor întreprinse de asistentul AI pe acest proiect. 
Scopul este asigurarea trasabilității depline: cine a modificat, când a modificat, de ce a modificat și dacă acțiunea a avut sau nu aprobarea utilizatorului.

---

## 16 August 2026 (Astăzi)
**Agent:** Antigravity (AI)
**Status Aprobare:** Aprobat și solicitat de Utilizator (confirmare prin instrucțiuni succesive și comandă finală de "push").

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
