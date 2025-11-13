import logging
import re
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("ResponseProcessor")

MEMORY_SEARCH_REGEX = re.compile(r"memory_search:\s*(.+)")
PREFERENCE_MARKERS_REGEX = re.compile(r"(preference_set:|memory_search:|name_change:)")
IOT_COMMAND_REGEX = re.compile(r"(iot_command|mqtt_publish):[^\s]+")
NAME_CHANGE_REGEX = re.compile(r"name_change:\s*(.+)")

class ResponseProcessor:
    """Procesa y transforma respuestas del LLM"""
    
    def __init__(self, user_manager, iot_processor, memory_manager):
        self._user_manager = user_manager
        self._iot_processor = iot_processor
        self._memory_manager = memory_manager
    
    async def process_response(self, db: AsyncSession, user_id: int, response: str, token: str, has_negation: bool, iot_commands_db: list) -> Tuple[str, Optional[str]]:
        """Procesa la respuesta completa del LLM"""
        
        # Procesar búsqueda en memoria
        response = await self.process_memory_search(db, user_id, response)
        
        # Procesar cambio de nombre
        response = await self.process_name_change(db, response, user_id)
        
        # Procesar preferencias
        db_user = await self._get_user_from_db(db, user_id)
        
        if db_user:
            response = await self._user_manager.handle_preference_setting(db, db_user, response)
        
        # Limpiar marcadores de preferencias
        response = PREFERENCE_MARKERS_REGEX.sub("", response).strip()
        
        # Procesar comandos IoT si no hay negación
        extracted_command = None
        if not has_negation:
            response, extracted_command = await self.process_iot_command(db, response, token, user_id, iot_commands_db)
        else:
            logger.info("Comando IoT no procesado debido a negación en prompt")
            response = re.sub(IOT_COMMAND_REGEX, "", response).strip()
        
        return response, extracted_command
    
    async def _get_user_from_db(self, db: AsyncSession, user_id: int):
        from sqlalchemy import select
        from sqlalchemy.orm import joinedload
        from src.db.models import User, UserPermission
        if user_id is None:
            return None
        try:
            result = await db.execute(
                select(User)
                .options(
                    joinedload(User.permissions).joinedload(UserPermission.permission),
                    joinedload(User.preferences)
                )
                .filter(User.id == user_id)
            )
            return result.scalars().first()
        except Exception:
            return None
    
    async def process_memory_search(self, db: AsyncSession, user_id: int, response: str) -> str:
        """Procesa memory_search y retorna los resultados formateados al usuario"""
        memory_search_match = MEMORY_SEARCH_REGEX.search(response)
        
        if not memory_search_match or not user_id:
            return response
        
        query = memory_search_match.group(1).strip()
        logger.info(f"Memory search ejecutada para usuario {user_id}: '{query}'")
        
        try:
            search_results = await self._user_manager.search_memory(db, user_id, query)
            
            if search_results:
                results_formatted = "\n".join([
                    f"🔍 {log.timestamp.strftime('%Y-%m-%d %H:%M')} - Tú: \"{log.prompt[:60]}...\"\n"
                    f"   Yo: \"{log.response[:80]}...\""
                    for log in search_results
                ])
                replacement_text = f"Encontré estos registros en tu historial:\n\n{results_formatted}"
                logger.debug(f"Resultados encontrados: {len(search_results)} registros")
            else:
                replacement_text = "No encontré información sobre eso en tu historial."
                logger.debug("Memory search: sin resultados")
            
            response = response.replace(f"memory_search: {query}", replacement_text)
            response = re.sub(MEMORY_SEARCH_REGEX, replacement_text, response)
            
        except Exception as e:
            logger.error(f"Error en memory search para usuario {user_id}: {e}")
            response = re.sub(MEMORY_SEARCH_REGEX, "Error al buscar en el historial", response)
        
        return response.strip()
    
    async def process_name_change(self, db: AsyncSession, response: str, user_id: int) -> str:
        """Procesa cambios de nombre en la respuesta"""
        name_change_match = NAME_CHANGE_REGEX.search(response)
        if not name_change_match or user_id is None:
            return response
        
        new_name = name_change_match.group(1).strip()
        name_change_response = await self._user_manager.handle_name_change(db, user_id, new_name)
        
        if name_change_response:
            return name_change_response
        else:
            return re.sub(NAME_CHANGE_REGEX, "", response).strip()
    
    async def process_iot_command(self, db: AsyncSession, response: str, token: str, user_id: int, iot_commands_db: list) -> Tuple[str, Optional[str]]:
        """Procesa comandos IoT con throttling y detección de ambigüedad"""
        if not response:
            return response, None
        
        ambiguity_msg = await self._iot_processor.detect_ambiguous_commands(
            db, response, response, iot_commands_db
        )
        
        if ambiguity_msg:
            logger.info(f"Comando ambiguo detectado para usuario {user_id}")
            return ambiguity_msg, None
        
        iot_match = IOT_COMMAND_REGEX.search(response)
        extracted_command = iot_match.group(0) if iot_match else None
        
        if not extracted_command:
            return response, None
        
        clean_response = re.sub(IOT_COMMAND_REGEX, "", response).strip()
        
        iot_response = await self._iot_processor.process_iot_command(
            db, response, token, user_id=user_id
        )
        
        if iot_response:
            return iot_response, extracted_command
        
        return clean_response, extracted_command
