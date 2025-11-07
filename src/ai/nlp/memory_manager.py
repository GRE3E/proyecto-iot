import logging
import time
from typing import Generator, Optional, List
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
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

    async def get_user_memory(self, db: AsyncSession, user_id: int) -> UserMemory:
        """Recupera la memoria del usuario de la base de datos, creándola si no existe.

        Args:
            db (AsyncSession): La sesión de la base de datos.
            user_id (int): El ID del usuario.

        Returns:
            UserMemory: El objeto UserMemory del usuario.
        """
        logger.debug(f"Recuperando memoria para el usuario {user_id}")
        return await self._async_get_user_memory_logic(db, user_id)

    async def _async_get_user_memory_logic(self, db: AsyncSession, user_id: int) -> UserMemory:
        result = await db.execute(select(UserMemory).filter(UserMemory.user_id == user_id).with_for_update())
        memory_db = result.scalars().first()
        
        if memory_db:
            logger.debug(f"Memoria recuperada para el usuario {user_id}: {memory_db}")
            return memory_db
            
        try:
            memory_db = UserMemory(user_id=user_id)
            db.add(memory_db)
            await db.commit()
            await db.refresh(memory_db)
            logger.debug(f"Nueva memoria creada para el usuario {user_id}: {memory_db}")
            return memory_db
        except IntegrityError:
            await db.rollback()
            logger.info(f"Memoria ya existe para el usuario {user_id} debido a inserción concurrente. Recuperando registro existente.")
            
            for retry in range(3):
                result = await db.execute(select(UserMemory).filter(UserMemory.user_id == user_id).with_for_update())
                memory_db = result.scalars().first()
                if memory_db:
                    logger.debug(f"Memoria recuperada para el usuario {user_id} después de {retry+1} intentos: {memory_db}")
                    return memory_db
                time.sleep(0.1 * (2 ** retry))
                
            raise ValueError(f"Imposible recuperar memoria para usuario {user_id} después de múltiples intentos")

    async def search_conversation_logs(
        self, db: AsyncSession, user_id: int, query: str, limit: int = 10
    ) -> List[ConversationLog]:
        logger.debug(f"Buscando en el historial de conversación para el usuario '{user_id}' con la consulta '{query}' y límite '{limit}'.")
        try:
            result = await db.execute(
                select(ConversationLog)
                .filter(
                    ConversationLog.user_id == user_id,
                    or_(
                        ConversationLog.prompt.ilike(f"%{query}%"),
                        ConversationLog.response.ilike(f"%{query}%"),
                    ),
                )
                .order_by(ConversationLog.timestamp.asc())
                .limit(limit)
            )
            logs = result.scalars().all()
            logger.debug(f"Se encontraron {len(logs)} registros de conversación para la consulta '{query}'.")
            return logs
        except Exception as e:
            logger.error(f"Error al buscar en el historial de conversación para el usuario '{user_id}': {e}")
            return []

    async def get_conversation_logs_by_user_id(self, db: AsyncSession, user_id: int, limit: int = 100) -> str:
        """
        Recupera los logs de conversación para un usuario específico y los formatea.

        Args:
            db (Session): La sesión de la base de datos.
            user_id (int): El ID del usuario.
            limit (int): El número máximo de logs a recuperar.

        Returns:
            str: Una cadena formateada con el historial de conversación.
        """
        logger.debug(f"Recuperando logs de conversación para el usuario '{user_id}' con límite '{limit}'.")
        try:
            result = await db.execute(
                select(ConversationLog)
                .filter(ConversationLog.user_id == user_id)
                .order_by(ConversationLog.timestamp.asc())
                .limit(limit)
            )
            logs = result.scalars().all()
            logger.debug(f"Se encontraron {len(logs)} logs de conversación para el usuario '{user_id}'.")

            formatted_history = []
            for i, log in enumerate(logs):
                formatted_history.append(f"Historial {i+1}: user\n{log.prompt}")
                formatted_history.append(f"Historial {i+1}: asistente\n{log.response}")
            
            return "\n".join(formatted_history)
        except Exception as e:
            logger.error(f"Error al recuperar logs de conversación para el usuario '{user_id}': {e}")
            return ""

    async def get_raw_conversation_logs_by_user_id(self, db: AsyncSession, user_id: int, limit: int = 100) -> List[ConversationLog]:
        """
        Recupera los logs de conversación para un usuario específico sin formatear.

        Args:
            db (Session): La sesión de la base de datos.
            user_id (int): El ID del usuario.
            limit (int): El número máximo de logs a recuperar.

        Returns:
            List[ConversationLog]: Una lista de objetos ConversationLog.
        """
        logger.debug(f"Recuperando logs de conversación RAW para el usuario '{user_id}' con límite '{limit}'.")
        try:
            result = await db.execute(
                select(ConversationLog)
                .filter(ConversationLog.user_id == user_id)
                .order_by(ConversationLog.timestamp.asc())
                .limit(limit)
            )
            logs = result.scalars().all()
            logger.debug(f"Se encontraron {len(logs)} logs de conversación RAW para el usuario '{user_id}'.")
            return logs
        except Exception as e:
            logger.error(f"Error al recuperar logs de conversación RAW para el usuario '{user_id}': {e}")
            return []

    async def update_memory(self, user_id: int, prompt: str, response: str, db: AsyncSession, speaker_identifier: Optional[str] = None):
        """Actualiza la última interacción del usuario y registra la conversación.

        Args:
            user_id (int): El ID del usuario.
            prompt (str): El prompt enviado por el usuario.
            response (str): La respuesta generada por el asistente.
            db (AsyncSession): La sesión de la base de datos.
            speaker_identifier (Optional[str]): Identificador del hablante, si está disponible.
        """
        logger.debug(f"Actualizando memoria para el usuario {user_id}. Prompt: '{prompt[:50]}...', Response: '{response[:50]}...' ")
        await self._async_update_memory_logic(user_id, prompt, response, db, speaker_identifier)

    async def _async_update_memory_logic(self, user_id: int, prompt: str, response: str, db: AsyncSession, speaker_identifier: Optional[str] = None):
        timestamp = datetime.now()

        memory_db = await self._async_get_user_memory_logic(db, user_id)

        memory_db.last_interaction = timestamp
        await db.commit()
        logger.debug(f"Última interacción actualizada para el usuario {user_id}.")

        conversation = ConversationLog(
            user_id=user_id,
            timestamp=timestamp,
            prompt=prompt,
            response=response,
            speaker_identifier=speaker_identifier
        )
        db.add(conversation)
        await db.commit()
        logger.info(f"Log de conversación guardado para el usuario {user_id}. Prompt: '{prompt[:50]}...' ")

    async def delete_conversation_history(self, db: AsyncSession, user_id: int):
        """Elimina todo el historial de conversación para un usuario específico.

        Args:
            db (AsyncSession): La sesión de la base de datos.
            user_id (int): El ID del usuario.
        """
        logger.info(f"Eliminando historial de conversación para el usuario {user_id}.")
        try:
            await db.execute(ConversationLog.__table__.delete().where(ConversationLog.user_id == user_id))
            await db.commit()
            logger.info(f"Historial de conversación eliminado exitosamente para el usuario {user_id}.")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error al eliminar el historial de conversación para el usuario {user_id}: {e}")
            raise
        