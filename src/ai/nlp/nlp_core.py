import asyncio
import logging
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from src.ai.nlp.memory_brain.memory_manager import MemoryManager
from src.ai.nlp.ollama_manager import OllamaManager
from src.ai.nlp.config_manager import ConfigManager
from src.ai.nlp.iot_command_processor import IoTCommandProcessor
from src.ai.nlp.memory_brain.user_manager import UserManager
from src.ai.nlp.prompt_loader import load_system_prompt_template
from src.ai.nlp.memory_brain.memory_brain import MemoryBrain
from src.db.database import get_db
from src.iot.mqtt_client import MQTTClient
from src.ai.nlp.device_context import DeviceContextManager, DEVICE_LOCATION_REGEX
from src.ai.nlp.memory_brain.routine_scheduler import RoutineScheduler
from src.ai.nlp.handlers import ResponseHandler, RoutineHandler, ContextHandler, ResponseProcessor
from src.music_manager.music_command_handler import MusicCommandHandler
from src.api import utils

logger = logging.getLogger("NLPModule")

def _find_project_root(current_path: Path) -> Path:
    """Busca la raíz del proyecto"""
    for parent in current_path.parents:
        if (parent / "main.py").exists() or (parent / "requirements.txt").exists():
            return parent
    return current_path

def _extract_location_keywords(regex_pattern: re.Pattern) -> list[str]:
    """Extrae las palabras clave de ubicación de un patrón regex."""
    match = re.search(r"\((.*?)\)", regex_pattern.pattern)
    if match:
        keywords_str = match.group(1)
        keywords = [kw.strip().lower() for kw in keywords_str.split('|')]
        return sorted(list(set(keywords)))
    return []

class NLPModule:
    """Clase principal para el procesamiento NLP con integración a Ollama, IoT y Memory Brain."""

    def __init__(self, ollama_manager: OllamaManager, config: Dict[str, Any]) -> None:
        """Inicializa configuración, OllamaManager, UserManager y Memory Brain."""
        project_root = _find_project_root(Path(__file__))
        self._config_path = project_root / "ai" / "config" / "config.json"
        self._config_manager = ConfigManager(self._config_path)
        self._config = config
        self._ollama_manager = ollama_manager
        self._online = self._ollama_manager.is_online()
        self._is_closing = False
        self.mqtt_client = None
        
        # Inicializar componentes base
        self._user_manager = UserManager()
        self._memory_manager = MemoryManager()
        self._iot_command_processor = None
        self._reload_lock = asyncio.Lock()
        
        # Inicializar handlers
        self._response_handler = ResponseHandler(ollama_manager, config)
        self._context_handler = None  # Se inicializará después
        self._routine_handler = None  # Se inicializará después
        self._response_processor = None  # Se inicializará después
        
        # Configuración del sistema
        self._system_prompt_data = load_system_prompt_template()
        self._system_prompt_template = self._system_prompt_data["template"]
        self._routine_creation_instructions = self._system_prompt_data["routine_creation_instructions"]
        self._location_keywords = _extract_location_keywords(DEVICE_LOCATION_REGEX)
        
        # Inicializar MemoryBrain
        try:
            self._memory_brain: Optional[MemoryBrain] = MemoryBrain()
            self._memory_brain: Optional[MemoryBrain] = MemoryBrain()
            logger.info("MemoryBrain inicializado en NLPModule")
            
            # Inicializar handlers que dependen de MemoryBrain
            self._routine_scheduler: Optional[RoutineScheduler] = None
            if self._memory_brain:
                self._routine_scheduler = RoutineScheduler(self._memory_brain.routine_manager)
                logger.info("RoutineScheduler inicializado en NLPModule")
                
                # Ahora sí inicializar los handlers restantes
                self._context_handler = ContextHandler(
                    config, None, self._memory_manager, self._user_manager, self._memory_brain
                )
                self._routine_handler = RoutineHandler(self._memory_brain, None, utils._tts_module)
                
        except Exception as e:
            logger.error(f"Error inicializando MemoryBrain: {e}")
            self._memory_brain = None
            self._context_handler = ContextHandler(
                config, None, self._memory_manager, self._user_manager, None
            )
            self._routine_handler = RoutineHandler(None, None, utils._tts_module)
        
        logger.info("NLPModule inicializado.")

    async def close(self) -> None:
        """Cierra explícitamente los recursos del NLPModule."""
        logger.info("Cerrando NLPModule.")
        if self._ollama_manager:
            self._ollama_manager.close()
        self._is_closing = True
        if self._routine_scheduler:
            await self._routine_scheduler.stop()

    async def start(self) -> None:
        """Inicia el RoutineScheduler."""
        if self._routine_scheduler:
            await self._routine_scheduler.start()
            logger.info("RoutineScheduler iniciado desde NLPModule.")

    async def set_iot_managers(self, mqtt_client: MQTTClient, db: AsyncSession) -> None:
        """Configura el cliente MQTT y el procesador IoT."""
        if self.mqtt_client:
            await self.mqtt_client.disconnect()
        self.mqtt_client = mqtt_client
        
        # Actualizar el command processor
        self._iot_command_processor = IoTCommandProcessor(mqtt_client, self._location_keywords)
        self._context_handler._iot_command_processor = self._iot_command_processor
        self._routine_handler._iot_command_processor = self._iot_command_processor
        
        # Actualizar device context manager
        device_context_manager = DeviceContextManager(self._iot_command_processor)
        self._context_handler._device_context_manager = device_context_manager
        
        # Inicializar MusicManager y handler
        try:
            music_manager = utils._music_manager
            if music_manager:
                music_handler = MusicCommandHandler(music_manager)
                logger.info("MusicCommandHandler conectado al MusicManager centralizado")
            else:
                music_handler = None
                logger.warning("MusicManager no disponible desde utils; funciones de música deshabilitadas")
        except Exception as e:
            music_handler = None
            logger.warning(f"No se pudo conectar MusicCommandHandler al MusicManager: {e}")

        # Actualizar response processor con soporte de música
        self._response_processor = ResponseProcessor(
            self._user_manager, self._iot_command_processor, self._memory_manager, self._routine_handler, music_handler
        )
        
        await self._iot_command_processor.initialize(db)
        logger.info("IoT managers configurados en NLPModule.")

    def is_online(self) -> bool:
        """Devuelve True si el módulo NLP está online."""
        return self._response_handler.is_online()

    async def get_conversation_history(self, db: AsyncSession, user_id: int, limit: int = 10) -> list:
        """Obtiene el historial de conversación para un usuario."""
        return await self._memory_manager.search_conversation_logs(db, user_id, query="", limit=limit)

    async def reload(self) -> None:
        """Recarga configuración y valida conexión."""
        async with self._reload_lock:
            logger.info("Recargando NLPModule...")
            self._config_manager.load_config()
            self._config = self._config_manager.get_config()
            self._ollama_manager.reload(self._config["model"])
            self._online = self._response_handler.is_online()
            
            if self._iot_command_processor:
                self._iot_command_processor.invalidate_command_cache()
            
            self._system_prompt_data = load_system_prompt_template()
            self._system_prompt_template = self._system_prompt_data["template"]
            self._routine_creation_instructions = self._system_prompt_data["routine_creation_instructions"]
            
            # Actualizar handlers con nueva configuración
            self._response_handler = ResponseHandler(self._ollama_manager, self._config)
            self._context_handler._config = self._config
            
            log_fn = logger.info if self._online else logger.warning
            log_fn("NLPModule recargado." if self._online else "NLPModule recargado pero no en línea.")

    async def generate_response(self, prompt: str, user_id: int, token: str) -> Optional[dict]:
        """Genera una respuesta usando Ollama, gestionando memoria, permisos, comandos IoT y Memory Brain."""
        logger.info(f"Generando respuesta para el prompt: '{prompt[:100]}...' (Usuario ID: {user_id})")

        if self._is_closing:
            logger.warning("NLPModule se está cerrando, no se puede generar respuesta.")
            return self._error_response("El módulo NLP se está cerrando.", "Módulo NLP cerrándose")

        if not prompt or not prompt.strip():
            return self._error_response("El prompt no puede estar vacío.", "Prompt vacío")

        if not self.is_online():
            try:
                await self.reload()
                if not self.is_online():
                    return self._error_response("El módulo NLP está fuera de línea.", "Módulo NLP fuera de línea")
            except Exception as e:
                return self._error_response(f"El módulo NLP está fuera de línea: {e}", "Módulo NLP fuera de línea")

        if user_id is None:
            return self._error_response("user_id es requerido para consultas NLP.", "user_id es requerido")
        
        # Validar usuario y cargar datos
        async with get_db() as db:
            db_user, user_name, is_owner, user_permissions_str, user_preferences_dict = await self._validate_user(db, user_id)
            
            if not db_user:
                return self._error_response("Usuario no autorizado o no encontrado.", "Usuario no autorizado o no encontrado.")
            
            # Preparar contexto
            context_result = await self._context_handler.prepare_context(
                user_id, prompt, db_user, user_name, is_owner, user_permissions_str, user_preferences_dict
            )
            
            if "error" in context_result:
                return self._error_response(context_result["error"], context_result["error"], 
                                          user_name=user_name, is_owner=is_owner)
            
            # Generar respuesta del LLM
            full_response_content, llm_error = await self._response_handler.generate_llm_response(
                context_result["system_prompt"], context_result["prompt_text"]
            )
            
            if llm_error:
                return self._error_response(llm_error, llm_error, user_name=user_name, is_owner=is_owner)
            
            # Procesar rutinas
            routine_result = await self._routine_handler.handle_routine_creation(
                full_response_content, user_id, user_name, is_owner
            )
            
            if routine_result:
                return self._success_response(
                    routine_result["response"],
                    routine_result.get("command"),
                    user_name=user_name,
                    is_owner=is_owner
                )
            
            # Procesar respuesta
            _, iot_commands_db = await self._iot_command_processor.load_commands_from_db(db)
            
            if self._memory_brain and user_id and not context_result["has_negation"]:
                await self._routine_handler.execute_automatic_routines(user_id, token)
            
            processed_response, extracted_command = await self._response_processor.process_response(
                db, user_id, full_response_content, token, context_result["has_negation"], iot_commands_db, prompt
            )
            
            # Actualizar contexto de dispositivo
            self._context_handler.update_device_context(user_id, prompt, extracted_command)
            
            # Registrar en Memory Brain
            if self._memory_brain and user_id and db_user:
                await self._track_in_memory_brain(db, user_id, user_name, prompt, processed_response, extracted_command)
            
            # Actualizar memoria conversacional
            if user_id != 0:
                try:
                    await self._user_manager.update_memory(db, user_id, prompt, processed_response)
                except Exception as e:
                    logger.error(f"Error al actualizar memoria: {e}")
                    return self._error_response(f"Error interno al actualizar la memoria: {e}", str(e), user_name=user_name, is_owner=is_owner)

            return {
                "identified_speaker": user_name or "Desconocido",
                "response": processed_response,
                "command": extracted_command,
                "user_name": user_name,
                "preference_key": None,
                "preference_value": None,
                "is_owner": is_owner
            }

    async def _validate_user(self, db: AsyncSession, user_id: int):
        """Helper para validar usuario"""
        if user_id is None:
            return None, None, None, None, None

        db_user, user_permissions_str, user_preferences_dict = await self._user_manager.get_user_data_by_id(db, user_id)
        if not db_user:
            return None, None, None, None, None
            
        return db_user, db_user.nombre, db_user.is_owner, user_permissions_str, user_preferences_dict

    async def _track_in_memory_brain(self, db: AsyncSession, user_id: int, user_name: str, prompt: str, response: str, extracted_command: Optional[str]):
        """Registra interacción en Memory Brain"""
        try:
            device_type = None
            location = None

            if extracted_command:
                device_type, location, _ = self._iot_command_processor._extract_device_info_from_prompt(
                    prompt, response
                )

            intent = self._context_handler.extract_intent(prompt)

            await self._memory_brain.track_interaction(
                db=db,
                user_id=user_id,
                user_name=user_name,
                intent=intent,
                action=extracted_command or "",
                context={
                    "hour": datetime.now().hour,
                    "day": datetime.now().weekday(),
                    "timestamp": datetime.now().isoformat()
                },
                device_type=device_type,
                location=location
            )

            event_count = len(await self._memory_brain.context_tracker.get_user_events(db, user_id))
            if event_count > 0 and event_count % 10 == 0:
                suggested_routines = await self._memory_brain.suggest_routines(
                    db, user_id, min_confidence=0.6
                )
                if suggested_routines:
                    routine_suggestions = await self._format_routine_suggestions(suggested_routines)
                    logger.info(f"Sugerencias de rutina generadas para usuario {user_id}: {routine_suggestions}")

        except Exception as e:
            logger.error(f"Error registrando en Memory Brain: {e}")

    @staticmethod
    def _error_response(
        response: str,
        error: str,
        user_name: Optional[str] = None,
        is_owner: bool = False
    ) -> dict:
        """Crea una respuesta de error estandarizada"""
        return {
            "response": response,
            "error": error,
            "user_name": user_name,
            "preference_key": None,
            "preference_value": None,
            "is_owner": is_owner
        }

    @staticmethod
    def _success_response(
        response: str,
        command: Optional[str] = None,
        user_name: Optional[str] = None,
        is_owner: bool = False
    ) -> dict:
        """Crea una respuesta exitosa estandarizada"""
        return {
            "identified_speaker": user_name or "Desconocido",
            "response": response,
            "command": command,
            "user_name": user_name,
            "preference_key": None,
            "preference_value": None,
            "is_owner": is_owner
        }

    async def _format_routine_suggestions(self, routines: list) -> str:
        """Formatea sugerencias de rutinas para presentar al usuario"""
        if not routines:
            return ""

        suggestions = "🤖 **He detectado patrones en tu comportamiento:**\n"
        for i, routine in enumerate(routines, 1):
            suggestions += f"\n{i}. {routine.name}"
            suggestions += f"\n   Confianza: {int(routine.confidence * 100)}%"
            suggestions += "\n   Puedes decir 'confirmar rutina' para activarla\n"

        suggestions += "\nPuedes responder 'confirmar' o 'rechazar' para cada una."
        return suggestions

    async def get_memory_brain_status(self, user_id: int) -> Dict[str, Any]:
        """Obtiene estado de Memory Brain para un usuario"""
        if not self._memory_brain:
            return {"status": "Memory Brain no inicializado"}

        async with get_db() as db:
            return await self._memory_brain.get_routine_status(db, user_id)

    async def update_assistant_name(self, new_name: str):
        """Actualiza el nombre del asistente."""
        self._config_manager.update_config({"assistant_name": new_name})
        await self.reload()
        logger.info(f"Nombre del asistente actualizado a '{new_name}'.")

    async def update_capabilities(self, new_capabilities: list[str]):
        """Actualiza las capacidades del asistente."""
        self._config_manager.update_config({"capabilities": new_capabilities})
        await self.reload()
        logger.info(f"Capacidades actualizadas: {new_capabilities}")

    async def delete_conversation_history(self, db: AsyncSession, user_id: int):
        """Elimina el historial de conversación para un usuario específico."""
        await self._memory_manager.delete_conversation_history(db, user_id)

    async def update_nlp_config(self, new_config: dict):
        """Actualiza la configuración completa del NLP y recarga los módulos necesarios."""
        logger.info(f"Actualizando configuración NLP con: {new_config}")
        self._config_manager.update_config(new_config)
        await self.reload()
        log_fn = logger.info if self._online else logger
        log_fn("NLP configuración actualizada y módulos recargados.")
