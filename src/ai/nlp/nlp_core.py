import asyncio
import logging
import re
from typing import Optional, Dict, Tuple, Any
from pathlib import Path
from datetime import datetime
from ollama import ResponseError
from httpx import ConnectError
from src.ai.nlp.memory_brain.memory_manager import MemoryManager
from src.ai.nlp.ollama_manager import OllamaManager
from src.ai.nlp.config_manager import ConfigManager
from src.ai.nlp.iot_command_processor import IoTCommandProcessor
from src.ai.nlp.memory_brain.user_manager import UserManager
from src.ai.nlp.prompt_creator import create_system_prompt
from src.ai.nlp.prompt_loader import load_system_prompt_template
from src.ai.nlp.memory_brain.memory_brain import MemoryBrain
from src.ai.nlp.memory_brain.routine_manager import Routine
from src.db.database import get_db
from src.iot.mqtt_client import MQTTClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.ai.nlp.device_context import DeviceContextManager, DEVICE_LOCATION_REGEX
from src.ai.nlp.prompt_processor import PromptProcessor
from src.ai.nlp.response_processor import ResponseProcessor, PREFERENCE_MARKERS_REGEX, IOT_COMMAND_REGEX
from src.ai.nlp.validation_helper import ValidationHelper
from src.ai.nlp.memory_brain.routine_scheduler import RoutineScheduler

ROUTINE_CREATION_REGEX = re.compile(r"crear rutina: (.+?); disparador: (.+?); acciones: (.+)", re.IGNORECASE)

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
        self._user_manager = UserManager()
        self._memory_manager = MemoryManager()
        self._iot_command_processor = None
        self._reload_lock = asyncio.Lock()
        self._system_prompt_data = load_system_prompt_template()
        self._system_prompt_template = self._system_prompt_data["template"]
        self._routine_creation_instructions = self._system_prompt_data["routine_creation_instructions"]
        self._location_keywords = _extract_location_keywords(DEVICE_LOCATION_REGEX)
        self._iot_command_processor = IoTCommandProcessor(self.mqtt_client, self._location_keywords)
        self._device_context_manager = DeviceContextManager(self._iot_command_processor)
        self._prompt_processor = PromptProcessor()
        self._response_processor = ResponseProcessor(self._user_manager, self._iot_command_processor, self._memory_manager)
        self._validation_helper = ValidationHelper(self._user_manager)
        self._routine_scheduler: Optional[RoutineScheduler] = None
        
        try:
            memory_dir = Path(__file__).parent.parent.parent.parent / "data" / "memory_brain"
            self._memory_brain: Optional[MemoryBrain] = MemoryBrain(memory_dir)
            logger.info("MemoryBrain inicializado en NLPModule")
            if self._memory_brain:
                self._routine_scheduler = RoutineScheduler(self._memory_brain.routine_manager, self._iot_command_processor)
                logger.info("RoutineScheduler inicializado en NLPModule")
        except Exception as e:
            logger.error(f"Error inicializando MemoryBrain: {e}")
            self._memory_brain = None
        
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
        self._iot_command_processor = IoTCommandProcessor(mqtt_client, self._location_keywords)
        self._device_context_manager = DeviceContextManager(self._iot_command_processor)
        await self._iot_command_processor.initialize(db)
        logger.info("IoT managers configurados en NLPModule.")

    def is_online(self) -> bool:
        """Devuelve True si el módulo NLP está online."""
        return self._ollama_manager.is_online()

    async def reload(self) -> None:
        """Recarga configuración y valida conexión."""
        async with self._reload_lock:
            logger.info("Recargando NLPModule...")
            self._config_manager.load_config()
            self._config = self._config_manager.get_config()
            self._ollama_manager.reload(self._config["model"])
            self._online = self._ollama_manager.is_online()
            if self._iot_command_processor:
                self._iot_command_processor.invalidate_command_cache()
            self._system_prompt_data = load_system_prompt_template()
            self._system_prompt_template = self._system_prompt_data["template"]
            self._routine_creation_instructions = self._system_prompt_data["routine_creation_instructions"]
            log_fn = logger.info if self._online else logger.warning
            log_fn("NLPModule recargado." if self._online else "NLPModule recargado pero no en línea.")

    async def _get_llm_response(self, system_prompt: str, prompt_text: str) -> Tuple[Optional[str], Optional[str]]:
        """Obtiene la respuesta del modelo de lenguaje"""
        client = self._ollama_manager.get_async_client()
        retries = self._config["model"].get("llm_retries", 2)
        llm_timeout = self._config["model"].get("llm_timeout", 60)

        for attempt in range(retries):
            try:
                response_stream = await asyncio.wait_for(client.chat(
                    model=self._config["model"]["name"],
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt_text}
                    ],
                    options={
                        "temperature": self._config["model"]["temperature"],
                        "num_predict": self._config["model"]["max_tokens"],
                        "top_p": self._config["model"].get("top_p"),
                        "top_k": self._config["model"].get("top_k"),
                        "repeat_penalty": self._config["model"].get("repeat_penalty"),
                        "num_ctx": self._config["model"].get("num_ctx"),
                    },
                    stream=True,
                ), timeout=llm_timeout)

                full_response_content = ""
                async for chunk in response_stream:
                    if "content" in chunk["message"]:
                        full_response_content += chunk["message"]["content"]

                if not full_response_content:
                    logger.warning("Respuesta vacía de Ollama. Reintentando...")
                    continue
                
                return full_response_content, None
                
            except (ResponseError, ConnectError, asyncio.TimeoutError) as e:
                error_type = "Timeout" if isinstance(e, asyncio.TimeoutError) else "Error con Ollama"
                logger.error(f"{error_type}: {e}. Reintentando...")
                if attempt == retries - 1:
                    return None, f"{error_type} después de {retries} intentos: {e}"
                continue
        
        return None, "No se pudo generar una respuesta después de varios intentos."

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
        
        has_negation = self._prompt_processor.contains_negation(prompt)
        if has_negation:
            logger.info(f"Negación detectada en prompt: '{prompt}'. No se procesarán comandos IoT.")

        async with get_db() as db:
            db_user, user_name, is_owner, user_permissions_str, user_preferences_dict = await self._validation_helper.validate_user(user_id)
            formatted_iot_commands, iot_command_names, iot_error = await self._validation_helper.load_iot_commands(self._iot_command_processor)
            
            if not db_user:
                return self._error_response("Usuario no autorizado o no encontrado.", "Usuario no autorizado o no encontrado.")

            if iot_error:
                return self._error_response(iot_error, iot_error, user_name=user_name, is_owner=is_owner)

            formatted_conversation_history = ""
            if self._prompt_processor.should_load_conversation_history(prompt):
                formatted_conversation_history = await self._memory_manager.get_conversation_logs_by_user_id(db, user_id, limit=5)
                logger.debug("Historial de conversación cargado (detectada palabra clave)")

            enhanced_prompt = self._device_context_manager.enhance_prompt(user_id, prompt)

            scheduled_routines_info = ""
            if self._routine_scheduler:
                scheduled_routines_data = self._routine_scheduler.get_scheduled_routines_info(user_id)
                if scheduled_routines_data and scheduled_routines_data["scheduled_routines"]:
                    scheduled_routines_info = "\n".join([
                        f"- {r['name']} a las {r['hour']}:00 (Acciones: {', '.join(r['actions'])})"
                        for r in scheduled_routines_data["scheduled_routines"]
                    ])
                else:
                    scheduled_routines_info = "No hay rutinas automáticas programadas para este usuario."

            system_prompt, prompt_text = create_system_prompt(
                config=self._config,
                user_name=user_name,
                is_owner=is_owner,
                user_permissions_str=user_permissions_str,
                formatted_iot_commands=formatted_iot_commands,
                iot_command_names=iot_command_names,
                search_results_str="",
                user_preferences_dict=user_preferences_dict,
                prompt=enhanced_prompt,
                conversation_history=formatted_conversation_history,
                system_prompt_template=self._system_prompt_template,
                scheduled_routines_info=scheduled_routines_info,
                routine_creation_instructions=self._routine_creation_instructions
            )

            full_response_content, llm_error = await self._get_llm_response(system_prompt, prompt_text)
            
            if llm_error:
                return self._error_response(llm_error, llm_error, user_name=user_name, is_owner=is_owner)

            # Check for routine creation command
            routine_match = ROUTINE_CREATION_REGEX.match(full_response_content)
            if routine_match:
                routine_name = routine_match.group(1).strip()
                # routine_name is intentionally unused; the routine is created via pattern/actions only
                routine_trigger = routine_match.group(2).strip()
                routine_actions_str = routine_match.group(3).strip()
                
                # Assuming actions are comma-separated for now, adjust as needed
                routine_actions = [action.strip() for action in routine_actions_str.split(',')]

                try:
                    # Parse routine_trigger to extract trigger_type and trigger details
                    trigger_parts = routine_trigger.split(' ', 1)
                    trigger_type_str = trigger_parts[0].lower()
                    trigger_value = trigger_parts[1] if len(trigger_parts) > 1 else ""

                    pattern = {}
                    if trigger_type_str == "hora":
                        pattern = {
                            "type": "time_based",
                            "hour": trigger_value # e.g., "2:30"
                        }
                    # Add more trigger types here as needed
                    else:
                        raise ValueError(f"Tipo de disparador desconocido: {trigger_type_str}")

                    new_routine = self._memory_brain.routine_manager.create_routine_from_pattern(
                        user_id=user_id,
                        pattern=pattern,
                        actions=routine_actions,
                        confirmed=True
                    )
                    response_text = f"He creado la rutina '{new_routine.name}' con el disparador '{routine_trigger}' y las acciones: {', '.join(routine_actions)}."
                    return self._success_response(response_text, response_text, user_name=user_name, is_owner=is_owner)
                except Exception as e:
                    logger.error(f"Error al crear la rutina: {e}")
                    return self._error_response(f"No pude crear la rutina. Error: {e}", "Error al crear la rutina.", user_name=user_name, is_owner=is_owner)
            
            full_response_content = await self._response_processor.process_memory_search(db, user_id, full_response_content)
            full_response_content = await self._response_processor.process_name_change(db, full_response_content, user_id)
            full_response_content = await self._user_manager.handle_preference_setting(db, db_user, full_response_content)
            full_response_content = PREFERENCE_MARKERS_REGEX.sub("", full_response_content).strip()
            
            response_for_memory = full_response_content
            _, iot_commands_db = await self._iot_command_processor.load_commands_from_db(db)
            
            if self._memory_brain and user_id and not has_negation:
                await self._execute_automatic_routines(db, user_id, token)
            
            extracted_command = None
            if not has_negation:
                full_response_content, extracted_command = await self._response_processor.process_iot_command(
                    db, full_response_content, token, user_id, iot_commands_db
                )
                self._device_context_manager.update(user_id, prompt, extracted_command)
            else:
                logger.info("Comando IoT no procesado debido a negación en prompt")
                full_response_content = re.sub(IOT_COMMAND_REGEX, "", full_response_content).strip()
            
            if self._memory_brain and user_id and db_user:
                await self._track_in_memory_brain(db, user_id, user_name, prompt, full_response_content, extracted_command)
            
            if user_id != 0:
                try:
                    await self._user_manager.update_memory(db, user_id, prompt, response_for_memory)
                except Exception as e:
                    logger.error(f"Error al actualizar memoria: {e}")
                    return self._error_response(f"Error interno al actualizar la memoria: {e}", str(e), user_name=user_name, is_owner=is_owner)

            return {
                "identified_speaker": user_name or "Desconocido",
                "response": full_response_content,
                "command": extracted_command,
                "user_name": user_name,
                "preference_key": None,
                "preference_value": None,
                "is_owner": is_owner
            }

    async def _execute_automatic_routines(self, db: AsyncSession, user_id: int, token: str):
        """Verifica y ejecuta rutinas automáticas de Memory Brain"""
        try:
            current_context = {
                "hour": datetime.now().hour,
                "day": datetime.now().weekday(),
                "timestamp": datetime.now().isoformat()
            }
            
            automatic_actions = self._memory_brain.routine_manager.check_routine_triggers(
                user_id, current_context
            )
            
            if automatic_actions:
                logger.info(f"Rutinas automáticas detectadas para usuario {user_id}: {len(automatic_actions)}")
                for action in automatic_actions:
                    try:
                        await self._iot_command_processor.process_iot_command(
                            db, action, token, user_id=user_id
                        )
                    except Exception as e:
                        logger.error(f"Error ejecutando rutina automática: {e}")
        except Exception as e:
            logger.warning(f"Error verificando rutinas automáticas: {e}")

    async def _track_in_memory_brain(
        self, db: AsyncSession, user_id: int, user_name: str, prompt: str, response: str, extracted_command: Optional[str]
    ):
        """Registra interacción en Memory Brain"""
        try:
            device_type = None
            location = None

            if extracted_command:
                device_type, location, _ = self._iot_command_processor._extract_device_info_from_prompt(
                    prompt, response
                )

            intent = self._prompt_processor.extract_intent(prompt)

            self._memory_brain.track_interaction(
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

            event_count = len(self._memory_brain.context_tracker.get_user_events(user_id))
            if event_count > 0 and event_count % 10 == 0:
                suggested_routines = self._memory_brain.suggest_routines(
                    user_id, min_confidence=0.6
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

        return self._memory_brain.get_routine_status(user_id)

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
        log_fn = logger.info if self._online else logger.warning
        log_fn("Configuración NLP actualizada y módulos recargados." if self._online else "Configuración NLP actualizada pero Ollama no está en línea.")

    async def get_conversation_history(self, db: AsyncSession, user_id: int, limit: int = 100):
        """Recupera el historial de conversación para un usuario específico."""
        return await self._memory_manager.get_raw_conversation_logs_by_user_id(db, user_id, limit)
        