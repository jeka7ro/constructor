---
name: mattpocock-skills
description: Architectural & engineering workflow skills from mattpocock/skills: Design It Twice (deep modules), Ubiquitous Language (domain terminology consistency), Triage Issue (root-cause vertical slice), and Grill Me (assumption resolution).
---

# Matt Pocock Engineering Skills (`mattpocock/skills`)

Apply these principles when designing features, refactoring modules, or triaging bugs in the Davide Chape platform.

## 1. Design an Interface — "Design It Twice" & Deep Modules
- **Deep Modules (John Ousterhout):** A great module has a simple, narrow public interface hiding rich internal logic.
  - *Example in Davide Chape:* `buildQuoteItems(wo, pricingSettings)` in `frontend/src/utils/priceCalculator.js` and `calculate_quote_price(payload, pricing)` in `backend/app/services/pricing_engine.py` are the single deep modules for pricing. Never duplicate math across UI components (`WorkOrderDetail`, `DevisView`, `ProformaView`, `ScreedsReports`, `InvoicingManagement`).
- **Compare Before Committing:** When adding a complex UI or data flow, consider at least two layout/architectural shapes (e.g., vertical stack vs. high-density horizontal grid) and pick the one that minimizes vertical scrolling and cognitive load.

## 2. Ubiquitous Language (Domain Glossary — Davide Chape Belgium)
Always use consistent domain terms across Backend, Frontend, PDFs, and Analytics:
- **Chape (`Șapă` / `Chape fluide`)**: Screed surface in `m²`, thickness in `cm`, sand formula `m² × cm × 16 kg` (`Tone = kg / 1000`), cement formula `m² × cm × 2.5 kg`.
- **Isolation PUR (`Spumă poliuretanică`) & Isolation EPS (`Thermobeton`)**: Insulation services with options (`pur_aspiration`, `pur_niveller`, `pur_poncage`, `pur_protection`) and minimum PUR threshold (`1375 €`).
- **Seuil Grand Chantier (`Prag Suprafață Mare`)**: `250 m²` threshold for Davide Chape (`base_large_threshold_sqm`), `> 125 km` transport flat fee (`250 €`).
- **Peppol BIS 3.0 / e-FFF (Billtobox / Banqup)**: Belgian B2B electronic invoicing standard (UBL 2.1 XML, `EndpointID schemeID="0208"` for Belgian BCE/KBO enterprise numbers or `"9956"` for VAT `BE0785292895`).
- **Rappel & Confirmation Client (`Reminder WhatsApp / Email`)**: 4 states on calendar & detail views:
  1. White + WhatsApp icon = Not sent
  2. Blue + `✈️✓` = Sent, awaiting client reply
  3. Green + `✓✓` = Confirmed by client for the current `start_date` (resets automatically if moved to another date!)
  4. Red pulsing + `⚠️` = Client requested reschedule (`REPORT + date`) or cancellation (`ANNULER`).

## 3. Triage Issue & Vertical Tracer Bullet
- Trace bugs end-to-end through every layer before editing:
  1. Database column / SQLAlchemy model (`models.py`)
  2. Serializer (`_serialize`, `_serialize_slim`, `_serialize_invoice_mode` in `admin_work_orders.py`)
  3. Frontend API fetch & state (`Promise.all` synchronization)
  4. Rendered DOM & CSS computed styles.
