from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os

# --------------------------
# PROJECT_ROOT -> raíz del proyecto (sube 2 niveles desde src/db)
# --------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# --------------------------
# Ruta del archivo de la BD (en /data)
# --------------------------
DATABASE_DIR = os.path.join(PROJECT_ROOT, "data")
DATABASE_PATH = os.path.join(DATABASE_DIR, "casa_inteligente.db")

# Mostrar la ruta de la base de datos para depuración
print("Base de datos en:", DATABASE_PATH)

# Asegurar que exista el directorio data
os.makedirs(DATABASE_DIR, exist_ok=True)

# URL de SQLAlchemy
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Crear el engine y la sesión
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Session:
    """
    Provee una sesión de DB (dependencia).
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_all_tables() -> None:
    """
    Crea las tablas definidas por los modelos.
    """
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas correctamente en:", DATABASE_PATH)

# ---------------------------------------------
# EJECUCIÓN DIRECTA DEL SCRIPT -> crea las tablas
# ---------------------------------------------
if __name__ == "__main__":
    # Importar todos los modelos para que estén registrados en Base.metadata
    try:
        from db.models import (
            User, Face, Preference, Permission,
            UserPermission, UserMemory, ConversationLog,
            APILog, IoTCommand
        )
    except Exception:
        # Si no tenés algunos modelos listados, igualmente intentamos crear tablas
        # para los que existan. Esto evita fallos si tu models.py tiene nombres distintos.
        from db import models  # importa lo que exista
    create_all_tables()

