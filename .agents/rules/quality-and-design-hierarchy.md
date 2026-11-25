---
trigger: always_on
---
# Ierarhia de Design, Calitate și Verificare (Davide Chape / Pontaje)

Această regulă este permanent activă (`always_on`) și stabilește ordinea de prioritate între skill-urile proiectului:

## 1. Prioritatea #1 pe Design Vizual: `apple-design` (Apple Human Interface Guidelines)
- **`apple-design` (`.agents/skills/apple-design/SKILL.md`) are prioritate absolută pe tot ce ține de aspectul vizual și UX.**
- Toate paginile, modalele, alertele, butoanele, tabelele, cardurile și controalele trebuie să respecte estetica **Apple HIG**:
  - **System Sheets & Alerts:** fundal solid/opac curat (`bg-[#F2F4F8]` / `bg-white`, `dark:bg-slate-900`), contur clar (`rounded-[24px] border-[1.5px] border-slate-300 ring-1 ring-slate-900/10`), secțiuni interioare **Inset Grouped** (`rounded-[16px] bg-white border border-slate-200`), `createPortal(..., document.body)` cu `z-[99999]`.
  - **Tipografie Retina Crisp:** fără `scale3d` sau `will-change: transform` lăsate active pe containerele deschise care conțin text; contrast puternic (`text-slate-950 font-bold` pentru titluri, `text-slate-700 font-semibold` pentru valori secundare).
  - **Segmented Controls & Touch Targets:** segmente egale, ținte tactile de minimum `44×44px` pe mobil/iPad.

## 2. Igienă Tehnică CSS & iOS Safari: `web-design-guidelines` (Vercel)
- În completarea esteticii `apple-design`, respectă regulile tehnice din `.agents/skills/web-design-guidelines/references/command.md`:
  - `min-w-0` pe toate elementele `flex` și `grid` ca textele traduse (`FR` / `NL` / `EN`) să nu depășească niciodată containerul.
  - `tabular-nums` și `whitespace-nowrap` pe toate prețurile (`€`), suprafețele (`m²`), tonajele (`T`), distanțele (`km`) și orele.
  - Folosește doar clase de opacitate valide în Tailwind CSS v3 (multipli de 5: `/90`, `/95`, `/100` sau valori arbitrare `/[0.98]`, niciodată `/98` sau `/96` fără paranteze pătrate).
  - `overscroll-behavior: contain` în modale și panouri scrollabile.

## 3. Debugging Sistematic & Modificări Chirurgicale: `systematic-debugging` + `karpathy-guidelines`
- **Fără cârpeli fără cauza rădăcină (`.agents/skills/systematic-debugging/SKILL.md`):** Înainte de a modifica orice linie de cod pentru un bug, identifică și verifică tehnic cauza reală (ex. statusul HTTP al API-ului, CSS-ul compilat în `dist/`, sau dimensiunea reală din DOM).
- **Simplicity First & Surgical Changes (`.agents/skills/karpathy-guidelines/SKILL.md`):** Atinge strict liniile necesare cerinței, fără a strica funcționalitatea existentă.

## 4. Verificare Înainte de Finalizare: `verification-before-completion` + `webapp-testing` + `audit-gatekeeper`
- **Dovezi înainte de afirmații (`.agents/skills/verification-before-completion/SKILL.md`):** Nu afirma niciodată că o modificare este gata fără a rula verificarea în același pas (`npm run build`, `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py` și/sau inspecția matematică în browser cu `.agents/skills/webapp-testing/SKILL.md` pe portul `5678`).
