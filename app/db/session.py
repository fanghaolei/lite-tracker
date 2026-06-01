import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Resolve paths relative to the project root.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def resolve_db_path():
    configured_path = os.environ.get("LITE_TRACKER_DB_PATH")
    if configured_path:
        return configured_path if os.path.isabs(configured_path) else os.path.join(BASE_DIR, configured_path)
    return os.path.join(BASE_DIR, "lite-tracker.db")


DB_PATH = resolve_db_path()

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
