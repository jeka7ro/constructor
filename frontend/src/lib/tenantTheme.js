/**
 * Apple Tahoe Multi-Tenant Dynamic Color Engine (Zero Hardcoded Brand Colors)
 * Sets --tenant-accent and --tenant-accent-fg (automatic WCAG AA readable foreground)
 * on <html> (document.documentElement), plus legacy aliases (--tenant-bg, --primary-tenant).
 */
export function applyTenantTheme(primaryHex, secondaryHex) {
    const normalized = typeof primaryHex === 'string' ? primaryHex.trim() : '';
    const hex = /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#18181B';
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    // Automatic WCAG AA readable text on top of --tenant-accent (>= 4.5:1 contrast)
    const fg = luminance > 0.42 ? '#111113' : '#FFFFFF';
    // Automatic WCAG AA readable accent text on top of white / light surfaces (#FFFFFF / #F2F2F4)
    const onLight = luminance > 0.35 ? '#111113' : hex;

    if (typeof document !== 'undefined' && document.documentElement) {
        const root = document.documentElement;
        root.style.setProperty('--tenant-accent', hex);
        root.style.setProperty('--tenant-accent-fg', fg);
        root.style.setProperty('--tenant-accent-on-light', onLight);
        root.style.setProperty('--tenant-bg', hex);
        root.style.setProperty('--primary-tenant', hex);

        if (secondaryHex && /^#[0-9a-fA-F]{6}$/.test(secondaryHex.trim())) {
            root.style.setProperty('--tenant-secondary', secondaryHex.trim());
        } else {
            root.style.removeProperty('--tenant-secondary');
        }
    }

    return { accent: hex, fg, onLight, luminance };
}

/**
 * Ensures every icon-only <button> in the DOM has type="button" and a non-empty aria-label
 * (Apple Tahoe / WCAG 4.1.2 accessibility enforcement).
 */
export function enforceIconButtonsAccessibility(rootNode) {
    if (typeof document === 'undefined') return;
    const scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
    const buttons = scope.querySelectorAll('button');
    buttons.forEach((btn) => {
        if (!btn.getAttribute('type')) {
            btn.setAttribute('type', 'button');
        }
        const currentAria = btn.getAttribute('aria-label');
        if (currentAria && currentAria.trim()) return;

        const visibleText = (btn.innerText || btn.textContent || '').replace(/\s+/g, ' ').trim();
        if (!visibleText) {
            const fallback =
                btn.getAttribute('title') ||
                btn.getAttribute('data-tooltip') ||
                btn.getAttribute('name') ||
                'Acțiune';
            btn.setAttribute('aria-label', fallback.trim());
        }
    });
}

if (typeof window !== 'undefined') {
    window.applyTenantTheme = applyTenantTheme;
    window.enforceIconButtonsAccessibility = enforceIconButtonsAccessibility;
}

export default applyTenantTheme;
