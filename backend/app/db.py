from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db_migrations():
    """Ensure optional columns exist on sqlite tables."""
    if "sqlite" in settings.DATABASE_URL:
        import sqlite3
        from pathlib import Path
        url = settings.DATABASE_URL.replace("sqlite:///", "")
        db_path = Path(url).resolve()
        if db_path.exists():
            try:
                with sqlite3.connect(db_path) as conn:
                    cur = conn.cursor()
                    cur.execute("PRAGMA table_info(ride_stops)")
                    cols = [row[1] for row in cur.fetchall()]
                    if cols:
                        new_cols = [
                            ("source", "TEXT DEFAULT 'osm'"),
                            ("brand", "TEXT DEFAULT ''"),
                            ("offset_km", "FLOAT DEFAULT 0.0"),
                            ("tags_json", "TEXT DEFAULT '{}'"),
                            ("maps_url", "TEXT DEFAULT ''"),
                            ("is_optional", "BOOLEAN DEFAULT 0")
                        ]
                        for cname, ctype in new_cols:
                            if cname not in cols:
                                try:
                                    cur.execute(f"ALTER TABLE ride_stops ADD COLUMN {cname} {ctype}")
                                except Exception:
                                    pass
                        conn.commit()
            except Exception:
                pass

init_db_migrations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
