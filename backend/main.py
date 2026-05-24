from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Import routers
from app.api import auth, admin_auth, admin_users, admin_sites, admin_roles, admin_reports, clockin, timesheets, teams, sites, photo_upload, site_photos, admin_teams, admin_vehicles, warehouse

import threading

_scheduler_stop = threading.Event()

def _daily_clockin_loop():
    """Background thread: auto-clock-in test workers at ~08:05 Romanian time."""
    import time as time_mod
    from app.timezone import now_ro, today_ro
    last_run_date = None
    while not _scheduler_stop.is_set():
        now = now_ro()
        today = today_ro()
        # Run once per day after 08:05 Romanian time
        if now.hour >= 8 and last_run_date != today:
            try:
                from seed_test_workers import auto_clockin_today
                from app.database import SessionLocal
                from app.models import User
                db = SessionLocal()
                users = db.query(User).filter(User.employee_code.like("TEST%"), User.is_active == True).all()
                if users:
                    auto_clockin_today(db, users)
                    print(f"🤖 Auto clock-in done for {len(users)} test workers")
                db.close()
            except Exception as e:
                print(f"⚠️  Auto clock-in error: {e}")
            last_run_date = today
        _scheduler_stop.wait(60)  # check every 60s


def _run_migrations(engine):
    """Auto-add any missing columns to keep DB in sync with models."""
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE construction_sites ADD COLUMN IF NOT EXISTS lunch_break_start VARCHAR(10);",
        "ALTER TABLE construction_sites ADD COLUMN IF NOT EXISTS lunch_break_end VARCHAR(10);",
        "ALTER TABLE construction_sites ADD COLUMN IF NOT EXISTS max_overtime_minutes INTEGER DEFAULT 0;",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100);",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS documents JSONB;",
        """CREATE TABLE IF NOT EXISTS equipment_daily_logs (
            id VARCHAR(36) PRIMARY KEY,
            vehicle_id VARCHAR(36) NOT NULL,
            site_id VARCHAR(36),
            operator_id VARCHAR(36),
            date DATE NOT NULL,
            is_used BOOLEAN DEFAULT TRUE,
            refueled BOOLEAN DEFAULT FALSE,
            refuel_liters FLOAT DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );""",
        """CREATE TABLE IF NOT EXISTS warehouse_items (
            id VARCHAR(36) PRIMARY KEY,
            organization_id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            unit VARCHAR(20) NOT NULL,
            total_quantity FLOAT DEFAULT 0.0 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );""",
        """CREATE TABLE IF NOT EXISTS warehouse_transactions (
            id VARCHAR(36) PRIMARY KEY,
            item_id VARCHAR(36) NOT NULL,
            transaction_type VARCHAR(10) NOT NULL,
            quantity FLOAT NOT NULL,
            date DATE NOT NULL,
            operated_by_id VARCHAR(36),
            assigned_to_user_id VARCHAR(36),
            assigned_to_vehicle_id VARCHAR(36),
            site_id VARCHAR(36),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );""",
        # Postgres migration to drop foreign key for operated_by_id if it was created
        "ALTER TABLE warehouse_transactions DROP CONSTRAINT IF EXISTS warehouse_transactions_operated_by_id_fkey;",
        "ALTER TABLE warehouse_transactions ADD COLUMN IF NOT EXISTS site_id VARCHAR(36);"
    ]
    try:
        with engine.connect() as conn:
            for sql in migrations:
                try:
                    conn.execute(text(sql))
                except Exception:
                    pass
            conn.commit()
        print("✅ DB migrations applied.")
    except Exception as e:
        print(f"⚠️  Migration warning: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — auto-create tables (needed for fresh PostgreSQL)
    from app.database import engine, Base, warmup_pool
    from app import models  # noqa: ensure all models are imported
    Base.metadata.create_all(bind=engine)
    _run_migrations(engine)
    warmup_pool()
    print("🚀 Starting Pontaj Digital API...")

    # Start daily scheduler
    # t = threading.Thread(target=_daily_clockin_loop, daemon=True)
    # t.start()
    print("📅 Daily auto-clock-in scheduler DISABLED explicitly by user")

    yield
    # Shutdown
    _scheduler_stop.set()
    print("👋 Shutting down Pontaj Digital API...")

app = FastAPI(
    title="Pontaj Digital API",
    description="Enterprise Construction Timesheet System",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:6001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api")
async def root():
    return {
        "message": "Pontaj Digital API",
        "version": "1.0.0",
        "status": "running"
    }

# Serve uploaded static files (documents, photos)
os.makedirs("uploads", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "storage": "supabase" if os.getenv("SUPABASE_URL") else "local",
        "supabase_url": bool(os.getenv("SUPABASE_URL")),
        "supabase_key": bool(os.getenv("SUPABASE_SERVICE_KEY")),
    }

# Reverse geocode proxy (avoids CORS issues with Nominatim from browser)
import requests as _requests

@app.get("/api/reverse-geocode")
def reverse_geocode(lat: float, lon: float):
    """Proxy reverse geocoding to Nominatim to avoid browser CORS"""
    try:
        resp = _requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json", "accept-language": "ro"},
            headers={"User-Agent": "PontajDigital/1.0"},
            timeout=5
        )
        return resp.json()
    except Exception:
        return {"display_name": ""}

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin_auth.router, prefix="/api/admin", tags=["admin"])
app.include_router(admin_users.router, prefix="/api", tags=["admin-users"])
app.include_router(admin_sites.router, prefix="/api", tags=["admin-sites"])
app.include_router(admin_roles.router, prefix="/api", tags=["admin-roles"])
app.include_router(photo_upload.router, prefix="/api", tags=["photos"])
app.include_router(admin_reports.router, prefix="/api/admin/reports", tags=["admin-reports"])
app.include_router(clockin.router, prefix="/api", tags=["clockin"])
app.include_router(timesheets.router, prefix="/api", tags=["timesheets"])
app.include_router(teams.router, prefix="/api", tags=["teams"])
app.include_router(sites.router, prefix="/api", tags=["sites"])
app.include_router(site_photos.router, prefix="/api", tags=["site-photos"])
app.include_router(admin_teams.router, prefix="/api", tags=["admin-teams"])
app.include_router(admin_vehicles.router, prefix="/api", tags=["admin-fleet"])
app.include_router(warehouse.router, prefix="/api", tags=["warehouse"])

# Serve uploaded files (ID cards, etc.)
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
logos_dir = uploads_dir / "logos"
logos_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


# Logo upload endpoint
from fastapi import File, UploadFile
from app.api.admin_auth import get_current_admin
from app.models import Admin
import uuid as _uuid
from app.storage import upload_file as storage_upload, get_content_type

@app.post("/api/admin/upload-logo")
async def upload_logo(file: UploadFile = File(...), current_admin: Admin = Depends(get_current_admin)):
    """Upload organization logo"""
    allowed = ('.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif')
    import os
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Format neacceptat. Acceptăm: {', '.join(allowed)}")
    
    filename = f"org_logo_{_uuid.uuid4().hex[:8]}{ext}"
    content = await file.read()
    logo_url = storage_upload(content, f"logos/{filename}", get_content_type(filename))
    
    return {"logo_url": logo_url, "message": "Logo încărcat cu succes"}

# Serve frontend static files with SPA fallback
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # Mount static assets (JS, CSS, images, etc.)
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    
    # Serve other static files (sw.js, workbox, icons, manifest, etc.)
    app.mount("/static-files", StaticFiles(directory=str(frontend_dist)), name="static-root")

    # SPA catch-all: serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        from starlette.responses import FileResponse as StarletteFileResponse
        
        # Files that must never be cached (SW, index.html)
        no_cache_files = {'sw.js', 'registerSW.js', 'index.html', 'manifest.webmanifest', 'workbox-8c29f6e4.js'}
        
        # Try to serve the file directly first
        file_path = frontend_dist / full_path
        if full_path and file_path.exists() and file_path.is_file():
            headers = {}
            if full_path.split('/')[-1] in no_cache_files:
                headers = {"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"}
            return FileResponse(str(file_path), headers=headers)
        # Otherwise serve index.html for SPA routing
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
        return {"detail": "Not found"}
