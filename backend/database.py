import os, stat
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////var/data/aegistrace.db")

# ── Ensure data directory exists ──────────────────────────────────────────────
if DATABASE_URL.startswith("sqlite:////var/data"):
    os.makedirs("/var/data", exist_ok=True)

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


# ── SQLite WAL mode + performance PRAGMAs ─────────────────────────────────────
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode = WAL")
    cursor.execute("PRAGMA synchronous = NORMAL")
    cursor.execute("PRAGMA busy_timeout = 5000")
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("PRAGMA cache_size = -64000")   # 64 MB page cache
    cursor.execute("PRAGMA temp_store = MEMORY")
    cursor.close()


def _harden_db_file_permissions():
    """
    Restrict the SQLite DB file to owner read/write only (0o600).
    Prevents other OS-level processes from reading the database file directly.
    No-ops gracefully on Windows or if the file doesn't exist yet.
    """
    try:
        # Extract file path from URL: sqlite:////var/data/aegistrace.db → /var/data/aegistrace.db
        if DATABASE_URL.startswith("sqlite:///"):
            db_path = DATABASE_URL[len("sqlite:///"):]
            if db_path and os.path.exists(db_path):
                current = stat.S_IMODE(os.stat(db_path).st_mode)
                if current != 0o600:
                    os.chmod(db_path, 0o600)
    except (OSError, AttributeError):
        pass  # Non-critical — ignore on Windows or read-only filesystems


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _harden_db_file_permissions()


def get_session():
    with Session(engine) as session:
        yield session
