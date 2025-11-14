import logging
import re
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.db.models import MusicPlayLog, User

logger = logging.getLogger("ResponseProcessor")

MEMORY_SEARCH_REGEX = re.compile(r"memory_search:\s*(.+)")
PREFERENCE_MARKERS_REGEX = re.compile(r"(preference_set:|memory_search:|name_change:)")
IOT_COMMAND_REGEX = re.compile(r"(iot_command|mqtt_publish):[^\s]+")
NAME_CHANGE_REGEX = re.compile(r"name_change:\s*(.+)")
ROUTINE_EXECUTION_REGEX = re.compile(r"(ejecutar|activar|correr)\s+(?:la\s+)?(?:rutina\s+)?(?:de\s+)?(.+)", re.IGNORECASE)
ROUTINE_LIST_REGEX = re.compile(r"(?:ver|mostrar|listar)\s+(?:mis\s+)?(?:rutinas|programaciones)|routine_list:\s*show", re.IGNORECASE)

class ResponseProcessor:
    """Procesa y transforma respuestas del LLM"""
    
    def __init__(self, user_manager, iot_processor, memory_manager, routine_handler=None, music_handler=None):
        self._user_manager = user_manager
        self._iot_processor = iot_processor
        self._memory_manager = memory_manager
        self._routine_handler = routine_handler
        self._music_handler = music_handler
    
    async def process_response(self, db: AsyncSession, user_id: int, response: str, token: str, has_negation: bool, iot_commands_db: list, original_prompt: str) -> Tuple[str, Optional[str]]:
        """Procesa la respuesta completa del LLM"""
        
        # Procesar comandos de música primero si no hay negación
        if self._music_handler and not has_negation and response:
            try:
                response, music_command = await self._music_handler.process_music_commands(response)
                if music_command:
                    logger.info(f"Comando de música ejecutado: {music_command}")
                    try:
                        parts = music_command.split(":", 2)
                        action = parts[1] if len(parts) > 1 else None
                        params = parts[2] if len(parts) > 2 else None
                        if action == "play":
                            current = self._music_handler.music_manager.get_current_track()
                            info = self._music_handler.music_manager.get_info()
                            backend = None
                            if isinstance(info.get("backend"), dict):
                                backend = info["backend"].get("backend")
                            result = await db.execute(select(User).filter(User.id == user_id))
                            db_user = result.scalars().first()
                            entry = MusicPlayLog(
                                user_id=user_id,
                                user_name=db_user.nombre if db_user else None,
                                title=current.get("title") if current else None,
                                uploader=current.get("uploader") if current else None,
                                duration=current.get("duration") if current else None,
                                thumbnail=current.get("thumbnail") if current else None,
                                backend=backend,
                                query=params,
                                track_url=current.get("url") if current else None,
                            )
                            db.add(entry)
                            await db.commit()
                            logger.info("Reproducción de música registrada en DB desde NLP")
                    except Exception as e:
                        logger.error(f"Error registrando reproducción de música en DB: {e}")
            except Exception as e:
                logger.error(f"Error procesando comandos de música: {e}")
        
        # Primero detectar si el usuario está pidiendo ejecutar una rutina específica
        routine_result = await self.process_routine_requests(db, user_id, response, token)
        if routine_result:
            return routine_result, None
        
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
            response, extracted_command = await self.process_iot_command(db, response, token, user_id, iot_commands_db, original_prompt)
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
    
    async def process_routine_requests(self, db: AsyncSession, user_id: int, response: str, token: str) -> Optional[str]:
        """Procesa solicitudes de ejecución de rutinas y listado de rutinas"""
        if not self._routine_handler or not user_id:
            return None
        
        # Detectar solicitud de ejecutar rutina específica
        routine_exec_match = ROUTINE_EXECUTION_REGEX.search(response)
        if routine_exec_match:
            routine_name = routine_exec_match.group(2).strip()
            logger.info(f"Solicitud de ejecución de rutina detectada: '{routine_name}'")
            result = await self._routine_handler.handle_routine_by_name(user_id, routine_name, token)
            return result.get("response")
        
        # Detectar solicitud de listar rutinas
        routine_list_match = ROUTINE_LIST_REGEX.search(response)
        if routine_list_match:
            logger.info("Solicitud de listado de rutinas detectada")
            result = await self._routine_handler.get_user_routines_list(user_id)
            return result.get("response")
        
        return None
    
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
    
    async def process_iot_command(self, db: AsyncSession, response: str, token: str, user_id: int, iot_commands_db: list, original_prompt: str) -> Tuple[str, Optional[str]]:
        """Procesa comandos IoT con throttling y detección de ambigüedad"""
        if not response:
            return response, None
        
        ambiguity_msg = await self._iot_processor.detect_ambiguous_commands(
            db, original_prompt, response, iot_commands_db
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
