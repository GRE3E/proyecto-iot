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
from src.utils.datetime_utils import get_current_datetime, format_datetime




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
            db_user, user_permissions_str, user_preferences_str = await self._user_manager.get_user_data(db, user_name)

            user_id = db_user.id if db_user else None
            if user_id is None:
                logger.error("No se pudo obtener el ID del usuario. No se puede gestionar la memoria.")
                return None

            logger.debug(f"Obteniendo memoria para el usuario {user_id}")
            memory_db = await self._memory_manager.get_user_memory(db, user_id)

            # --- Cargar comandos IoT ---
            logger.debug("Cargando comandos IoT de la base de datos.")
            iot_commands_db = await asyncio.to_thread(lambda: db.query(models.IoTCommand).all())
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
            search_match = re.search(r"(?:busca|¿alguna vez|has|recuerdas)\s+(?:en mi historial|que te (?:pedí|dije))\s*(.*)", prompt, re.IGNORECASE)
            if search_match and user_id:
                logger.info("Detectada una consulta de historial de conversación.")
                query = search_match.group(1).strip()
                if query:
                    search_results = await self._memory_manager.search_conversation_logs(db, user_id, query)
                    if search_results:
                        formatted_results = []
                        for log in search_results:
                            formatted_results.append(f"- En {format_datetime(log.timestamp)} (Usuario: {log.speaker_identifier}): \"{{log.prompt}}\" (Asistente: \"{{log.response}}\")")
                        search_results_str = "\n".join(formatted_results)
                        logger.debug(f"Resultados de búsqueda de historial encontrados: {len(search_results)}")
                    else:
                        search_results_str = "No se encontraron resultados en el historial de conversaciones."
                        logger.debug("No se encontraron resultados en el historial de conversaciones.")
                else:
                    search_results_str = "No se especificó una consulta para buscar en el historial."
                    logger.debug("Consulta de historial vacía.")
                # Si es una consulta sobre el historial, omitir procesamiento de comandos IoT
                logger.info("Respondiendo a la consulta de historial y omitiendo procesamiento IoT.")
                return {
                    "identified_speaker": user_name or "Desconocido",
                    "response": search_results_str or "No hay registros de esa solicitud.",
                }

            # --- Construcción del prompt ---
            logger.debug("Construyendo system_prompt para Ollama.")
            system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
                assistant_name=self._config["assistant_name"],
                language=self._config["language"],
                capabilities="\n".join(f"- {cap}" for cap in all_capabilities),
                iot_commands=formatted_iot_commands,
                last_interaction=memory_db.last_interaction.isoformat()
                if memory_db.last_interaction
                else "No hay registro de interacciones previas.",
                device_states=memory_db.device_states
                if memory_db.device_states
                else "No hay estados de dispositivos registrados.",
                user_preferences=user_preferences_str,
                identified_speaker=user_name if user_name else "Desconocido",
                is_owner=is_owner,
                user_permissions=user_permissions_str,
                current_datetime=format_datetime(
                    get_current_datetime(self._config.get("timezone", "UTC"))
                ),
                search_results=search_results_str,
            )
            logger.debug("System_prompt construido.")

            retries = 3
            client = ollama.AsyncClient(host="http://localhost:11434")
            for attempt in range(retries):
                try:
                    prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
                    logger.debug(f"Enviando prompt a Ollama (intento {attempt+1}/{retries})...")
                    client = ollama.AsyncClient(host="http://localhost:11434")
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
                        logger.warning("Ollama devolvió una respuesta vacía")
                        continue

                    logger.debug(f"Respuesta completa de Ollama: '{full_response_content[:200]}...'\n")

                    # --- Manejo de preferencias ---
                    logger.debug("Procesando preferencias de usuario.")
                    full_response_content = await self._user_manager.handle_preference_setting(db, db_user, full_response_content)
                    logger.debug("Preferencias de usuario procesadas.")

                    # --- Manejo de comandos IoT ---
                    logger.debug("Procesando comandos IoT.")
                    iot_response = await self._iot_command_processor.process_iot_command(db, full_response_content)
                    if iot_response:
                        full_response_content = iot_response
                        logger.info(f"Comando IoT ejecutado, respuesta: {iot_response}")
                    logger.debug("Comandos IoT procesados.")

                    # --- Cambio de nombre ---
                    name_match = re.search(
                        r"(?:llámame|mi nombre es)\s+([A-Za-zÀ-ÿ]+)", prompt, re.IGNORECASE
                    )
                    if name_match and user_name:
                        logger.info(f"Detectado cambio de nombre a: {name_match.group(1)}")
                        full_response_content = await self._user_manager.handle_name_change(
                            db, user_name, name_match
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

                except ollama.ResponseError as e:
                    logger.error(f"Error de Ollama (intento {attempt+1}/{retries}): {e}")
                except Exception as e:
                    logger.exception(
                        f"Excepción en generate_response (intento {attempt+1}/{retries}): {e}"
                    )
                if attempt < retries - 1:
                    await asyncio.sleep(2)

            logger.error("Se agotaron todos los intentos para generar respuesta")
            self._online = False
            return None

        finally:
            logger.debug("Cerrando sesión de base de datos.")
            await asyncio.to_thread(lambda: db.close())
