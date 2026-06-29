import os, stat
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event, pool

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://aegistrace:aegistrace@localhost/aegistrace_db",
)

# Normalise Heroku/Render-style postgres:// → postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_IS_SQLITE = DATABASE_URL.startswith("sqlite://")

# ── Engine ─────────────────────────────────────────────────────────────────────
if _IS_SQLITE:
    # Local dev fallback — keep SQLite working unchanged
    _db_path_dir = None
    if DATABASE_URL.startswith("sqlite:////var/data"):
        os.makedirs("/var/data", exist_ok=True)
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _rec):
        cur = dbapi_conn.cursor()
        try:
            cur.execute("PRAGMA journal_mode = WAL")
        except Exception:
            cur.execute("PRAGMA journal_mode = DELETE")
        cur.execute("PRAGMA synchronous = NORMAL")
        cur.execute("PRAGMA busy_timeout = 5000")
        cur.execute("PRAGMA foreign_keys = ON")
        cur.execute("PRAGMA cache_size = -64000")
        cur.execute("PRAGMA temp_store = MEMORY")
        cur.close()

else:
    # PostgreSQL — production configuration
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,          # detects stale connections
        pool_recycle=1800,           # recycle connections every 30 min
        poolclass=pool.QueuePool,
    )


def _harden_db_file_permissions():
    """Restrict SQLite DB file to 0o600. No-op for PostgreSQL."""
    if not _IS_SQLITE:
        return
    try:
        if DATABASE_URL.startswith("sqlite:///"):
            db_path = DATABASE_URL[len("sqlite:///"):]
            if db_path and os.path.exists(db_path):
                if stat.S_IMODE(os.stat(db_path).st_mode) != 0o600:
                    os.chmod(db_path, 0o600)
    except (OSError, AttributeError):
        pass


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _harden_db_file_permissions()


def get_session():
    with Session(engine) as session:
        yield session
