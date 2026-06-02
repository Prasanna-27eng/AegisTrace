import os
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////var/data/aegistrace.db")

# Ensure /var/data exists if using default path
if DATABASE_URL.startswith("sqlite:////var/data"):
    os.makedirs("/var/data", exist_ok=True)

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
