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
## 5. UI, Tabele, și "Z-Index" Modale
- Când combini date într-un tabel (pentru lipsă de spațiu), pune-le pe aceeași coloană una sub alta (ex: `Suprafață / Grosime`), în loc să micșorezi fonturile ca să încapă toate.
- Asigură-te întotdeauna că Modalele, ferestrele de Dialog, și ferestrele de tip Popup (ex: `ConfirmModal`) au un `z-[9999]` sau suficient de mare pentru a randa peste Navigation Bar (Header-ul albastru), care are `z-50`.
- **FĂRĂ ALERTE NATIVE BROWSER**: Este complet interzisă folosirea `alert(...)` sau `prompt(...)`! Folosește exclusiv componenta Toast/Notificări existentă în aplicație (ex: funcția `showToast` existentă deja în pagini) sau un modal stilizat curat.

## 6. Limba de lucru în Frontend
- Acesta este un proiect **100% în limba Franceză** pentru utilizatorul final și administrator.
- Niciun text static (ex: "Copiază Link", "Vezi", "Suprafață") nu trebuie lăsat "hardcodat" în limba română în fișierele Frontend.
- Toate textele trebuie traduse prin sistemul i18next `t('cheie', 'Traducere în Franceză')`! Nu este acceptat nici măcar pentru texte ajutătoare (tooltip).
