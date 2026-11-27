---
name: frontend-design
description: Visual composition, typography hierarchy, color contrast, spacing rhythm, and component consistency grounded in Anthropic's frontend-design skill and tailored for the Davide Chape Apple HIG + Dispatch Live design system.
---

# Frontend Design & Visual Craft (`anthropics/skills/frontend-design`)

Use this skill alongside `apple-design` and `web-design-guidelines` whenever creating, redesigning, or auditing frontend pages, dashboards, KPI cards, charts, modals, or tables.

## 1. Visual Hierarchy & Dispatch Live Architecture
- **Page Header Pattern:**
  - Title: `text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-none`
  - Status Badge: `Live` pill (`px-3.5 py-1.5 rounded-full text-[15px] font-extrabold bg-emerald-500/15 text-emerald-700 border border-emerald-500/25` with pulsing dot `w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse`).
  - Subtitle: `text-[15.5px] font-medium text-slate-500 dark:text-slate-400 mt-1`.
- **Workspace Alignment:**
  - Flush alignment next to the left sidebar (`16px` gap). Never add redundant outer `max-w-7xl mx-auto` or double `p-4 md:p-8` wrappers inside Admin pages.

## 2. Color Discipline & Tenant Identity
- **Single Primary Accent (`var(--tenant-bg)`):**
  - All primary CTA buttons (`+ Adăugare...`, `+ Nouveau...`, `Export CSV`, `Enregistrer`), active filter pills, active tab pills, and active card borders MUST use `bg-[color:var(--tenant-bg)]` (or `border-[color:var(--tenant-bg)]`).
  - Never hardcode green (`bg-emerald-600`), orange (`bg-orange-600`), or purple (`bg-indigo-600`) on primary page buttons or active filter tabs.
- **Semantic Status Colors Only:**
  - **Emerald (`emerald-500/15 text-emerald-700`)**: Confirmed (`✓✓`), Invoiced, Peppol Sent, Live status.
  - **Amber (`amber-500/15 text-amber-700`)**: Pending confirmation, Proforma waiting invoice, Peak rush on heatmaps.
  - **Sky (`sky-500/15 text-sky-700`)**: Planned in calendar, Reminder sent (`✈️✓`).
  - **Rose (`rose-500/15 text-rose-700`)**: Error, Client reschedule/cancel alert (`⚠️`), Storno/Delete.

## 3. Data Density, Charts & Comparative Dashboards
- **KPI Cards (`rounded-[22px] p-5..p-6`):**
  - Top row: `15.5px..16.5px font-bold` label + optional `%` delta badge (`vs. previous period`).
  - Middle: `28px..34px font-black tabular-nums` primary metric.
  - Bottom: contextual secondary metric or 2-color split progress bar.
- **Comparative Visuals:**
  - Pair current period metrics with preceding period metrics (`+% / -%`).
  - Use interactive Heatmaps (Teams × Weekdays, Hours × Weekdays), Donut charts with centered totals, and ranked progress lists (`#1..#6` Cities / Clients).
- **Unified Tables (`<DataTable>` inside `rounded-[24px]`):**
  - Crisp white card container (`shadow-[0_4px_16px_-4px_rgba(15,23,42,0.06)] border border-slate-200/90`).
  - Never use heavy blue table headers (`bg-blue-600`) or colored row blocks. Use `bg-slate-50/90 text-[15px] font-bold text-slate-600` headers (`№`, Title Case) and `text-[16px]` body rows.
