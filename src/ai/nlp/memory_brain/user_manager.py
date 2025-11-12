import logging
import re
from typing import Optional
from src.db.models import User, Preference, ConversationLog, UserPermission
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger("UserManager")

class UserManager:
    """
    Gestiona la lógica relacionada con usuarios, permisos y preferencias.
    """
    def __init__(self):
        pass

    def _parse_preferences(self, preferences_str: str) -> dict:
        preferences = {}
        if preferences_str:
            for item in preferences_str.split(", "):
                try:
                    if ": " in item:
                        key, value = item.split(": ", 1)
                        preferences[key.strip()] = value.strip()
                    else:
                        logger.warning(f"Formato de preferencia inválido encontrado: '{item}'. Se ignorará.")
                except ValueError as e:
                    logger.warning(f"Error al parsear el elemento de preferencia '{item}': {e}. Se ignorará.")
        return preferences

    async def _get_user_data_common(self, db: AsyncSession, db_user: Optional[User], identifier: str) -> tuple[Optional[User], str, dict]:
        """
        Método común para procesar los datos del usuario una vez obtenido de la base de datos.
        """
        user_permissions_str = ""
        user_preferences_str = ""
        user_preferences_dict = {}

        if db_user:
            permissions = [up.permission.name for up in db_user.permissions]
            user_permissions_str = ", ".join(permissions)
            logger.debug(f"Permisos para el usuario {identifier}: {user_permissions_str}")

            if db_user.preferences:
                pref_items = []
                for p in db_user.preferences:
                    pref_items.append(f"{p.key}: {p.value}")
                user_preferences_str = ", ".join(pref_items)
                user_preferences_dict = self._parse_preferences(user_preferences_str)
            else:
                user_preferences_str = "No hay preferencias de usuario registradas"
                user_preferences_dict = {}
            
            logger.debug(f"Preferencias para el usuario {identifier}: {user_preferences_str}")
            
        logger.debug(f"Finalizada la recuperación de datos de usuario para {identifier}")
        return db_user, user_permissions_str, user_preferences_dict

    async def _get_user_from_db(self, db: AsyncSession, filter_condition, identifier_value, identifier_type: str) -> Optional[User]:
        """
        Método común para obtener un usuario de la base de datos con un filtro específico.
        
        Args:
            db (AsyncSession): Sesión de base de datos
            filter_condition: Condición de filtro para la consulta
            identifier_value: Valor del identificador (nombre o ID)
            identifier_type: Tipo de identificador ('nombre' o 'ID')
            
        Returns:
            Optional[User]: Usuario encontrado o None
        """
        try:
            from sqlalchemy.orm import joinedload
            result = await db.execute(
                select(User)
                .options(
                    joinedload(User.permissions).joinedload(UserPermission.permission),
                    joinedload(User.preferences)
                )
                .filter(filter_condition)
            )
            db_user = result.scalars().first()
            if db_user:
                logger.info(f"Usuario {identifier_type} '{identifier_value}' encontrado en la base de datos.")
            else:
                logger.info(f"Usuario {identifier_type} '{identifier_value}' no encontrado en la base de datos.")
            return db_user
        except Exception as e:
            logger.error(f"Error al buscar usuario {identifier_type} '{identifier_value}' en la base de datos: {e}")
            return None

    async def get_user_data(self, db: AsyncSession, user_name: Optional[str]) -> tuple[Optional[User], str, dict]:
        """
        Recupera los datos del usuario, sus permisos y preferencias por nombre.
        """
        logger.debug(f"Intentando recuperar datos de usuario para user_name: {user_name}")
        db_user = None

        if user_name:
            db_user = await self._get_user_from_db(db, User.nombre == user_name, user_name, "con nombre")

        return await self._get_user_data_common(db, db_user, f"'{user_name}'")

    async def get_user_data_by_id(self, db: AsyncSession, user_id: int) -> tuple[Optional[User], str, dict]:
        """
        Recupera los datos del usuario, sus permisos y preferencias por ID.
        """
        logger.debug(f"Intentando recuperar datos de usuario para user_id: {user_id}")
        db_user = None

        if user_id:
            db_user = await self._get_user_from_db(db, User.id == user_id, user_id, "con ID")

        return await self._get_user_data_common(db, db_user, f"con ID '{user_id}'")

    async def search_memory(self, db: AsyncSession, user_id: int, query: str) -> list[ConversationLog]:
        """
        Busca en la memoria del usuario por la consulta dada.
        """
        logger.debug(f"Buscando en la memoria del usuario {user_id} con la consulta: {query}")
        
        from src.ai.nlp.memory_brain.memory_manager import MemoryManager
        memory_manager = MemoryManager()
        return await memory_manager.search_conversation_logs(db, user_id, query, limit=5)

    async def get_recent_conversation(self, db: AsyncSession, user_id: int, limit: int = 5) -> list[ConversationLog]:
        """
        Obtiene las conversaciones más recientes del usuario.
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            limit: Número de conversaciones a recuperar
            
        Returns:
            Lista de conversaciones recientes
        """
        logger.debug(f"Obteniendo últimas {limit} conversaciones para el usuario {user_id}")
        try:
            result = await db.execute(
                select(ConversationLog)
                .filter(ConversationLog.user_id == user_id)
                .order_by(ConversationLog.timestamp.desc())
                .limit(limit)
            )
            logs = result.scalars().all()
            return list(reversed(logs))
        except Exception as e:
            logger.error(f"Error al obtener conversaciones recientes para el usuario {user_id}: {e}")
            return []

    async def update_memory(self, db: AsyncSession, user_id: int, prompt: str, response: str):
        """
        Actualiza la memoria conversacional del usuario.
        """
        logger.debug(f"Actualizando la memoria del usuario {user_id} con prompt y respuesta.")
        try:
            conversation = ConversationLog(
                user_id=user_id,
                prompt=prompt,
                response= response
            )
            db.add(conversation)
            await db.commit()
            
            logger.info(f"Memoria conversacional actualizada para el usuario {user_id}.")
        except Exception as e:
            logger.error(f"Error al actualizar la memoria conversacional para el usuario {user_id}: {e}")
            await db.rollback()

    async def handle_preference_setting(self, db: AsyncSession, db_user: User, full_response_content: str) -> str:
        logger.debug(f"Intentando manejar la configuración de preferencias para el usuario: {db_user.nombre if db_user else 'None'}")
        
        matches = list(
            re.finditer(r"preference_set:\s*([^|]+)\s*\|\s*([^;]+)(;|$)", full_response_content)
        )
        
        if not matches:
            matches = list(
                re.finditer(r"preference_set:\s*([^,]+),\s*([^;]+)(;|$)", full_response_content)
            )
        
        for match in matches:
            if db_user:
                pref_key = match.group(1).strip()
                pref_value = match.group(2).strip()
                
                if not pref_key or not pref_value:
                    logger.warning(f"Preferencia inválida detectada: clave='{pref_key}', valor='{pref_value}'. Se requieren ambos valores.")
                    continue
                
                if len(pref_key) > 100:
                    pref_key = pref_key[:100]
                    logger.warning(f"Clave de preferencia truncada a 100 caracteres: '{pref_key}'")
                
                logger.info(f"Preferencia detectada para establecer: clave='{pref_key}', valor='{pref_value}' para el usuario '{db_user.nombre}'.")
                try:
                    result = await db.execute(
                        select(Preference)
                        .filter(
                            Preference.user_id == db_user.id,
                            Preference.key == pref_key,
                        )
                    )
                    existing = result.scalars().first()
                    if existing:
                        existing.value = pref_value
                        logger.info(
                            f"Preferencia '{pref_key}' actualizada para '{db_user.nombre}': {pref_value}"
                        )
                    else:
                        db.add(
                            Preference(
                                user_id=db_user.id,
                                key=pref_key,
                                value=pref_value,
                            )
                        )
                        logger.info(
                            f"Nueva preferencia '{pref_key}' guardada para '{db_user.nombre}': {pref_value}"
                        )
                    await db.commit()
                    logger.debug(f"Preferencia '{pref_key}' confirmada en la base de datos para el usuario '{db_user.nombre}'.")
                except Exception as e:
                    logger.error(f"Error al guardar preferencia '{pref_key}' para '{db_user.nombre}': {e}")
                    await db.rollback()

        cleaned_response = re.sub(
            r"preference_set:\s*([^|]+)\s*\|\s*([^;]+)(;|$)", "", full_response_content
        )
        cleaned_response = re.sub(
            r"preference_set:\s*([^,]+),\s*([^;]+)(;|$)", "", cleaned_response
        )
        
        return cleaned_response.strip()

    async def handle_name_change(self, db: AsyncSession, user_id: int, new_name: str) -> Optional[str]:
        logger.debug(f"Intentando manejar el cambio de nombre para el usuario ID '{user_id}' a '{new_name}'.")
        try:
            result = await db.execute(
                select(User).filter(User.id == user_id)
            )
            existing_user = result.scalars().first()
            if existing_user:
                logger.info(f"Cambiando nombre de '{existing_user.nombre}' a '{new_name}'.")
                existing_user.nombre = new_name
                await db.commit()
                logger.info(f"Nombre de usuario cambiado a '{new_name}' y confirmado en la base de datos.")
                return f"De acuerdo, a partir de ahora te llamaré {new_name}."
            else:
                logger.warning(
                    f"Usuario con ID '{user_id}' no encontrado para cambio de nombre."
                )
                return None
        except Exception as e:
            logger.error(f"Error al cambiar el nombre: {e}")
            await db.rollback()
            return None
            