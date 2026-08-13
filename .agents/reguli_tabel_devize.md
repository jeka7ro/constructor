# REGULI TABEL DEVIZE / OFERTE (QuotesManagement.jsx)

**ATENȚIE: Aceste reguli sunt BLOCATE. Nu se modifică NIMIC fără ordinul explicit al utilizatorului.**

## Structura Coloanelor (în ordine)

| # | Coloană | Key | className | align | Note |
|---|---------|-----|-----------|-------|------|
| 0 | Checkbox | `checkbox` | `w-[32px] max-w-[32px] !px-1` | center | Selectare rânduri |
| 1 | Citat Nr. / Data | `created_at` | `w-[175px] max-w-[180px]` | left | Quote number + data + status + source badge. **NU se afișează ora** |
| 2 | Client & Adresă | `client_name` | `w-[200px]` | left | Nume client + adresă + km |
| 3 | Suprafață / Grosime | `surface_thickness` | `w-[190px]` | left | Chape: X m² · Y CM + Isolation (dacă există) |
| 4 | Preț (€) | `estimated_price` | `w-[90px]` | **LEFT** (fără `align: 'right'`) | Prețul e aliniat la stânga în celulă ca să fie aproape de Suprafață |
| 5 | ACȚIUNI | `actions` | `w-[110px]` | - | Grid 3 coloane cu butoane |

## DataTable Config

- **`tableClassName="table-fixed"`** — pasat din QuotesManagement ca prop
- DataTable.jsx acceptă `tableClassName` prop care se adaugă pe `<table>`
- NR (rând) — generat de DataTable, `w-8` pe `<th>`

## Reguli CSS

1. **table-fixed** e activ DOAR pe acest tabel (nu pe alte pagini)
2. Prețul NU are `align: 'right'` — conținutul e aliniat la stânga în celulă
3. Div-ul de preț: `flex flex-col gap-0.5` (fără `items-end`, fără `justify-end`)
4. Ora NU se afișează în coloana Citat (timeDisplay eliminat)

## CE NU SE FACE

- NU se adaugă `table-fixed` global pe DataTable
- NU se schimbă width-urile fără ordin explicit
- NU se pune `align: 'right'` pe preț
- NU se adaugă ora/timeDisplay în Citat
- NU se adaugă coloane noi fără aprobare
