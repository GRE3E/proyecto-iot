from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os

# Define el directorio base para el archivo de la base de datos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_DIR = os.path.join(BASE_DIR, '..', '..', 'data')
DATABASE_PATH = os.path.join(DATABASE_DIR, 'casa_inteligente.db')

# Crea el directorio de datos si no existe
os.makedirs(DATABASE_DIR, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "check_same_thread": False
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Session:
    """
    Dependencia que proporciona una sesión de base de datos.
    Cada solicitud obtendrá su propia sesión de base de datos que se cerrará después.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_all_tables() -> None:
    """
    Crea todas las tablas definidas en los modelos de la base de datos.
    """
    Base.metadata.create_all(bind=engine)