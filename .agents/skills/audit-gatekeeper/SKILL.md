---
name: audit-gatekeeper
description: Multi-phase Pre-Push Security, Business Logic, Form Resilience (Pydantic 422), Database Integrity, and Pricing Audit Skill modeled on cloudflare/security-audit-skill. Run this skill before any git commit/push or when auditing project changes.
---

# Audit Gatekeeper Skill (Cloudflare 6-Phase Architecture + Business & UI Invariants)

Acest skill transformă agentul (sau un sub-agent independent invocat prin `invoke_subagent`) într-un **Auditor Gatekeeper** riguros, bazat pe arhitectura în 6 faze din `cloudflare/security-audit-skill`, extinsă cu regulile critice de business și UI ale proiectului.

**REGULĂ DE BAZĂ:** Niciun `git push` nu primește undă verde până când acest audit nu returnează verdictul **🟢 VERDE (LIBER LA PUSH)**. Orice verificare se face **100% READ-ONLY** pe baza de date (este strict interzis `db.commit()` în timpul testelor).

---

## Arhitectura în 6 Faze (Workflow Obligatoriu)

### Faza 1: Reconnaissance & Inventar (`git diff` + Ledger)
1. Identifică toate fișierele modificate față de `HEAD` (`git status -s` și `git diff --name-only`).
2. Clasifică suprafața de impact în 5 categorii:
   - **API & Pydantic Schemas** (`backend/app/api/*.py`)
   - **Motoare de Calcul & Servicii** (`pricing_engine.py`, `pdf_generator.py`, `pricingEngine.js`)
   - **Formulare & Pagini React** (`frontend/src/**/*.jsx`)
   - **Interogări Bază de Date & Multi-Tenant** (`organization_id`, `client_id`, `LogisticSandStation`, `PricingSetting`)
   - **Securitate & Autentificare** (`Depends(get_current_admin)`, `Depends(get_current_user)`, rute publice)

### Faza 2: Hunting pe 5 Vectori Critici
Rulează mai întâi scriptul determinist de verificare:
```bash
"/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/.venv/bin/python3" \
  "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py"
```
Apoi verifică manual în codul modificat cei 5 vectori:

1. **Vector 1 — Reziliența Formularelor & Pydantic (`422 float_parsing` / `string_type`):**
   - În React, orice `<input type="number">` golit de utilizator trimite `""` (șir gol) în JSON.
   - Verifică ca orice schemă Pydantic (`BaseModel`) din fișierele API modificate să aibă `@model_validator(mode="before")` sau conversie sigură pentru `""`, `None` și numere cu virgulă (`"12,5"`), iar în frontend payload-ul să fie curățat înainte de `api.post` / `api.put`.
2. **Vector 2 — Izolare Multi-Tenant & Integritate Date (Prevenire „Disappearance Bug”):**
   - Orice `db.query(PricingSetting)` pentru tarife globale TREBUIE să filtreze `PricingSetting.client_id.is_(None)` (și `organization_id`), ca să nu preia accidental rândul unui client preferențial (ex. `BV ISOFLEX` cu `0 €`).
   - Dacă o componentă UI este schimbată de pe o listă statică pe un endpoint DB (ex. `LogisticSandStation`), verifică numărul de înregistrări (`count`) înainte și după: **nicio înregistrare existentă nu are voie să dispară fără migrarea ei în DB**.
3. **Vector 3 — Paritate Matematică 100% la Calcule (Devize Etalon):**
   - Pragul de suprafață mare (`> 250 m²`) și taxa de `Forfait` (`Seuil de surface`) se aplică pe **suprafața totală cumulată a șapei pe șantier** (`total_chape_surface`), nu pe fiecare etaj separat.
   - La comenzile cu mai multe șape (`Chape 1`, `Chape 2`), măsurătoarea reală a șefului de echipă se aplică per șapă (`actual_quantity`, `actual_thickness`), iar `Calcul Réel` / `Facture` folosește aceeași funcție `buildQuoteItems` / `calculate_quote_price`.
4. **Vector 4 — Reguli UI & `AGENTS.md`:**
   - Fără `window.confirm`, `alert()`, `prompt()` în fișierele modificate.
   - Toate modalele noi sau modificate folosesc `createPortal(..., document.body)` cu `z-[9999]` / `z-[99999]`.
   - Fără texte românești hardcodate în interfața clientului/adminului (totul prin `t('...', 'Texte en français')`).
   - Fără scurtături `INV-${uuid}` sau `EST-${uuid}`.
5. **Vector 5 — Securitate (Cloudflare Threat Classes):**
   - Rutele de admin (`/api/admin/*`) au obligatoriu `Depends(get_current_admin)`.
   - Interogările filtrează după `organization_id` (protecție IDOR între organizații).
   - Niciun secret/API key nu este expus în `frontend/src/`.

### Faza 3: Independent Verification (Sub-Agent Critic)
Pentru modificări complexe (care ating mai mult de 3 fișiere sau logica de prețuri/bază de date), lansează sub-agentul `research` prin `invoke_subagent` cu rolul `Independent QA Verifier`, dându-i `git diff` și rezultatul scriptului `run_prepush_audit.py`, cu instrucțiunea:
> *"Încearcă să găsești orice scenariu în care codul modificat ar da eroare 422/500 în producție, ar afișa date lipsă clientului sau ar calcula greșit un deviz."*

### Faza 4–6: Raportare Semafor către Utilizator
Prezintă întotdeauna utilizatorului un tabel scurt și clar înainte de a cere permisiunea pentru `git push`:

| Categorie Audit | Status | Detalii |
| :--- | :---: | :--- |
| **1. Compilare Backend & Frontend (`vite build`)** | 🟢 / 🔴 | ... |
| **2. Reziliență Formulare & Pydantic (`""` / `null`)** | 🟢 / 🔴 | ... |
| **3. Devize Etalon (6 Scenarii de Control)** | 🟢 / 🔴 | ... |
| **4. Integritate Date (Stații Nisip & Tarife DB)** | 🟢 / 🔴 | ... |
| **5. Reguli `AGENTS.md` & Securitate** | 🟢 / 🔴 | ... |
| **VERDICT FINAL** | **🟢 LIBER LA PUSH** / **🔴 BLOCAT** | ... |

