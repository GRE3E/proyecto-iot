import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import asynccontextmanager
from typing import AsyncGenerator

logger = logging.getLogger("Database")

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATABASE_DIR = PROJECT_ROOT / "data"
DATABASE_PATH = DATABASE_DIR / "casa_inteligente.db"
DATABASE_DIR.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite+aiosqlite:///{DATABASE_PATH}"


async_engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
SessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provee una sesión de DB asíncrona (dependencia).
    """
    async with SessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()

async def create_all_tables() -> None:
    """
    Crea las tablas definidas por los modelos e índices de optimización.
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"Tablas creadas correctamente en: {DATABASE_PATH}")

    try:
        from db.models import (
            User, Face, Preference, Permission,
            UserPermission, UserMemory, ConversationLog,
            APILog, IoTCommand, DeviceState
        )
    except Exception as e:
        logger.warning(f"No se pudieron importar todos los modelos: {e}. Intentando importar lo que exista.")
        from db import models
    
    try:
        from src.db.migrations import create_nlp_indexes
        async with SessionLocal() as db:
            await create_nlp_indexes(db)
            logger.info("Índices NLP creados exitosamente")
    except Exception as e:
        logger.error(f"Error al crear índices NLP: {e}")
        