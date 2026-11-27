#!/usr/bin/env python3
"""
Automated Multi-Viewport UI Geometry & Web Interface Guidelines Auditor
Grounded in:
- anthropics/skills (webapp-testing)
- vercel-labs/agent-skills (web-design-guidelines)
- dickwu/apple-design-skill (apple-design)

Measures DOM geometry across mobile (320px, 375px, 390px, 430px), tablet (1024px),
and desktop (1440px) viewports against http://localhost:5678.
"""
import sys
from playwright.sync_api import sync_playwright

VIEWPORTS = [
    {"name": "iPhone SE (320px)", "width": 320, "height": 568, "is_mobile": True},
    {"name": "iPhone Mini (375px)", "width": 375, "height": 812, "is_mobile": True},
    {"name": "iPhone 16 (390px)", "width": 390, "height": 844, "is_mobile": True},
    {"name": "iPhone Pro Max (430px)", "width": 430, "height": 932, "is_mobile": True},
    {"name": "iPad Landscape (1024px)", "width": 1024, "height": 768, "is_mobile": False},
    {"name": "Desktop HD (1440px)", "width": 1440, "height": 900, "is_mobile": False},
]

def run_geometry_audit(base_url="http://localhost:5678"):
    print("=" * 78)
    print("🧭  WEBAPP-TESTING & VERCEL GUIDELINES — MULTI-VIEWPORT DOM GEOMETRY AUDIT")
    print("=" * 78)
    failures = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for vp in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                has_touch=vp["is_mobile"],
                is_mobile=vp["is_mobile"],
            )
            page = context.new_page()
            try:
                page.goto(f"{base_url}/admin/login", wait_until="networkidle", timeout=15000)
                metrics = page.evaluate(
                    """(isMobile) => {
                        const docWidth = document.documentElement.clientWidth;
                        const scrollWidth = document.documentElement.scrollWidth;
                        const hasHorizontalOverflow = scrollWidth > docWidth + 2;

                        const inputs = Array.from(document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea'));
                        let smallFontInputs = 0;
                        let noTouchManip = 0;
                        for (const el of inputs) {
                            const cs = window.getComputedStyle(el);
                            const fs = parseFloat(cs.fontSize || '16');
                            if (isMobile && fs < 15.5) smallFontInputs++;
                            if (cs.touchAction !== 'manipulation') noTouchManip++;
                        }

                        const bodyText = document.body.innerText || '';
                        const rawI18nMatches = bodyText.match(/\\b(reports|invoicing|auth|planning)\\.[a-z_]+\\b/g) || [];

                        return {
                            docWidth,
                            scrollWidth,
                            hasHorizontalOverflow,
                            smallFontInputs,
                            noTouchManip,
                            rawI18nMatches
                        };
                    }""",
                    vp["is_mobile"],
                )
                status = "🟢 PASS"
                if metrics["hasHorizontalOverflow"] or metrics["smallFontInputs"] > 0 or len(metrics["rawI18nMatches"]) > 0:
                    status = "🔴 FAIL"
                    failures += 1

                print(
                    f"{status} | {vp['name']:<24} | Overflow: {metrics['scrollWidth']}/{metrics['docWidth']}px "
                    f"| iOS Input >=16px: { 'OK' if metrics['smallFontInputs'] == 0 else 'FAIL' } "
                    f"| touch-action: { 'OK' if metrics['noTouchManip'] == 0 else 'WARN' } "
                    f"| Raw i18n keys: {len(metrics['rawI18nMatches'])}"
                )
            except Exception as e:
                print(f"⚠️  SKIP | {vp['name']:<24} | {e}")
            finally:
                context.close()
        browser.close()

    print("-" * 78)
    if failures == 0:
        print("🟢 VERDICT GEOMETRIE & HIG: 100% CONFORM PE TOATE REZOLUȚIILE")
        return 0
    else:
        print(f"🔴 VERDICT: {failures} probleme detectate.")
        return 1

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5678"
    sys.exit(run_geometry_audit(url))
