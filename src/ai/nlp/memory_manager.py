import logging
import asyncio
import time
from typing import Generator, Optional, List
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.db.models import UserMemory, ConversationLog
from src.db.database import get_db
from datetime import datetime

logger = logging.getLogger("MemoryManager")

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
        memory_db = db.query(UserMemory).filter(UserMemory.user_id == user_id).with_for_update().first()
        
        if memory_db:
            logger.debug(f"Memoria recuperada para el usuario {user_id}: {memory_db}")
            return memory_db
            
        try:
            memory_db = UserMemory(user_id=user_id)
            db.add(memory_db)
            db.commit()
            db.refresh(memory_db)
            logger.debug(f"Nueva memoria creada para el usuario {user_id}: {memory_db}")
            return memory_db
        except IntegrityError:
            db.rollback()
            logger.info(f"Memoria ya existe para el usuario {user_id} debido a inserción concurrente. Recuperando registro existente.")
            
            for retry in range(3):
                memory_db = db.query(UserMemory).filter(UserMemory.user_id == user_id).with_for_update().first()
                if memory_db:
                    logger.debug(f"Memoria recuperada para el usuario {user_id} después de {retry+1} intentos: {memory_db}")
                    return memory_db
                time.sleep(0.1 * (2 ** retry))
                
            raise ValueError(f"Imposible recuperar memoria para usuario {user_id} después de múltiples intentos")

    async def search_conversation_logs(
        self, db: Session, user_id: int, query: str, limit: int = 10
    ) -> List[ConversationLog]:
        logger.debug(f"Buscando en el historial de conversación para el usuario '{user_id}' con la consulta '{query}' y límite '{limit}'.")
        try:
            logs = await asyncio.to_thread(
                lambda: db.query(ConversationLog)
                .filter(
                    ConversationLog.user_id == user_id,
                    or_(
                        ConversationLog.prompt.ilike(f"%{query}%"),
                        ConversationLog.response.ilike(f"%{query}%"),
                    ),
                )
                .order_by(ConversationLog.timestamp.desc())
                .limit(limit)
                .all()
            )
            logger.debug(f"Se encontraron {len(logs)} registros de conversación para la consulta '{query}'.")
            return logs
        except Exception as e:
            logger.error(f"Error al buscar en el historial de conversación para el usuario '{user_id}': {e}")
            return []

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

        memory_db = self._sync_get_user_memory_logic(db, user_id)

        memory_db.last_interaction = timestamp
        db.commit()
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
        logger.info(f"Log de conversación guardado para el usuario {user_id}. Prompt: '{prompt[:50]}...' ")