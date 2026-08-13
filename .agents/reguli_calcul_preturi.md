# Reguli Stricte de Calcul (Tarife și PDF)

Aceste reguli sunt **LEGE** și nu trebuie încălcate sub nicio formă la calcularea sau randarea devizelor și facturilor în aplicație. Orice nerespectare a lor duce la erori critice între ce vede utilizatorul pe ecran și ce se printează pe PDF.

## 1. SURSA UNICĂ DE ADEVĂR (SINGLE SOURCE OF TRUTH)
- Sursa universală de adevăr pentru prețuri este **Pagina de Tarife** (Setări) reprezentată prin `pricingSettings` în cod.
- La generarea oricărui deviz (ui, pdf, proformă), dacă un preț (ex: `truck_cost`) lipsește, acesta **TREBUIE OBLIGATORIU** să fie extras și calculat direct din `pricingSettings` (etalon).
- NICIODATĂ nu se va lăsa un cost cu valoarea 0 sau inexistent doar pentru că nu a fost deja salvat într-un snapshot vechi în baza de date. Fallback-ul trebuie să bată întotdeauna spre ETALON.

## 2. SICRONIZAREA TIMPULUI DE ÎNCĂRCARE (PROMISE.ALL)
- Componentele de vizualizare PDF (`DevisView.jsx`, `ProformaView.jsx`) nu au voie să înceapă randarea până nu se termină complet fetch-ul de la:
    - a. Devizul curent (`work-orders/:id`)
    - b. Etalonul de tarife (`pricing-settings`)
- Se va folosi exclusiv `Promise.all` pentru a forța încărcarea simultană. Dacă `pricingSettings` eșuează sau vine târziu, randarea timpurie provoacă afișarea unui transport/forfait incorect de 0 EUR.

## 3. UNIFICAREA LOGICII: ECRAN (UI) VS. PDF
- Ceea ce apare în secțiunea **CALCUL COST** (pe ecranul `WorkOrderDetail`) trebuie reprodus identic la nivel de structură și date pe documentele Printate (Devis/Factură).
- Este **STRICT INTERZISĂ** duplicarea logicii de calcul matematice în fișiere separate. Dacă s-a adăugat o regulă pe ecran (ex: transport pe distanțe lungi), ea trebuie copiată imediat în blocurile de construire a itemilor din documentele PDF.

## 4. BLOCUL DE CALCUL TRANSPORT
- Transportul trebuie să țină cont mereu de **distanță**, **tariful fix**, **pragul de km** și **suprafața totală** (care poate oferi transport gratuit).
- Chiar dacă randarea se face pe baza unui obiect înghețat (`proforma_data.items`), codul are obligația să inspecteze listele generate. Dacă secțiunea de transport lipsește de pe factura salvată, iar distanța/costul justifică unul, el va fi adăugat dinamic pe ultimul rând:
  - Exemplu corect: `Transport (391 km)` —> cost: 250 EUR.

Încălcarea acestor reguli generează confuzie, discrepanțe legale pe facturi și pierderi financiare masive. Nicio decizie arhitecturală nouă nu poate anula aceste cerințe de unificare a prețurilor.
