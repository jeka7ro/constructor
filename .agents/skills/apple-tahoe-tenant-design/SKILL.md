---
name: apple-tahoe-tenant-design
description: Portable macOS Tahoe (Apple HIG) & Liquid Glass design system skill with ZERO hardcoded brand colors. All accent colors dynamically derive from the active tenant's brand color (--tenant-accent) via CSS color-mix(), paired with true neutral Light/Dark surfaces (zero blue-slate tint), WCAG AA contrast enforcement, iOS Safari mobile guards, and Playwright visual QA rules. Drop into .agents/skills/ of any multi-tenant web or desktop app.
---

# Apple Tahoe Multi-Tenant Design System (Zero Hardcoded Brand Colors)

Use this skill whenever building, styling, auditing, or refactoring UI in a **multi-tenant** React / Vue / Next.js / Tailwind CSS application.

> **Golden Rule of Color:** **NEVER hardcode a brand color** (`#047857`, `emerald-*`, `blue-*`, `indigo-*`, `violet-*`) for brand accents, primary buttons, active tabs, focus rings, or selected states. Every brand accent MUST resolve from **`--tenant-accent`** injected at runtime for the active tenant. All structural surfaces stay **100% true neutral** (pure alabaster in Light Mode, pure Apple charcoal in Dark Mode — **zero blue-slate tint**).

---

## 1. Dynamic Tenant Color Engine (1 Variable In → Full Palette Out)

Set **only two CSS variables** on `<html>` when a tenant loads (e.g., from DB/JWT/subdomain):

```ts
export function applyTenantTheme(primaryHex: string, secondaryHex?: string) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(primaryHex) ? primaryHex : '#18181B';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Automatic WCAG AA readable text on top of --tenant-accent
  const fg = luminance > 0.42 ? '#111113' : '#FFFFFF';

  const root = document.documentElement;
  root.style.setProperty('--tenant-accent', hex);
  root.style.setProperty('--tenant-accent-fg', fg);
  if (secondaryHex && /^#[0-9a-fA-F]{6}$/.test(secondaryHex)) {
    root.style.setProperty('--tenant-secondary', secondaryHex);
  } else {
    root.style.removeProperty('--tenant-secondary');
  }
}
```

---

## 2. Drop-In Base Stylesheet (`tokens.css` / `index.css`)

```css
/* ============================================================================
   Apple Tahoe (macOS 26) Multi-Tenant Neutral Design System
   Zero hardcoded brand colors — 100% driven by --tenant-accent
   ============================================================================ */

:root {
  color-scheme: light;
  --font-system: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", system-ui, sans-serif;

  /* ── Tenant Runtime Defaults (overwritten at runtime by applyTenantTheme) ── */
  --tenant-accent: #18181B;
  --tenant-accent-fg: #FFFFFF;

  /* ── Derived Tenant Scale (Pure CSS oklch — zero JS math needed) ── */
  --tenant-accent-hover: color-mix(in oklch, var(--tenant-accent) 86%, black);
  --tenant-accent-soft: color-mix(in oklch, var(--tenant-accent) 10%, transparent);
  --tenant-accent-soft-hover: color-mix(in oklch, var(--tenant-accent) 16%, transparent);
  --tenant-accent-border: color-mix(in oklch, var(--tenant-accent) 28%, transparent);
  --tenant-accent-gradient: linear-gradient(
    180deg,
    color-mix(in oklch, var(--tenant-accent) 90%, white) 0%,
    var(--tenant-accent) 100%
  );
  --tenant-accent-shadow: color-mix(in oklch, var(--tenant-accent) 32%, transparent);
  --tenant-focus-ring: var(--tenant-accent);

  /* ── True Neutral Light Surfaces (ZERO bluish slate cast) ── */
  --ui-canvas: #F2F2F4;
  --ui-canvas-mesh:
    radial-gradient(ellipse 75% 55% at 12% 0%, color-mix(in oklch, var(--tenant-accent) 6%, transparent), transparent 58%),
    radial-gradient(ellipse 65% 50% at 88% 100%, color-mix(in oklch, var(--tenant-accent) 4.5%, transparent), transparent 58%),
    #F2F2F4;
  --ui-surface: #FFFFFF;
  --ui-surface-subtle: #F6F6F8;
  --ui-label: #1D1D1F;
  --ui-label-secondary: #48484A;
  --ui-label-tertiary: #636366;
  --ui-separator: rgba(0, 0, 0, 0.075);
  --ui-separator-strong: rgba(0, 0, 0, 0.13);

  /* ── Functional Layer — Liquid Glass (Sidebar / Toolbar / Popovers ONLY) ── */
  --ui-glass-bar: rgba(255, 255, 255, 0.74);
  --ui-glass-sidebar: rgba(255, 255, 255, 0.78);
  --ui-glass-popover: rgba(255, 255, 255, 0.88);
  --ui-sheet-header-bg: rgba(255, 255, 255, 0.84);
  --ui-glass-specular: rgba(255, 255, 255, 0.92);
  --ui-glass-border: rgba(0, 0, 0, 0.085);

  --ui-card-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.075),
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 24px -14px rgba(0, 0, 0, 0.10);
  --ui-sidebar-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.08),
    0 10px 30px -12px rgba(0, 0, 0, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  --ui-toolbar-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.075),
    0 6px 20px -10px rgba(0, 0, 0, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);

  /* ── Segmented Controls & Tables ── */
  --ui-seg-track: #F4F4F6;
  --ui-seg-border: rgba(0, 0, 0, 0.09);
  --ui-thead-bg: rgba(246, 246, 248, 0.95);
  --ui-row-alt: rgba(0, 0, 0, 0.018);
  --ui-row-hover: color-mix(in oklch, var(--tenant-accent) 6%, transparent);

  /* ── Semantic Status (Independent of Tenant Brand Color) ── */
  --status-ok: #15803D;
  --status-warn: #B45309;
  --status-danger: #BE123C;
}

html.dark {
  color-scheme: dark;

  --tenant-accent-text: color-mix(in oklch, var(--tenant-accent) 78%, white);
  --tenant-accent-hover: color-mix(in oklch, var(--tenant-accent) 84%, white);
  --tenant-accent-soft: color-mix(in oklch, var(--tenant-accent) 16%, transparent);
  --tenant-accent-soft-hover: color-mix(in oklch, var(--tenant-accent) 24%, transparent);
  --tenant-accent-border: color-mix(in oklch, var(--tenant-accent) 36%, transparent);

  /* ── Pure Apple Charcoal Dark Surfaces (ZERO blue/slate tint!) ── */
  --ui-canvas: #0C0C0E;
  --ui-canvas-mesh:
    radial-gradient(ellipse 70% 50% at 15% 0%, color-mix(in oklch, var(--tenant-accent) 8%, transparent), transparent 55%),
    radial-gradient(ellipse 60% 45% at 88% 100%, color-mix(in oklch, var(--tenant-accent) 6%, transparent), transparent 55%),
    #0C0C0E;
  --ui-surface: #1C1C1E;
  --ui-surface-subtle: #262629;
  --ui-label: #F5F5F7;
  --ui-label-secondary: #AEAEB2;
  --ui-label-tertiary: #8E8E93;
  --ui-separator: rgba(255, 255, 255, 0.085);
  --ui-separator-strong: rgba(255, 255, 255, 0.16);

  --ui-glass-bar: rgba(26, 26, 28, 0.78);
  --ui-glass-sidebar: rgba(24, 24, 26, 0.82);
  --ui-glass-popover: rgba(30, 30, 32, 0.92);
  --ui-sheet-header-bg: rgba(28, 28, 30, 0.86);
  --ui-glass-specular: rgba(255, 255, 255, 0.12);
  --ui-glass-border: rgba(255, 255, 255, 0.11);

  --ui-card-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.095),
    0 2px 10px rgba(0, 0, 0, 0.34),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.06);
  --ui-sidebar-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.11),
    0 12px 36px -10px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  --ui-toolbar-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.11),
    0 8px 24px -8px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);

  --ui-seg-track: rgba(255, 255, 255, 0.065);
  --ui-seg-border: rgba(255, 255, 255, 0.11);
  --ui-thead-bg: rgba(28, 28, 30, 0.96);
  --ui-row-alt: rgba(255, 255, 255, 0.022);
  --ui-row-hover: color-mix(in oklch, var(--tenant-accent) 12%, transparent);

  /* Neutralize Tailwind v4 bluish slate scales into true neutral charcoal */
  --color-slate-950: #111113;
  --color-slate-900: #1C1C1E;
  --color-slate-800: #262629;
  --color-slate-700: #36363A;
  --color-slate-600: #48484A;
  --color-slate-500: #8E8E93;
  --color-slate-400: #9E9EA4;
  --color-slate-300: #C7C7CC;
  --color-slate-200: #E5E5EA;
  --color-slate-100: #F2F2F7;
  --color-slate-50:  #F5F5F7;

  --status-ok: #34D399;
  --status-warn: #FBBF24;
  --status-danger: #FB7185;
}

@layer base {
  html, body {
    margin: 0;
    max-width: 100vw;
    overflow-x: hidden;
    background: var(--ui-canvas);
    color: var(--ui-label);
    font-family: var(--font-system);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  :where(button, a, input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--tenant-focus-ring);
    outline-offset: 2px;
  }

  button, a, input, select, textarea, [role="button"] {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  @media (max-width: 767px) {
    input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
    select,
    textarea {
      font-size: 16px !important;
    }
  }
}

.tabular-nums, td, th { font-variant-numeric: tabular-nums; }

.ui-glass-sidebar {
  background-color: var(--ui-glass-sidebar);
  backdrop-filter: blur(36px) saturate(195%);
  -webkit-backdrop-filter: blur(36px) saturate(195%);
  box-shadow: var(--ui-sidebar-shadow);
}
.ui-glass-toolbar {
  background-color: var(--ui-glass-bar);
  backdrop-filter: blur(28px) saturate(195%);
  -webkit-backdrop-filter: blur(28px) saturate(195%);
  box-shadow: var(--ui-toolbar-shadow);
}
.ui-card {
  background-color: var(--ui-surface);
  color: var(--ui-label);
  border: 0.5px solid var(--ui-separator);
  border-radius: 16px;
  box-shadow: var(--ui-card-shadow);
}
.ui-inset-card {
  background-color: var(--ui-surface-subtle);
  border: 0.5px solid var(--ui-separator);
  border-radius: 14px;
}
html.dark .ui-inset-card {
  background-color: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.ui-sheet-backdrop {
  background-color: rgba(12, 12, 14, 0.44);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
html.dark .ui-sheet-backdrop { background-color: rgba(0, 0, 0, 0.62); }
.ui-sheet {
  background-color: var(--ui-surface);
  color: var(--ui-label);
  border-radius: 22px;
  border: 0.5px solid var(--ui-separator-strong);
  overscroll-behavior: contain;
  box-shadow: 0 28px 72px -18px rgba(0, 0, 0, 0.36);
}
.ui-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; padding: 0 14px; border-radius: 9999px;
  font-size: 12px; font-weight: 600;
  color: var(--tenant-accent-fg);
  background: var(--tenant-accent-gradient);
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px var(--tenant-accent-shadow), inset 0 0.5px 0 rgba(255, 255, 255, 0.28);
  cursor: pointer; white-space: nowrap;
  transition: filter 120ms ease, transform 80ms ease;
}
.ui-btn-primary:hover { filter: brightness(1.06); }
.ui-btn-primary:active { transform: scale(0.985); }

.ui-btn-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; padding: 0 12px; border-radius: 9999px;
  font-size: 12px; font-weight: 500;
  color: var(--ui-label); background-color: var(--ui-surface);
  border: 0.5px solid var(--ui-separator-strong);
  cursor: pointer; white-space: nowrap;
  transition: background-color 120ms ease, transform 80ms ease;
}
.ui-btn-secondary:hover { background-color: var(--ui-surface-subtle); }
.ui-btn-secondary:active { transform: scale(0.985); }

.ui-segmented {
  display: inline-flex; align-items: center; gap: 2px; padding: 3px;
  border-radius: 9999px;
  background-color: var(--ui-seg-track);
  border: 1px solid var(--ui-seg-border);
}
.ui-segment {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  height: 28px; padding: 0 11px; border-radius: 9999px;
  font-size: 12px; font-weight: 500;
  color: var(--ui-label-secondary); background: transparent; border: 0;
  cursor: pointer; white-space: nowrap;
  transition: background-color 140ms ease, color 140ms ease;
}
.ui-segment:hover { color: var(--ui-label); }
.ui-segment-active {
  background: var(--tenant-accent-gradient);
  color: var(--tenant-accent-fg) !important;
  font-weight: 600;
  box-shadow: 0 1px 4px var(--tenant-accent-shadow), inset 0 0.5px 0 rgba(255, 255, 255, 0.25);
}

@media (prefers-reduced-transparency: reduce) {
  .ui-glass-sidebar, .ui-glass-toolbar, .ui-sheet-backdrop {
    backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
  }
  :root { --ui-glass-bar: #FFFFFF; --ui-glass-sidebar: #F6F6F8; }
  html.dark { --ui-glass-bar: #1C1C1E; --ui-glass-sidebar: #18181A; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;
  }
}
```

---

## 3. Non-Negotiable Architecture & Craft Rules

1. **Two-Layer Separation (Apple Liquid Glass Rule):**
   - **Functional Layer (Glass):** Floating sidebar, sticky topbar, floating map/media controls, popovers, modal sheet headers.
   - **Content Layer (Opaque Neutral):** Data cards, KPI tiles, tables, forms, modals. **NEVER** apply blur/glass or colored tints onto data cards or table cells.
2. **Dark Mode Purity:**
   - Never use `bg-blue-950`, `bg-sky-950`, `bg-indigo-950`, or bluish Tailwind `slate-900` backgrounds for cards, banners, or status boxes in Dark Mode.
   - All dark cards stay neutral (`#1C1C1E` / `rgba(255,255,255,0.04)`). Put color **only** on small semantic icons, badges, or the single tenant accent control.
3. **Tenant Color Restraint (10% Rule):**
   - **90% neutral surfaces**, **10% tenant accent** (`--tenant-accent`): max **1** `.ui-btn-primary` CTA per view, active segmented tab, active sidebar item, focus ring, table hover tint, primary chart series.
   - **Semantic status independent:** Success (`--status-ok`), Warning (`--status-warn`), Danger (`--status-danger`) must NOT change with the tenant color.
4. **Typography & Numbers:**
   - Native system font stack (`-apple-system`, `SF Pro`, `system-ui`), `tabular-nums` on all KPIs/prices/dates/tables, `min-w-0` on flex/grid containers holding `truncate` text.
5. **Responsive & Accessibility:**
   - Zero horizontal overflow at `320px`, `375px`, `390px`, `1280px`, `1440px`, `1920px`.
   - Every modal supports `Escape` close, backdrop close, and `overscroll-behavior: contain`.
   - Every icon-only button MUST have `type="button"` and `aria-label`.

---

## 4. Mandatory Pre-Ship Verification Checklist

- [ ] Test `applyTenantTheme()` across **3 extreme tenant colors** (dark navy `#0F172A`, bright yellow `#FACC15`, vivid coral `#E11D48`) — verify zero hardcoded brand colors leak through and contrast stays `>= 4.5:1`.
- [ ] Visually inspect **Light + Dark** screenshots — verify **zero bluish dark cards**.
- [ ] Verify in headless Playwright at `1440×900`, `390×844`, and `375×812`: `0px` horizontal overflow, `0` console/HTTP errors, `0` icon buttons missing `aria-label`, `0` mobile inputs `< 16px`.
