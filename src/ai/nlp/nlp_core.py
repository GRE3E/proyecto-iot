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

    def __del__(self) -> None:
        """Libera el OllamaManager al destruir la instancia."""
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
        self._config_manager.load_config()
        self._config = self._config_manager.get_config()
        self._ollama_manager.reload(self._config["model"])
        self._online = self._ollama_manager.is_online()

    async def generate_response(
        self, prompt: str, user_name: Optional[str] = None, is_owner: bool = False
    ) -> Optional[dict]:
        """Genera una respuesta usando Ollama y gestiona memoria, permisos, preferencias y comandos IoT."""
        if not prompt or not prompt.strip():
            logger.warning("El prompt no puede estar vacío.")
            return None

        if not self.is_online():
            logger.error("El módulo NLP no está en línea.")
            return None

        db = next(self._memory_manager.get_db())
        try:
            memory_db = await self._memory_manager.get_user_memory(db)

            # --- Inicializar usuario y permisos ---
            db_user, user_permissions_str, user_preferences_str = await self._user_manager.get_user_data(db, user_name)

            # --- Cargar comandos IoT ---
            iot_commands_db = await asyncio.to_thread(lambda: db.query(models.IoTCommand).all())
            formatted_iot_commands = (
                "\n".join([f"- {cmd.command_payload}: {cmd.description}" for cmd in iot_commands_db])
                if iot_commands_db
                else "No hay comandos IoT registrados."
            )

            all_capabilities = self._config["capabilities"] + [
                cmd.name for cmd in iot_commands_db
            ]

            # --- Construcción del prompt ---
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
            )

            retries = 3
            for attempt in range(retries):
                try:
                    prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
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

                    # --- Manejo de preferencias ---
                    full_response_content = await self._user_manager.handle_preference_setting(db, db_user, full_response_content)

                    # --- Manejo de comandos IoT ---
                    iot_response = await self._iot_command_processor.process_iot_command(db, full_response_content)
                    if iot_response:
                        full_response_content = iot_response

                    # --- Cambio de nombre ---
                    name_match = re.search(
                        r"(?:llámame|mi nombre es)\s+([A-Za-zÀ-ÿ]+)", prompt, re.IGNORECASE
                    )
                    if name_match and user_name:
                        full_response_content = await self._user_manager.handle_name_change(
                            db, user_name, name_match
                        )
                        if full_response_content:
                            await self._memory_manager.update_memory(
                                prompt, full_response_content, db, speaker_identifier=user_name
                            )
                            return {
                                "identified_speaker": user_name or "Desconocido",
                                "response": full_response_content,
                            }

                    # --- Guardar memoria ---
                    await self._memory_manager.update_memory(
                        prompt, full_response_content, db, speaker_identifier=user_name
                    )
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
            await asyncio.to_thread(lambda: db.close())
