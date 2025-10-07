import logging
import asyncio

logger = logging.getLogger("MemoryManager")
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.db.models import Base, UserMemory, ConversationLog
from src.db.database import get_db, create_all_tables # Importar get_db y create_all_tables
from datetime import datetime

class MemoryManager:
    """Clase para gestionar la memoria del usuario y los logs de conversación en la base de datos."""

    def __init__(self):
        """Inicializa el MemoryManager."""
        pass

    async def async_init(self):
        pass

    def get_db(self) -> Generator[Session, None, None]:
        """Obtiene una sesión de base de datos.

        Returns:
            Generator[Session, None, None]: Un generador que produce una sesión de SQLAlchemy.
        """
        return get_db()

    async def get_user_memory(self, db: Session, user_id: int) -> UserMemory:
        """Recupera la memoria del usuario de la base de datos, creándola si no existe.

        Args:
            db (Session): La sesión de la base de datos.
            user_id (int): El ID del usuario.

        Returns:
            UserMemory: El objeto UserMemory del usuario.
        """
        logger.debug(f"Recuperando memoria para el usuario {user_id}")
        return await asyncio.to_thread(self._sync_get_user_memory_logic, db, user_id)

    def _sync_get_user_memory_logic(self, db: Session, user_id: int) -> UserMemory:
        memory_db = db.query(UserMemory).filter(UserMemory.user_id == user_id).first()
        if not memory_db:
            logger.info(f"Memoria no encontrada para el usuario {user_id}. Creando nueva memoria.")
            memory_db = UserMemory(user_id=user_id)
            db.add(memory_db)
            db.commit()
            db.refresh(memory_db)
            logger.debug(f"Nueva memoria creada para el usuario {user_id}: {memory_db}")
        else:
            logger.debug(f"Memoria encontrada para el usuario {user_id}: {memory_db}")
        return memory_db

    async def search_conversation_logs(self, db: Session, user_id: int, query: str, limit: int = 5) -> list[ConversationLog]:
        """Busca en los logs de conversación de un usuario específico.

        Args:
            db (Session): La sesión de la base de datos.
            user_id (int): El ID del usuario.
            query (str): La cadena de texto a buscar en los prompts y respuestas.
            limit (int): El número máximo de resultados a devolver.

        Returns:
            list[ConversationLog]: Una lista de objetos ConversationLog que coinciden con la búsqueda.
        """
        logger.debug(f"Buscando en logs de conversación para el usuario {user_id} con query '{query}' y límite {limit}")
        return await asyncio.to_thread(self._sync_search_conversation_logs_logic, db, user_id, query, limit)

    def _sync_search_conversation_logs_logic(self, db: Session, user_id: int, query: str, limit: int) -> list[ConversationLog]:
        search_pattern = f"%{query}%"
        results = db.query(ConversationLog).filter(
            ConversationLog.user_id == user_id,
            (ConversationLog.prompt.ilike(search_pattern)) |
            (ConversationLog.response.ilike(search_pattern))
        ).order_by(ConversationLog.timestamp.desc()).limit(limit).all()
        logger.debug(f"Se encontraron {len(results)} resultados para la búsqueda de conversación.")
        return results

    async def update_memory(self, user_id: int, prompt: str, response: str, db: Session, speaker_identifier: Optional[str] = None):
        """Actualiza la última interacción del usuario y registra la conversación.

        Args:
            user_id (int): El ID del usuario.
            prompt (str): El prompt enviado por el usuario.
            response (str): La respuesta generada por el asistente.
            db (Session): La sesión de la base de datos.
            speaker_identifier (Optional[str]): Identificador del hablante, si está disponible.
        """
        logger.debug(f"Actualizando memoria para el usuario {user_id}. Prompt: '{prompt[:50]}...', Response: '{response[:50]}...' ")
        await asyncio.to_thread(self._sync_update_memory_logic, user_id, prompt, response, db, speaker_identifier)

    def _sync_update_memory_logic(self, user_id: int, prompt: str, response: str, db: Session, speaker_identifier: Optional[str] = None):
        timestamp = datetime.now()

        memory_db = db.query(UserMemory).filter(UserMemory.user_id == user_id).first()
        if not memory_db:
            logger.info(f"Memoria de usuario no encontrada para {user_id}. Creando nueva entrada.")
            memory_db = UserMemory(user_id=user_id)
            db.add(memory_db)
            db.commit()
            db.refresh(memory_db)

        memory_db.last_interaction = timestamp
        db.commit()
        db.refresh(memory_db)
        logger.debug(f"Última interacción actualizada para el usuario {user_id}.")

        conversation = ConversationLog(
            user_id=user_id,
            timestamp=timestamp,
            prompt=prompt,
            response=response,
            speaker_identifier=speaker_identifier
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        logger.info(f"Log de conversación guardado para el usuario {user_id}. Prompt: '{prompt[:50]}...' ")