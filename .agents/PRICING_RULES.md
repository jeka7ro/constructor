# MECANISM DE CALCUL PREȚURI ȘI RECOMANDĂRI (PRICING RULES)

Acest document descrie logica strictă a modului în care sunt calculate prețurile pe platforma Davide Chape, cum se face reconcilierea lor în analiza devizelor și cum pot fi modificate de administrator. Orice dezvoltator care lucrează cu prețuri trebuie să respecte aceste reguli pentru a nu crea discrepanțe.

## 1. Sursa Unică de Adevăr (Single Source of Truth)
- **Funcția Principală:** Toate calculele matematice referitoare la prețul devizelor și ofertelor se fac în mod exclusiv prin funcția `calculate_quote_price(payload, pricing_data)` din `backend/app/services/pricing_engine.py`.
- Niciun calcul de deviz, discount, transport sau TVA nu are voie să fie hardcodat în Frontend (`React`). Frontend-ul doar trimite un payload și primește lista gata formatată de `items` împreună cu `total_net` și `vat_rate`.
- **Regula de Aur:** Documentul de print (PDF), vizualizarea online (`DevisView.jsx` / `ProformaView.jsx`) și tabelul de Analiză Devize se bazează TOATE pe rezultatul final al acestui motor de pe server.

## 2. Modificarea Prețurilor de către Admin (Evoluție în Timp)
- **Tabelul de Tarife (Pricing Settings):** Adminul modifică prețurile generale de referință în panoul de Tarife. Acestea se salvează în tabela globală de `PricingSetting`.
- **Snapshot pe Deviz (`wo.prices`):** Când un utilizator (client) își generează un Deviz Online, sistemul "îngheață" acele prețuri curente și le salvează ca un dicționar (JSON) pe rândul comenzii: `wo.prices`.
- Asta înseamnă că dacă adminul dublează prețurile mâine, Devizul făcut ieri va păstra prețurile din ziua generării (pentru că folosește dicționarul salvat pe `wo.prices`).

## 3. Sincronizarea Logicilor de TVA (Python vs. JS)
- Este **obligatoriu** ca logica de suprascriere (override) a TVA-ului din frontend (`frontend/src/utils/pricingEngine.js`) să fie oglindită exact în backend (`backend/app/services/pricing_engine.py`).
- Când un utilizator sau administrator forțează un `vat_type` specific (ex. 0, 6, 21) sau debifează `useVat` (salvat în dicționarul `wo.prices`), motorul de audit din Python trebuie să citească și să aplice aceste excepții, ignorând tipul standard al clientului (Fizică/Juridică). Altfel, vor apărea discrepanțe grave între PDF-ul final și Analiza de Audit.

## 3. Sistemul de Audit (Analiză Devize - PricingAnalytics)
- Pentru pagina de Analiză Devize, sistemul rulează pe un **`audit_mode = true`**. 
- Acest mod preia `wo.prices` (snapshot-ul vechi al prețurilor) și `wo.volumes` (volumele și materialele selectate) și le trece **DIN NOU** prin funcția modernă de `calculate_quote_price()`.
- Serverul compară `recalculated_net` (produs de algoritmul la zi folosind prețurile din snapshot) cu `estimated_price` (suma totală salvată în baza de date când s-a generat devizul efectiv).

### De ce apar "Devize cu Diferențe"?
Dacă apar devize în secțiunea "Cu Diferențe" (isDiscrepancy), problema NU provine de la prețurile în sine (pentru că ele sunt înghețate). Diferențele apar pentru că **logică matematică (codul) din `calculate_quote_price` a evoluat** după momentul în care devizul a fost salvat.
Exemple:
1. S-au adăugat praguri noi de grosime sau limite de kilometri care nu existau în luna Iulie.
2. S-au schimbat regulile de rotunjire pentru distanță.
3. S-a introdus un algoritm de alocare a costului de camion (Truck Cost) care în trecut lipsea.

## 4. Structura Strictă a UI-ului și Printării
- **Frontend / Analiză Devize:** Așa cum este menționat și în `AGENTS.md`, tabelul principal din `PricingAnalytics` va afișa mereu coloanele `NET RECALCULAT`, `TVA`, `TOTAL TTC` și `DIFFÉRENCE NET`.
- Elementele de cost ("items") nu se construiesc folosind tabele HTML (`<table>`), ci strict cu grid-uri Tailwind (`grid grid-cols-12`) oglindind cu fidelitate structura din `DevisView.jsx` (PDF).
- Simbolul monedei (`€`) este protejat mereu de `whitespace-nowrap` pentru a nu cădea vizual pe următorul rând.

## Interdicții Absolute pentru Dezvoltatori (Blocaj)
- Este STRICT INTERZISĂ replicarea logicii din `pricing_engine.py` în JavaScript/Frontend.
- Este STRICT INTERZISĂ actualizarea sau alterarea câmpului `estimated_price` al devizelor trecute doar pentru a elimina discrepanțele din Audit. (Istoricul financiar este sacru).
- Dacă un deviz dă eroare la audit, se explică utilizatorului (adminului) că acel deviz s-a generat sub o logică veche a aplicației (ex: luna trecută, înainte de implementarea regulii noi de camion). Nu se umblă la datele salvate!
