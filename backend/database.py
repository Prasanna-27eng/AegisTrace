import os
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event, text

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////var/data/aegistrace.db")

# Ensure /var/data exists if using default path
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


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
