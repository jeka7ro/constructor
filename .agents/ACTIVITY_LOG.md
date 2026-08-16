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
