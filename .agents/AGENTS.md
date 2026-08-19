# Reguli de Proiect: Davide Chape (Client B - Pontaje)

Aceste reguli TREBUIE respectate cu strictețe la fiecare interacțiune pentru a preveni repetarea erorilor istorice care au costat timp și bani.

## 1. Numerotarea Documentelor (Facturi / Devize)
- **ESTE STRICT INTERZISĂ** folosirea de scurtături vizuale (fallbacks de tipul `INV-${uuid}` sau `EST-${uuid}`) în interfața de utilizator.
- Toate numerele de documente (inclusiv "Devis" și "Factură") trebuie să fie **secvențiale și generate din backend** (ex. `INV0001`, `DEV0001`).
- Dacă lipsește logica de generare secvențială pentru un tip de document, **rezolvă problema în backend mai întâi**; nu aplica soluții "plasture" direct în React.

## 2. Traduceri și Diacritice (Limba Română -> Franceză)
- Când se fac traduceri dinamic în Frontend pentru termeni hardcodați (ex. *Șapă*, *Manoperă*), **ESTE INTERZISĂ** folosirea egalității stricte de tip string (`if (text === 'șapă')`).
- **Folosește MEREU expresii regulate (Regex)** care să acopere TOATE variațiile de diacritice și caractere invizibile.
  - Exemplu corect: `/^[sșş]ap[aăâ]$/i` (acoperă S cu virgulă, S cu sedilă, A, Ă, Â).
  - Exemplu incorect: `'șapă'`.
- Interfața utilizatorului final (în special pe PDF-uri și tab-uri de vizualizare client) trebuie să fie **strict în limba franceză** (ex. *Chape*, *Main-d'œuvre*, *Envoyer à Billtobox*, *Émettre la Facture*).

## 3. Prevenirea Duplicării Elementelor UI
- Înainte de a adăuga un buton nou într-o componentă (ex. `ProformaView.jsx`), analizează **întotdeauna** componenta părinte (`InvoiceDetails.jsx`) pentru a te asigura că nu creezi duplicate (ex. două butoane de *Imprimer le PDF*).
- Elementele de navigare (tab-uri, butoane de acțiune globală) trebuie consolidate într-o singură bară de unelte coerentă, cu padding, font-size și border-radius complet identice.
- Nu afișa funcții inaccesibile: dacă `wo.is_invoiced` este `false`, nu se afișează deloc tab-ul de FACTURE.

## 4. Comunicarea și Soluționarea Problemelor
- Când o aplicație se blochează (crash cu ecran alb), explică imediat **cauza tehnică** utilizatorului (ex. *O importare lipsă*) înainte de a adresa acuzațiile privind dispariția unor funcționalități. Utilizatorul nu poate vedea codul spart.
## 5. UI, Tabele, Butoane și "Z-Index" Modale
- **FOLOSIREA COMPONENTELOR STANDARD (DATATABLE)**: Când creezi pagini de tip listă sau rapoarte în zona de admin, **ESTE OBLIGATORIU** să folosești componenta standard `<DataTable>` (`import DataTable from '../../components/DataTable'`).
  - **NU CONSTRUI NICIODATĂ** tabele de la zero cu tag-uri simple HTML (`<table>`, `<tr>`, `<td>`).
  - `DataTable` are deja integrate nativ: paginarea, selectarea rândurilor, căutarea, afișarea numărului curent (Nr. Crt.) și numărarea totalului de înregistrări.
- **BUTOANE ȘI ACȚIUNI**: Păstrează mereu un design consistent. În interiorul `DataTable`, butoanele de acțiune trebuie să folosească iconițe Lucide (ex: `Eye`, `Edit`, `Trash2`) și același padding ca în restul platformei (`px-3 py-1.5`, `rounded-lg`).
- Când combini date într-un tabel (pentru lipsă de spațiu), pune-le pe aceeași coloană una sub alta (ex: `Suprafață / Grosime`), în loc să micșorezi fonturile ca să încapă toate.
- Asigură-te întotdeauna că Modalele, ferestrele de Dialog, și ferestrele de tip Popup (ex: `ConfirmModal`) au un `z-[9999]` sau suficient de mare pentru a randa peste Navigation Bar (Header-ul albastru). **CRITIC:** Deoarece aplicația folosește un layout unde `<main>` și `<header>` sunt siblings, un simplu `z-[9999]` pus în interiorul unei pagini nu va acoperi header-ul din cauza stacking context-ului. **Folosește MEREU `createPortal(<div className="fixed inset-0 z-[9999]...">...</div>, document.body)`** pentru a garanta că modalul acoperă întreg ecranul, inclusiv header-ul!
- **FĂRĂ ALERTE NATIVE BROWSER**: Este complet interzisă folosirea `alert(...)`, `confirm(...)` sau `prompt(...)`! Folosește exclusiv componenta Toast/Notificări, sau Modale/Dialoguri de confirmare (ex: `ConfirmModal`) construite în React. Fără excepții.

## 6. Limba de lucru în Frontend
- Acesta este un proiect **100% în limba Franceză** pentru utilizatorul final și administrator.
- Niciun text static (ex: "Copiază Link", "Vezi", "Suprafață") nu trebuie lăsat "hardcodat" în limba română în fișierele Frontend.
- Toate textele trebuie traduse prin sistemul i18next `t('cheie', 'Traducere în Franceză')`! Nu este acceptat nici măcar pentru texte ajutătoare (tooltip).

## 7. Portul Frontend (Vite)
- Frontend-ul rulează întotdeauna pe portul **5678**.
- Nu rula comenzi sau teste vizuale presupunând portul default 5173 sau alt port.

## 8. Git Commit & Push
- **ESTE STRICT INTERZIS** să folosești comenzi precum `git commit` și `git push` FĂRĂ permisiunea clară și explicită a utilizatorului.
- După ce scrii și testezi codul, raportează modificările și AȘTEAPTĂ până când utilizatorul spune "dă push" sau "ok, commit".

## 9. PROTECȚIA BAZEI DE DATE — REGULĂ CRITICĂ ABSOLUTĂ
- **ESTE COMPLET INTERZISĂ** orice modificare a înregistrărilor din baza de date prin scripturi, terminal sau alte metode ascunse. Asta include: mutarea înregistrărilor de la o echipă la alta, modificarea câmpurilor, ștergerea (DELETE/DROP/TRUNCATE), adăugarea sau trunchierea datelor.
- **Agentul NU ARE VOIE NICIODATĂ să facă "teste" modificând datele reale (de producție)**. Orice `db.commit()` după un UPDATE, INSERT sau DELETE pe baza de date de producție este o încălcare gravă.
- **ÎNAINTE** de orice operație pe baza de date (chiar și pentru corectarea unei erori), agentul TREBUIE să:
  1. Prezinte exact scriptul sau acțiunea.
  2. Ceară confirmarea explicită a utilizatorului ("Ești de acord să modificăm X în Y?").
  3. Aștepte răspunsul clar al utilizatorului.
- **ESTE STRICT INTERZIS** să folosești `venv`, executabile sau orice resurse din foldere din afara workspace-ului curent (`Client B - pontaje`). Nu se folosesc căi de tipul `../../alt_proiect/venv/...` sub NICIO formă.
- Dacă nu există un `venv` funcțional în workspace-ul curent, raportează problema utilizatorului și cere instrucțiuni — nu improviza cu resurse din alte proiecte.
- **CASCADE DELETE**: Înainte de a șterge orice WorkOrder sau entitate principală, agentul TREBUIE să verifice relațiile `CASCADE` și să avertizeze utilizatorul că ștergerea va elimina și toate datele legate (poze, pontaje GPS, check-in-uri, calcule materiale).

## 10. Interdicția de a lua decizii neautorizate (Regulă de la utilizator)
- Dacă nu știi ceva cu siguranță (ex. care este logoul corect, cum ar trebui să se numească un anumit câmp, etc.), **ÎNTREABĂ**. 
- Nu ai voie să decizi în locul utilizatorului. 
- După ce întrebi, **AȘTEAPTĂ** răspunsul utilizatorului înainte de a merge mai departe.

## 11. REGULĂ NOUĂ DE EXECUTARE (Cerută de utilizator)
- Dacă în promptul (mesajul) utilizatorului există un semn de întrebare ("?"), agentul TREBUIE SĂ RĂSPUNDĂ DOAR LA ÎNTREBARE.
- Agentul **NU ARE VOIE** să se apuce de modificat fișiere, rulat comenzi care schimbă ceva sau implementat soluții fără a prezenta un plan și a avea confirmarea/aprobarea EXPLICITĂ a utilizatorului.

## 12. Separare Completă: Devis Online vs Jordi (Public Calculator)
- **REGULĂ CRITICĂ**: Link-ul `davidechape.pontaj.app/devisonline` și webhook-ul/formularul public al lui Jordi (din We-R / Public Calculator) sunt entități **complet separate**.
- Este STRICT INTERZIS să se modifice fișierele lui Jordi (ex: `public_calculator.py`) pentru a adăuga funcționalități destinate lui `devis_online`.
- Orice dezvoltare pentru `devis_online` trebuie făcută în fișiere și rute dedicate, total izolate de `public_calculator`.

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

## 5. CLIENȚI PREFERENȚIALI (EX: ISOFLEX)
- Anumiți clienți (ex. Isoflex) sunt "clienți preferențiali" și au prețuri personalizate (inclusiv prețuri de 0) stabilite în pagina de Tarife.
- În cazul lor, este absolut normal ca unele costuri (cum ar fi prețul pentru Fibră + Duramint) să fie **0 EUR**.
- Aceste elemente trebuie să apară pe deviz ca și cantitate (m²) pentru ca șefii de echipă să vadă materialele necesare, dar cu un preț total de **0**.
- Ca atare, funcția centrală de extragere a prețului (`getPrice` / `priceCalculator`) **trebuie să accepte valoarea 0 ca fiind validă** și să nu o forțeze la un alt etalon atunci când acel 0 vine din setările preferențiale.

Încălcarea acestor reguli generează confuzie, discrepanțe legale pe facturi și pierderi financiare masive. Nicio decizie arhitecturală nouă nu poate anula aceste cerințe de unificare a prețurilor.

## 6. JURNAL DE ACTIVITATE (ACTIVITY LOG)
- Orice agent nou care preia acest proiect are **obligația** de a citi fișierul `.agents/ACTIVITY_LOG.md` pentru a înțelege istoricul recent.
- După fiecare sesiune de modificări aprobate, agentul **trebuie să actualizeze** acest fișier adăugând acțiunile efectuate, lecțiile învățate, data și confirmarea aprobării utilizatorului.

# Reguli Stricte de Layout (UI)

## 1. Pagina Deviz (WorkOrderDetail) - Harta și Vremea
- **PĂSTRAREA STRUCTURII DE BAZĂ**: Aspectul hărții și al casetei de vreme de pe pagina `WorkOrderDetail` este **FINAL ȘI BLOCAT**. Orice agent are interdicția de a modifica această structură fără aprobare explicită.
- **CARDUL DE VREME (HourlyWeather)**: Cardul complet de vreme TREBUIE să fie plasat **ÎN STÂNGA HĂRȚII**, pe același rând cu harta (folosind prop-ul `leftPanelContent` al componentei `MapView`).
  - **ESTE STRICT INTERZISĂ** micșorarea cardului de vreme într-o pastilă mică ("tiny pill") sau suprapunerea lui direct pe hartă ca un overlay (ex: `overlayBottomLeft` sau `overlayBottomRight`). Cardul trebuie să își păstreze formatul mare, informativ, în coloana proprie de lângă hartă.
- **BUTOANELE DE ACȚIUNE (Toolbar)**: S-a stabilit definitiv că butoanele de `Edit` și `Chat` NU mai apar deloc în acest toolbar. Butoanele care rămân (Șterge, Confirmă, Trimite Email) vor avea doar o iconiță, **fără text**. Butonul de trimitere email va fi vizibil de fiecare dată când există o adresă de email setată pe lucrare (`wo.client_email`), ignorând constrângerile de status.

## 2. Pagina Analiză Devize (Pricing Analytics)
- **STRUCTURA TABELULUI PRINCIPAL**: Tabelul mare (DataTable) din `/admin/pricing-analytics` TREBUIE OBLIGATORIU să conțină coloanele: `NET RECALCULAT`, `TVA`, `TOTAL TTC`, și `DIFFÉRENCE NET`. 
- Calculul pentru TVA și TTC trebuie să țină cont dinamic de `row.recalc_vat_rate` sau `row.vat_rate`.
- **FĂRĂ CUTII GIGANTICE**: Este strict interzisă adăugarea de cutii uriașe de comparație la baza modalului de analiză. Modalul trebuie să rămână curat, axat strict pe rândurile devizului.
- **OGLINDIREA DESIGNULUI DIN PDF**: Tabelul din interiorul modalului de vizualizare (PricingAnalytics modal) TREBUIE să arate **EXACT ca tabelul generat în PDF (`DevisView.jsx`)**. 
- Asta înseamnă că **este strict interzisă** folosirea tag-ului clasic HTML `<table>` în modal. Trebuie folosit sistemul de `grid grid-cols-12` (ex: `col-span-5` pentru descriere, `col-span-2` pentru preț), cu carduri `rounded-xl` pentru fiecare rând de item, și cutia neagră (`bg-slate-900`) pentru Total TTC, identic cu factura printată.
- **ALINIEREA MONEDEI (EURO)**: Semnul Euro (`€`) nu are voie niciodată să cadă pe rândul următor. Toate celulele cu prețuri trebuie să aibă obligatoriu clasa Tailwind `whitespace-nowrap`.
