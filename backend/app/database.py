from sqlalchemy import create_engine, text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
        connect_args={
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
            "connect_timeout": 10,
            "options": "-c statement_timeout=15000"
        }
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from sqlalchemy import MetaData
metadata = MetaData(schema="saas_app")
_DeclarativeBase = declarative_base(metadata=metadata)

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL SANITIZER MIXIN
# Adaugat pe Base, converteste orice string gol ("" sau "  ") in NULL
# inainte sa fie salvat in DB, prevenind erori de validare Pydantic la citire
# ─────────────────────────────────────────────────────────────────────────────
class _SanitizeMixin:
    """Mixin that converts empty strings to None on any ORM attribute set."""

    def __setattr__(self, key: str, value):
        # Only sanitize plain string values on non-private attributes
        if (
            isinstance(value, str)
            and not key.startswith("_")
            and value.strip() == ""
        ):
            value = None
        super().__setattr__(key, value)


# Base is the combined class — every model that extends Base gets sanitization
class Base(_SanitizeMixin, _DeclarativeBase):  # type: ignore[misc]
    __abstract__ = True

def get_db():
    """Dependency for database sessions with retry on connection failure"""
    import time
    db = None
    last_err = None
    for attempt in range(3):
        try:
            db = SessionLocal()
            # Test the connection is alive
            db.execute(text("SELECT 1"))
            break  # Connection works, exit retry loop
        except Exception as e:
            last_err = e
            if db:
                try:
                    db.close()
                except:
                    pass
                db = None
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
    
    if db is None:
        raise last_err
    
    try:
        yield db
    finally:
        db.close()

def warmup_pool():
    """Pre-warm the connection pool to avoid cold-start latency."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("🔌 DB connection pool warmed up")
    except Exception as e:
        print(f"⚠️  DB warmup failed: {e}")
