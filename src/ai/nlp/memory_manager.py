import logging
import logging
import asyncio
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.db.models import Base, UserMemory, ConversationLog
from src.db.database import get_db, create_all_tables # Importar get_db y create_all_tables
from datetime import datetime

class MemoryManager:
    """Clase para gestionar la memoria del usuario y los logs de conversación en la base de datos."""

    def __init__(self):
        """Inicializa el MemoryManager, asegurando que las tablas de la base de datos existan."""
        create_all_tables()

    async def async_init(self):
        """Método de inicialización asíncrona para configurar UserMemory."""
        await self._initialize_user_memory()

    def get_db(self) -> Generator[Session, None, None]:
        """Obtiene una sesión de base de datos.

        Returns:
            Generator[Session, None, None]: Un generador que produce una sesión de SQLAlchemy.
        """
        return get_db()

    async def _initialize_user_memory(self):
        """Inicializa la entrada de UserMemory si no existe ninguna en la base de datos."""
        def _sync_initialize():
            db = next(self.get_db())
            try:
                if not db.query(UserMemory).first():
                    new_memory = UserMemory()
                    db.add(new_memory)
                    db.commit()
                    logging.info("UserMemory initialized successfully.")
            except Exception as e:
                db.rollback()
                logging.error(f"Failed to initialize UserMemory: {e}", exc_info=True)
            finally:
                db.close()
        await asyncio.to_thread(_sync_initialize)

    async def get_user_memory(self, db: Session) -> UserMemory:
        """Recupera la memoria del usuario de la base de datos, creándola si no existe.

        Args:
            db (Session): La sesión de la base de datos.

        Returns:
            UserMemory: El objeto UserMemory del usuario.
        """
        def _sync_get_user_memory():
            memory_db = db.query(UserMemory).first()
            if not memory_db:
                memory_db = UserMemory()
                db.add(memory_db)
                db.commit()
                db.refresh(memory_db)
            return memory_db
        return await asyncio.to_thread(_sync_get_user_memory)

    async def update_memory(self, prompt: str, response: str, db: Session, speaker_identifier: Optional[str] = None):
        """Actualiza la última interacción del usuario y registra la conversación.

        Args:
            prompt (str): El prompt enviado por el usuario.
            response (str): La respuesta generada por el asistente.
            db (Session): La sesión de la base de datos.
            speaker_identifier (Optional[str]): Identificador del hablante, si está disponible.
        """
        def _sync_update_memory():
            timestamp = datetime.now()

            memory_db = db.query(UserMemory).first()
            if not memory_db:
                memory_db = UserMemory()
                db.add(memory_db)
                db.commit()
                db.refresh(memory_db)

            memory_db.last_interaction = timestamp
            db.commit()
            db.refresh(memory_db)

            conversation = ConversationLog(
                timestamp=timestamp,
                prompt=prompt,
                response=response,
                speaker_identifier=speaker_identifier
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

            logging.info("Memoria de usuario y log de conversación actualizados.")
        await asyncio.to_thread(_sync_update_memory)