---
trigger: always_on
---
# Ierarhia de Design, Calitate, Arhitectură și Verificare (Davide Chape / Pontaje)

Această regulă este permanent activă (`always_on`) și integrează cele 6 familii de skill-uri ale proiectului:

## 1. Prioritatea #1 pe Design Vizual & Compoziție: `apple-tahoe-tenant-design` + `apple-design` + `frontend-design`
- **Surse:** `.agents/skills/apple-tahoe-tenant-design/SKILL.md` + `dickwu/apple-design-skill` (`.agents/skills/apple-design/SKILL.md`) + `anthropics/skills` (`.agents/skills/frontend-design/SKILL.md`).
- **Reguli obligatorii:**
  - **Apple Tahoe Multi-Tenant Color Engine (`--tenant-accent` & `--tenant-accent-fg`):** zero culori de brand hardcodate pentru butoane primare, taburi active, focus rings sau stări selectate; toate se rezolvă dinamic prin `applyTenantTheme()` în `--tenant-accent` (și aliasul `--tenant-bg`), cu contrast automat WCAG AA (`--tenant-accent-fg: #111113` sau `#FFFFFF` în funcție de luminanță `> 0.42`) și suprafețe 100% neutre (`#F2F2F4` / `#FFFFFF` în Light Mode, `#0C0C0E` / `#1C1C1E` în Dark Mode fără tentă albăstruie).
  - **Dispatch Live Layout:** aliniere la stânga lângă sidebar (`16px` gap), fără `max-w-* mx-auto` sau dublu padding exterior; antet clar + pastila verde `• Live`.
  - **Culoarea Tenantului (`var(--tenant-accent)` / `var(--tenant-bg)`):** toate butoanele principale (`.ui-btn-primary`), filtrele/taburile active (`.ui-segment-active`) și focus rings folosesc exclusiv variabilele tenantului.
  - **System Sheets & Alerts:** fundal solid/opac curat (`.ui-sheet` / `var(--ui-surface)`), contur clar, secțiuni interioare **Inset Grouped** (`.ui-inset-card`), `createPortal(..., document.body)` cu `z-[99999]`.
  - **Tipografie Retina Crisp:** fără `scale3d` sau `will-change: transform` lăsate active pe containerele deschise care conțin text; `text-wrap: balance` pe titluri.

## 2. Igienă Tehnică CSS & iOS Safari (100+ Reguli): `web-design-guidelines` (Vercel)
- **Sursă:** `vercel-labs/agent-skills` & `vercel-labs/web-interface-guidelines` (`.agents/skills/web-design-guidelines/SKILL.md`).
- **Reguli aplicate global în `frontend/src/index.css` și componente:**
  - `touch-action: manipulation` și `-webkit-tap-highlight-color: transparent` pe toate controalele interactive (elimină delay-ul de 300ms și auto-zoom-ul la dublu-tap pe iOS).
  - `font-size >= 16px` pe `<input>`, `<select>`, `<textarea>` pe mobil (`@media (max-width: 767px)`) contra auto-zoom-ului din iOS Safari.
  - `min-width: 0` (`min-w-0`) pe elementele `flex` și `grid` ca textele traduse (`RO / FR / NL / EN / DE`) să nu depășească niciodată ecranul.
  - `overscroll-behavior: contain` în toate modalele, panourile laterale și listele scrollabile.
  - `tabular-nums` și `whitespace-nowrap` pe toate prețurile (`€`), suprafețele (`m²`), tonajele (`T`), distanțele (`km`), procentele (`%`) și orele.
  - Ținte tactile de minimum `44×44px` pe mobil/iPad și inel `:focus-visible` în culoarea tenantului.

## 3. Arhitectură, Module Profunde & Limbaj de Domeniu: `mattpocock-skills`
- **Sursă:** `mattpocock/skills` (`.agents/skills/mattpocock-skills/SKILL.md`).
- **Design It Twice & Deep Modules:** logica matematică de prețuri și materiale rămâne într-o singură sursă de adevăr (`buildQuoteItems` / `pricing_engine.py`), niciodată duplicată în pagini.
- **Ubiquitous Language (Davide Chape Belgia):** folosirea consecventă a termenilor de domeniu (*Chape*, *Isolation PUR/EPS*, *Forfait*, *Seuil 250 m²*, *Peppol BIS 3.0 / e-FFF / Billtobox*, *Rappel WhatsApp 4 stări*).
- **Triage Issue:** urmărirea completă a unui bug pe verticală (`DB Model -> Serializer (_serialize / _serialize_invoice_mode / _serialize_slim) -> Frontend API -> DOM`).

## 4. Debugging Sistematic & Modificări Chirurgicale: `systematic-debugging` + `karpathy-guidelines`
- **Surse:** `obra/superpowers` (`.agents/skills/systematic-debugging/SKILL.md`) + `multica-ai/andrej-karpathy-skills` (`.agents/skills/karpathy-guidelines/SKILL.md`).
- **Think Before Coding & Root Cause First:** identifică și verifică tehnic cauza reală înainte de orice modificare.
- **Simplicity First & Surgical Changes:** cod minim, curat, care rezolvă exact cerința fără efecte secundare.

## 5. Verificare Înainte de Finalizare & Audit Multi-Viewport: `verification-before-completion` + `webapp-testing` + `audit-gatekeeper`
- **Surse:** `obra/superpowers` (`.agents/skills/verification-before-completion/SKILL.md`) + `anthropics/skills` (`.agents/skills/webapp-testing/SKILL.md`) + `.agents/skills/audit-gatekeeper/SKILL.md`.
- **Dovezi înainte de afirmații:** rulează `npm run build`, `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py` și/sau `.agents/skills/webapp-testing/scripts/audit_ui_geometry.py` (verificare Playwright pe `320px`, `375px`, `390px`, `430px`, `1024px`, `1440px`) înainte de a raporta finalizarea.
