import asyncio
from typing import Optional, Any
from datetime import datetime
from pathlib import Path
import ollama
import logging

logger = logging.getLogger("NLPModule")
import re

from src.ai.nlp.system_prompt import SYSTEM_PROMPT_TEMPLATE
from src.ai.nlp.ollama_manager import OllamaManager
from src.ai.nlp.memory_manager import MemoryManager
from src.ai.nlp.config_manager import ConfigManager
from src.ai.nlp.iot_command_processor import IoTCommandProcessor
from src.ai.nlp.user_manager import UserManager
from src.db.models import UserMemory, User, Permission, IoTCommand, Preference
import src.db.models as models
from src.utils.datetime_utils import get_current_datetime, format_datetime, format_date_human_readable, format_time_only, get_country_from_timezone


class NLPModule:
    """Clase principal para el procesamiento NLP con integración a Ollama y control IoT."""

    def __init__(self) -> None:
        """Inicializa configuración, OllamaManager y MemoryManager."""
        self._config_path = Path(__file__).parent.parent / "config" / "config.json"
        self._config_manager = ConfigManager(self._config_path)
        self._config = self._config_manager.get_config()
        self._ollama_manager = OllamaManager(self._config["model"])
        self._online = self._ollama_manager.is_online()
        self.serial_manager = None
        self.mqtt_client = None
        self._memory_manager = MemoryManager()
        self._user_manager = UserManager()
        self._iot_command_processor = None
        logger.info("NLPModule inicializado.")

    def __del__(self) -> None:
        """Libera el OllamaManager al destruir la instancia."""
        logger.info("Cerrando NLPModule.")
        del self._ollama_manager

    def _safe_format_value(self, value: Any) -> str:
        """Convierte valores a strings seguros para formateo del system prompt."""
        if value is None:
            return "No disponible"
        if isinstance(value, dict):
            # Convertir dict a string con formato clave: valor
            return ", ".join([f"{k}: {self._safe_format_value(v)}" for k, v in value.items()])
        if isinstance(value, (list, tuple)):
            return ", ".join([self._safe_format_value(item) for item in value])
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, bool):
            return str(value).lower() # Use 'true' or 'false' for boolean values
        return str(value).replace('"', "'")  # Por seguridad, reemplazar todas las comillas dobles

    def set_iot_managers(self, serial_manager: Any, mqtt_client: Any) -> None:
        """Establece los gestores de comunicación IoT (serial y MQTT)."""
        self.serial_manager = serial_manager
        self.mqtt_client = mqtt_client
        self._iot_command_processor = IoTCommandProcessor(serial_manager, mqtt_client)
        logger.info("IoT managers configurados en NLPModule.")

    def is_online(self) -> bool:
        """Devuelve True si el módulo NLP está online."""
        return self._ollama_manager.is_online()

    def reload(self) -> None:
        """Recarga configuración y valida conexión."""
        logger.info("Recargando NLPModule...")
        self._config_manager.load_config()
        self._config = self._config_manager.get_config()
        self._ollama_manager.reload(self._config["model"])
        self._online = self._ollama_manager.is_online()
        if self._online:
            logger.info("NLPModule recargado y en línea.")
        else:
            logger.warning("NLPModule recargado pero no está en línea.")

    async def generate_response(
        self, prompt: str, user_name: Optional[str] = None, is_owner: bool = False
    ) -> Optional[dict]:
        """Genera una respuesta usando Ollama y gestiona memoria, permisos, preferencias y comandos IoT."""
        logger.info(f"Generando respuesta para el prompt: '{prompt[:100]}...' (Usuario: {user_name}, Propietario: {is_owner})")
        if not prompt or not prompt.strip():
            logger.warning("El prompt no puede estar vacío.")
            return None

        if not self.is_online():
            logger.error("El módulo NLP no está en línea.")
            return None

        db = next(self._memory_manager.get_db())
        try:
            # --- Inicializar usuario y permisos ---
            logger.debug(f"Obteniendo datos de usuario para '{user_name}'")
            db_user, user_permissions_str, user_preferences_dict = await self._user_manager.get_user_data(db, user_name)

            user_id = db_user.id if db_user else None
            if user_id is None:
                logger.error("No se pudo obtener el ID del usuario. No se puede gestionar la memoria.")
                return None

            logger.debug(f"Obteniendo memoria para el usuario {user_id}")
            memory_db = await self._memory_manager.get_user_memory(db, user_id)

            # --- Cargar comandos IoT ---
            logger.debug("Cargando comandos IoT de la base de datos.")
            try:
                iot_commands_db = await asyncio.to_thread(lambda: db.query(models.IoTCommand).all())
            except Exception as e:
                logger.error(f"Error al cargar comandos IoT de la base de datos: {e}")
                return None
            formatted_iot_commands = (
                "\n".join([f"- {cmd.command_payload}: {cmd.description}" for cmd in iot_commands_db])
                if iot_commands_db
                else "No hay comandos IoT registrados."
            )
            logger.debug(f"Comandos IoT cargados: {len(iot_commands_db)}")

            all_capabilities = self._config["capabilities"] + [
                cmd.name for cmd in iot_commands_db
            ]

            # --- Búsqueda en logs de conversación ---
            search_results_str = ""
            reprompt_with_search = False

            retries = 3
            client = ollama.AsyncClient(host="http://localhost:11434")
            for attempt in range(retries):
                # Construcción del prompt con formateo seguro
                logger.debug("Construyendo system_prompt para Ollama.")
                
                # Preparar valores seguros
                last_interaction_value = (
                    memory_db.last_interaction.isoformat()
                    if memory_db.last_interaction
                    else "No hay registro de interacciones previas."
                )
                
                device_states_value = (
                    memory_db.device_states
                    if memory_db.device_states
                    else "No hay estados de dispositivos registrados."
                )
                
                timezone_str = self._config.get("timezone", "UTC")
                current_full_datetime = get_current_datetime(timezone_str)
                current_date_formatted = format_date_human_readable(current_full_datetime)
                current_time_formatted = format_time_only(current_full_datetime)
                current_country = get_country_from_timezone(timezone_str)

                system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
                    assistant_name=self._config["assistant_name"],
                    language=self._config["language"],
                    capabilities="\n".join(f"- {cap}" for cap in all_capabilities),
                    iot_commands=formatted_iot_commands,
                    last_interaction=last_interaction_value,
                    device_states=self._safe_format_value(device_states_value),
                    user_preferences=self._safe_format_value(user_preferences_dict),
                    identified_speaker=user_name if user_name else "Desconocido",
                    is_owner=is_owner,
                    user_permissions=self._safe_format_value(user_permissions_str),
                    current_date=current_date_formatted,
                    current_time=current_time_formatted,
                    current_timezone=timezone_str,
                    search_results=self._safe_format_value(search_results_str),
                    current_country=current_country,
                )
                logger.debug("System_prompt construido correctamente.")

                prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
                logger.debug(f"Enviando prompt a Ollama (intento {attempt+1}/{retries})...")
                response_stream = await client.chat(
                    model=self._config["model"]["name"],
                    messages=[{"role": "user", "content": prompt_text}],
                    options={
                        "temperature": self._config["model"]["temperature"],
                        "num_predict": self._config["model"]["max_tokens"],
                    },
                    stream=True,
                )

                full_response_content = ""
                async for chunk in response_stream:
                    if "content" in chunk["message"]:
                        full_response_content += chunk["message"]["content"]

                if not full_response_content:
                    logger.warning("Ollama devolvió una respuesta vacía. Reintentando...")
                    continue

                logger.debug(f"Respuesta completa de Ollama: '{full_response_content[:200]}...'\n")

                # memory_search tag
                memory_search_match = re.search(r"memory_search:\s*(.+)", full_response_content)
                if memory_search_match and user_id and not reprompt_with_search:
                    query = memory_search_match.group(1).strip()
                    logger.info(f"Detectada solicitud de búsqueda en memoria con query: '{query}'")
                    search_results = await self._memory_manager.search_conversation_logs(db, user_id, query, limit=5)
                    if search_results:
                        formatted_results = []
                        for log in search_results:
                            formatted_results.append(f"- En {format_datetime(log.timestamp)} (Usuario: {log.speaker_identifier}): \"{log.prompt}\" (Asistente: \"{log.response}\")")
                        search_results_str = "\n".join(formatted_results)
                        logger.debug(f"Resultados de búsqueda de historial encontrados: {len(search_results)}")
                    else:
                        search_results_str = "No se encontraron resultados en el historial de conversaciones."
                        logger.debug("No se encontraron resultados en el historial de conversaciones.")

                    reprompt_with_search = True
                    attempt = -1
                    continue

                # --- Manejo de preferencias --- 
                logger.debug("Procesando preferencias de usuario.")
                full_response_content = await self._user_manager.handle_preference_setting(db, db_user, full_response_content)
                logger.debug("Preferencias de usuario procesadas.")

                # --- Manejo de comandos IoT ---
                logger.debug("Procesando comandos IoT.")
                # Search for an IoT command pattern in the full_response_content
                # Ejm: iot_command:turn_on_light(room=living_room) or mqtt_publish:topic,payload
                iot_command_match = re.search(r"(iot_command:\w+\(.*?\)|mqtt_publish:[^,]+,.*)", full_response_content)

                if iot_command_match:
                    full_command_with_args = iot_command_match.group(0)
                    command_name_for_db_validation = None

                    if full_command_with_args.startswith("iot_command:"):
                        # Extract command name for iot_command type for database validation
                        name_match = re.match(r"iot_command:(\w+)\(.*?\)", full_command_with_args)
                        if name_match:
                            command_name_for_db_validation = name_match.group(1)

                    # Perform database validation only for iot_command type
                    if command_name_for_db_validation:
                        try:
                            db_command = await asyncio.to_thread(
                                lambda: db.query(IoTCommand)
                                .filter(IoTCommand.command_name == command_name_for_db_validation)
                                .first()
                            )
                            if not db_command:
                                logger.warning(
                                    f"Comando IoT '{command_name_for_db_validation}' no encontrado en la base de datos. Modificando respuesta."
                                )
                                full_response_content = "Lo siento, no reconozco ese comando IoT."
                                continue # Skip further processing for this command
                        except Exception as e:
                            logger.error(f"Error al validar el comando IoT '{command_name_for_db_validation}' en la base de datos: {e}")
                            full_response_content = "Lo siento, hubo un error al procesar tu comando."
                            continue # Skip further processing for this command

                    # If it's an mqtt_publish command or a validated iot_command, process it
                    iot_response = await self._iot_command_processor.process_iot_command(
                        db, full_command_with_args
                    )
                    if iot_response:
                        full_response_content = iot_response
                        logger.info(f"Comando IoT ejecutado, respuesta: {iot_response}")
                    else:
                        logger.warning(f"El comando IoT '{full_command_with_args}' no produjo una respuesta específica.")
                logger.debug("Comandos IoT procesados.")

                # --- Cambio de nombre ---
                name_change_match = re.search(r"name_change:\s*(.+)", full_response_content)
                if name_change_match and user_name:
                    new_name = name_change_match.group(1).strip()
                    logger.info(f"Detectado cambio de nombre a: {new_name}")
                    full_response_content = await self._user_manager.handle_name_change(
                        db, user_name, new_name
                    )
                    if full_response_content:
                        await self._memory_manager.update_memory(
                            user_id, prompt, full_response_content, db, speaker_identifier=user_name
                        )
                        logger.info("Cambio de nombre procesado y memoria actualizada.")
                        return {
                            "identified_speaker": user_name or "Desconocido",
                            "response": full_response_content,
                        }
                logger.debug("Cambio de nombre procesado (si aplica).")

                # --- Guardar memoria ---
                logger.debug("Actualizando memoria con la respuesta generada.")
                await self._memory_manager.update_memory(
                    user_id, prompt, full_response_content, db, speaker_identifier=user_name
                )
                logger.info("Memoria actualizada con la respuesta.")
                return {
                    "identified_speaker": user_name or "Desconocido",
                    "response": full_response_content,
                }

            logger.error("Se agotaron todos los intentos para generar respuesta")
            self._online = False
            return None

        finally:
            logger.debug("Cerrando sesión de base de datos.")
            await asyncio.to_thread(lambda: db.close())