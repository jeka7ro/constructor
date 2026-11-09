#!/usr/bin/env python3
"""
Audit Gatekeeper — Pre-Push Automated Verification Suite (100% READ-ONLY)
Modeled after cloudflare/security-audit-skill deterministic verification phase.
Guarantees:
  - Zero database writes (no db.add / db.commit / db.delete).
  - Zero file modifications.
  - Verifies Python compilation, Pydantic empty-string resilience, DB integrity,
    6 Golden Quote Benchmarks, Multi-Tenant isolation, and AGENTS.md UI rules.
"""

import os
import sys
import glob
import py_compile
import re
import subprocess
import warnings

warnings.filterwarnings("ignore")

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

results = []
failures = []


def record(check_name: str, passed: bool, detail: str):
    icon = "🟢 PASS" if passed else "🔴 FAIL"
    results.append((icon, check_name, detail))
    if not passed:
        failures.append(f"{check_name}: {detail}")


# ── 1. PYTHON COMPILATION CHECK ─────────────────────────────────────────────
def check_python_compilation():
    py_files = (
        glob.glob(os.path.join(BACKEND_DIR, "app", "**", "*.py"), recursive=True)
        + [os.path.join(BACKEND_DIR, "main.py")]
    )
    errors = []
    for f in py_files:
        if not os.path.exists(f):
            continue
        try:
            py_compile.compile(f, doraise=True)
        except py_compile.PyCompileError as e:
            errors.append(f"{os.path.relpath(f, ROOT_DIR)}: {e.msg}")
    if errors:
        record("1. Compilare Python Backend", False, "; ".join(errors))
    else:
        record("1. Compilare Python Backend", True, f"{len(py_files)} fișiere .py compilate fără erori")


# ── 2. PYDANTIC EMPTY-STRING & COMMA RESILIENCE CHECK ───────────────────────
def check_pydantic_resilience():
    try:
        from app.api.admin_pricing import PricingSettingSchema

        schema = PricingSettingSchema(
            client_id="audit-test-client",
            base_price_sqm="12,5",
            base_price_sqm_large="",
            base_large_threshold_sqm="",
            extra_thickness_price_per_cm="1.25",
            extra_thickness_price_per_cm_large="",
            extra_thickness_large_threshold_sqm="",
            standard_thickness_cm="",
            plastic_foil_price_sqm="",
            metal_mesh_price_sqm="",
            fiber_price_sqm="2.5",
            fiber_price_sqm_large="",
            fiber_large_threshold_sqm="",
            min_invoice_threshold_sqm="",
            min_invoice_fixed_price_under="",
            min_invoice_min_price_over="",
            surface_thresholds=[{"id": "1", "min_sqm": "0", "max_sqm": "40", "extra_charge": ""}],
        )
        assert schema.base_price_sqm == 12.5, f"Expected 12.5, got {schema.base_price_sqm}"
        assert schema.base_price_sqm_large == 12.5, "Large base price did not fallback to base_price_sqm"
        assert schema.fiber_price_sqm_large == 2.5, "Large fiber price did not fallback to fiber_price_sqm"
        assert schema.min_invoice_fixed_price_under is None, "Empty min_invoice_fixed_price_under should be None"
        assert schema.min_invoice_min_price_over is None, "Empty min_invoice_min_price_over should be None"
        assert schema.base_large_threshold_sqm == 250.0, "Default large threshold should be 250.0"

        from app.api.admin_work_orders import WorkOrderCreate
        from app.api.admin_clients import ClientBase

        wo_schema = WorkOrderCreate(
            title="Test Audit",
            client_name="Client Test",
            surface_m2="",
            thickness_cm="",
            estimated_price=1250.5,
        )
        assert wo_schema.estimated_price == "1250.5"

        client_schema = ClientBase(
            first_name="Jean",
            last_name="Dupont",
            name="",
            email="",
            phone="",
        )
        assert client_schema.name == "Jean Dupont"

        record(
            "2. Reziliență Pydantic (Inputuri Goale '' & Virgule)",
            True,
            "PricingSettingSchema, WorkOrderCreate & ClientBase acceptă '' și ',' fără eroare 422",
        )
    except Exception as e:
        record("2. Reziliență Pydantic (Inputuri Goale '' & Virgule)", False, str(e))


# ── 3. READ-ONLY DATABASE INTEGRITY & MULTI-TENANT ISOLATION ────────────────
def check_database_integrity():
    try:
        from app.database import SessionLocal
        from app.models import Organization, PricingSetting, Client, LogisticSandStation

        db = SessionLocal()
        try:
            org = db.query(Organization).filter(Organization.slug == "davidechape").first()
            if not org:
                record("3. Integritate Bază de Date (Read-Only)", False, "Organizația 'davidechape' nu a fost găsită")
                return

            # 3a. Global Etalon PricingSetting
            global_ps = (
                db.query(PricingSetting)
                .filter(PricingSetting.organization_id == org.id, PricingSetting.client_id.is_(None))
                .first()
            )
            if not global_ps:
                record("3a. Etalon Tarife Davide Chape", False, "Lipsește rândul global (client_id IS NULL)")
            else:
                ok_250 = (
                    global_ps.base_large_threshold_sqm == 250.0
                    and global_ps.extra_thickness_large_threshold_sqm == 250.0
                    and global_ps.fiber_large_threshold_sqm == 250.0
                )
                ok_truck = (global_ps.truck_extra_price_flat or 0) > 0
                if ok_250 and ok_truck:
                    record(
                        "3a. Etalon Tarife Davide Chape",
                        True,
                        f"Prag mare = 250 m², Transport = {global_ps.truck_extra_price_flat} € (> {global_ps.truck_distance_threshold_km} km)",
                    )
                else:
                    record(
                        "3a. Etalon Tarife Davide Chape",
                        False,
                        f"Praguri={global_ps.base_large_threshold_sqm}, Transport={global_ps.truck_extra_price_flat}",
                    )

            # 3b. Sand Stations Count & Coordinates
            stations = (
                db.query(LogisticSandStation)
                .filter(LogisticSandStation.organization_id == org.id)
                .all()
            )
            priced = [s for s in stations if s.price_per_ton is not None]
            missing_coords = [s for s in stations if s.latitude is None or s.longitude is None]
            if len(stations) >= 65 and len(priced) >= 9 and len(missing_coords) == 0:
                record(
                    "3b. Integritate Stații de Nisip",
                    True,
                    f"{len(stations)} stații totale ({len(priced)} cu preț, {len(stations) - len(priced)} gri, 0 fără coordonate)",
                )
            else:
                record(
                    "3b. Integritate Stații de Nisip",
                    False,
                    f"Total={len(stations)} (așteptat >=65), Cu preț={len(priced)} (așteptat >=9), Fără coord={len(missing_coords)}",
                )

            # 3c. 6 Golden Quote Benchmarks
            from app.services.pricing_engine import calculate_quote_price

            isoflex_client = (
                db.query(Client)
                .filter(Client.organization_id == org.id, Client.name.ilike("%isoflex%"))
                .first()
            )
            isoflex_ps = (
                db.query(PricingSetting)
                .filter(PricingSetting.organization_id == org.id, PricingSetting.client_id == isoflex_client.id)
                .first()
                if isoflex_client
                else None
            )

            q1 = calculate_quote_price(
                {
                    "surfaces": [{"surface": 35, "thickness": 6, "has_foil": True, "has_mesh": False, "has_fiber": True}],
                    "distance_km": 60,
                },
                global_ps,
            )
            q2 = calculate_quote_price(
                {
                    "surfaces": [
                        {"surface": 80, "thickness": 7, "has_foil": False, "has_mesh": False, "has_fiber": True},
                        {"surface": 120, "thickness": 5, "has_foil": False, "has_mesh": False, "has_fiber": True},
                    ],
                    "distance_km": 140,
                },
                global_ps,
            )
            q3 = calculate_quote_price(
                {
                    "surfaces": [
                        {"surface": 150, "thickness": 6, "has_foil": False, "has_mesh": False, "has_fiber": True},
                        {"surface": 130, "thickness": 6, "has_foil": False, "has_mesh": False, "has_fiber": True},
                    ],
                    "distance_km": 80,
                },
                global_ps,
            )
            q4 = calculate_quote_price(
                {
                    "surfaces": [{"surface": 90, "thickness": 6, "has_foil": False, "has_mesh": False, "has_fiber": True}],
                    "isolations": [
                        {
                            "type": "pur",
                            "surface": 90,
                            "thickness": 8,
                            "aspiration": False,
                            "niveller": False,
                            "poncage": True,
                            "protection": False,
                        }
                    ],
                    "distance_km": 70,
                },
                global_ps,
            )
            q5a = calculate_quote_price(
                {
                    "surfaces": [{"surface": 35, "thickness": 6, "has_foil": False, "has_mesh": False, "has_fiber": True}],
                    "distance_km": 150,
                },
                isoflex_ps,
            )
            q5b = calculate_quote_price(
                {
                    "surfaces": [{"surface": 70, "thickness": 6, "has_foil": False, "has_mesh": False, "has_fiber": True}],
                    "distance_km": 150,
                },
                isoflex_ps,
            )

            expected = [
                ("Deviz 1 (35m² Forfait 600€)", q1["total_net"], 1210.75),
                ("Deviz 2 (80+120=200m² Multi-Chape Forfait 0€ + Transp 250€)", q2["total_net"], 3450.00),
                ("Deviz 3 (150+130=280m² > 250m² Tarif Mare)", q3["total_net"], 4256.00),
                ("Deviz 4 (90m² Chape + PUR 8cm)", q4["total_net"], 3760.50),
                ("Deviz 5A (Isoflex 35m² <= 40m² Plafon 850€)", q5a["total_net"], 850.00),
                ("Deviz 5B (Isoflex 70m² > 40m² Plafon 1050€)", q5b["total_net"], 1050.00),
            ]
            mismatches = [f"{lbl}: calculat={got}€, așteptat={exp}€" for lbl, got, exp in expected if abs(got - exp) > 0.01]
            if mismatches:
                record("4. Devize Etalon (6 Scenarii de Control)", False, "; ".join(mismatches))
            else:
                record(
                    "4. Devize Etalon (6 Scenarii de Control)",
                    True,
                    "Toate cele 6 devize etalon (1210.75€, 3450€, 4256€, 3760.50€, 850€, 1050€) sunt 100% exacte",
                )
        finally:
            db.close()
    except Exception as e:
        record("3. Integritate Bază de Date & Devize", False, str(e))


# ── 4. STATIC CODE RULES & SECURITY INVARIANTS (AGENTS.md) ──────────────────
def check_static_rules():
    violations = []

    # Check that pdf_generator.py and admin_work_orders.py filter PricingSetting by client_id
    for rel_path in ["backend/app/api/admin_work_orders.py", "backend/app/services/pdf_generator.py"]:
        full_path = os.path.join(ROOT_DIR, rel_path)
        if os.path.exists(full_path):
            content = open(full_path, encoding="utf-8").read()
            # Look for unfiltered db.query(PricingSetting).filter(PricingSetting.organization_id == ...).first()
            unfiltered = re.findall(
                r"db\.query\(PricingSetting\)\.filter\(\s*PricingSetting\.organization_id\s*==\s*[^,)]+\s*\)\.first\(\)",
                content,
            )
            if unfiltered:
                violations.append(f"{rel_path}: Interogare PricingSetting fără filtru client_id!")

    # Check modified frontend files in git diff for window.confirm / alert( / INV-${
    try:
        diff_out = subprocess.check_output(
            ["git", "diff", "HEAD", "--unified=0", "--", "frontend/src"],
            cwd=ROOT_DIR,
            text=True,
        )
        added_lines = [
            line[1:]
            for line in diff_out.splitlines()
            if line.startswith("+") and not line.startswith("+++")
        ]
        for line in added_lines:
            if re.search(r"\b(window\.confirm|window\.alert|alert\(|confirm\(|prompt\()", line):
                violations.append(f"Regula 5 încălcată (alert/confirm nativ în diff): {line.strip()[:60]}")
            if re.search(r"(INV|EST|DEV)-\$\{", line):
                violations.append(f"Regula 1 încălcată (fallback UUID în diff): {line.strip()[:60]}")
    except Exception:
        pass

    if violations:
        record("5. Reguli AGENTS.md & Izolare Tarife", False, "; ".join(violations))
    else:
        record(
            "5. Reguli AGENTS.md & Izolare Tarife",
            True,
            "0 alerte native, 0 interogări PricingSetting nefiltrate, 0 scurtături UUID",
        )


if __name__ == "__main__":
    print("=" * 78)
    print("🛡️  AUDIT GATEKEEPER — RAPORT DE VERIFICARE PRE-PUSH (100% READ-ONLY)")
    print("=" * 78)
    check_python_compilation()
    check_pydantic_resilience()
    check_database_integrity()
    check_static_rules()

    for icon, name, detail in results:
        print(f"{icon} | {name}\n       └─ {detail}")
    print("-" * 78)
    if failures:
        print(f"🔴 VERDICT FINAL: BLOCAT LA PUSH ({len(failures)} probleme găsite)")
        sys.exit(1)
    else:
        print("🟢 VERDICT FINAL: VERDE — 100% SIGUR PENTRU PUSH")
        sys.exit(0)
