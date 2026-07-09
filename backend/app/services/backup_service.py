"""
Backup Service — exportă datele critice din DB în Supabase Storage.
Rulează automat la fiecare 4 ore.
Șterge backup-urile mai vechi de 7 zile.
"""
import json
import os
import gzip
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx

from app.database import SessionLocal
from app.models import (
    WorkOrder, WorkOrderPhoto, Team, Client,
    User, Organization, PricingSetting,
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BACKUP_BUCKET = "backups"
RETENTION_DAYS = 7


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_dict(obj: Any) -> dict:
    """Convertește un model SQLAlchemy într-un dict serializabil JSON."""
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if val is None:
            result[col.name] = None
        elif isinstance(val, datetime):
            result[col.name] = val.isoformat()
        elif hasattr(val, 'isoformat'):  # date
            result[col.name] = val.isoformat()
        else:
            result[col.name] = val
    return result


def _supabase_headers() -> dict:
    return {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }


def _ensure_bucket_exists():
    """Creează bucket-ul 'backups' dacă nu există."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    url = f"{SUPABASE_URL}/storage/v1/bucket"
    payload = {
        "id": BACKUP_BUCKET,
        "name": BACKUP_BUCKET,
        "public": False,
        "fileSizeLimit": 52428800,  # 50MB
    }
    try:
        r = httpx.post(url, json=payload, headers=_supabase_headers(), timeout=15)
        if r.status_code in (200, 201):
            print(f"[Backup] Bucket '{BACKUP_BUCKET}' creat.")
        elif r.status_code == 409:
            pass  # Deja există
        else:
            print(f"[Backup] Eroare creare bucket: {r.status_code} {r.text}")
    except Exception as e:
        print(f"[Backup] Excepție creare bucket: {e}")


def _upload_to_supabase(filename: str, data_bytes: bytes) -> bool:
    """Uploadează fișierul în Supabase Storage."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[Backup] ⚠️  SUPABASE_URL sau SUPABASE_SERVICE_KEY lipsesc — backup omis.")
        return False

    url = f"{SUPABASE_URL}/storage/v1/object/{BACKUP_BUCKET}/{filename}"
    headers = {
        **_supabase_headers(),
        "Content-Type": "application/gzip",
        "x-upsert": "true",
    }
    try:
        r = httpx.post(url, content=data_bytes, headers=headers, timeout=60)
        if r.status_code in (200, 201):
            print(f"[Backup] ✅ Backup salvat: {filename}")
            return True
        else:
            print(f"[Backup] ❌ Eroare upload: {r.status_code} {r.text}")
            return False
    except Exception as e:
        print(f"[Backup] ❌ Excepție upload: {e}")
        return False


def _delete_old_backups():
    """Șterge backup-urile mai vechi de RETENTION_DAYS zile."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return

    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)

    # Lista fișierelor din bucket
    list_url = f"{SUPABASE_URL}/storage/v1/object/list/{BACKUP_BUCKET}"
    try:
        r = httpx.post(
            list_url,
            json={"prefix": "", "limit": 500, "sortBy": {"column": "created_at", "order": "asc"}},
            headers=_supabase_headers(),
            timeout=15,
        )
        if r.status_code != 200:
            print(f"[Backup] Eroare listare fișiere: {r.status_code}")
            return

        files = r.json()
        to_delete = []
        for f in files:
            created_at_str = f.get("created_at") or f.get("metadata", {}).get("lastModified")
            if not created_at_str:
                continue
            try:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                if created_at < cutoff:
                    to_delete.append(f["name"])
            except Exception:
                continue

        if not to_delete:
            return

        # Ștergere în bloc
        delete_url = f"{SUPABASE_URL}/storage/v1/object/{BACKUP_BUCKET}"
        rd = httpx.delete(
            delete_url,
            json={"prefixes": to_delete},
            headers=_supabase_headers(),
            timeout=15,
        )
        if rd.status_code in (200, 204):
            print(f"[Backup] 🗑️  Șterse {len(to_delete)} backup-uri vechi (>{RETENTION_DAYS} zile).")
        else:
            print(f"[Backup] Eroare ștergere vechi: {rd.status_code} {rd.text}")

    except Exception as e:
        print(f"[Backup] Excepție ștergere backup-uri vechi: {e}")


# ---------------------------------------------------------------------------
# Main backup function
# ---------------------------------------------------------------------------

def run_backup():
    """
    Exportă toate datele critice din DB și le salvează în Supabase Storage.
    Apelat automat la fiecare 4 ore.
    """
    print("[Backup] 🔄 Se pornește backup-ul automat...")
    _ensure_bucket_exists()

    db = SessionLocal()
    try:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

        backup_data = {
            "backup_timestamp": timestamp,
            "backup_version": "1.0",
            "tables": {}
        }

        # Work Orders
        work_orders = db.query(WorkOrder).all()
        backup_data["tables"]["work_orders"] = [_to_dict(wo) for wo in work_orders]
        print(f"[Backup]   work_orders: {len(work_orders)} rânduri")

        # Work Order Photos (metadata only, fără bytes)
        photos = db.query(WorkOrderPhoto).all()
        backup_data["tables"]["work_order_photos"] = [_to_dict(p) for p in photos]
        print(f"[Backup]   work_order_photos: {len(photos)} rânduri")

        # Teams
        teams = db.query(Team).all()
        backup_data["tables"]["teams"] = [_to_dict(t) for t in teams]
        print(f"[Backup]   teams: {len(teams)} rânduri")

        # Clients
        clients = db.query(Client).all()
        backup_data["tables"]["clients"] = [_to_dict(c) for c in clients]
        print(f"[Backup]   clients: {len(clients)} rânduri")

        # Employees / Users
        employees = db.query(User).all()
        backup_data["tables"]["users"] = [_to_dict(e) for e in employees]
        print(f"[Backup]   users: {len(employees)} rânduri")

        # Pricing Settings
        pricing = db.query(PricingSetting).all()
        backup_data["tables"]["pricing_settings"] = [_to_dict(p) for p in pricing]
        print(f"[Backup]   pricing_settings: {len(pricing)} rânduri")

        # Serialize + compress
        json_bytes = json.dumps(backup_data, ensure_ascii=False, default=str).encode("utf-8")
        compressed = gzip.compress(json_bytes)

        filename = f"backup_{timestamp}.json.gz"
        size_kb = len(compressed) / 1024
        print(f"[Backup]   Dimensiune fișier: {size_kb:.1f} KB")

        # Upload
        success = _upload_to_supabase(filename, compressed)

        if success:
            # Curăță backup-urile vechi
            _delete_old_backups()

    except Exception as e:
        print(f"[Backup] ❌ Eroare fatală la backup: {e}")
    finally:
        db.close()
