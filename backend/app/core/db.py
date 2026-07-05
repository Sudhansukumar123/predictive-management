from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# ─── Engine setup ──────────────────────────────────────────────────────────
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Fix Railway PostgreSQL URL: sqlalchemy requires postgresql:// not postgres://
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
pool_kwargs = {}

if _is_sqlite:
    connect_args = {"check_same_thread": False}
else:
    # PostgreSQL production pool settings
    pool_kwargs = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,  # validates connections before use
        "pool_recycle": 300,    # recycle connections every 5 min
    }

engine = create_engine(_db_url, connect_args=connect_args, **pool_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─── FastAPI dependency ────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
