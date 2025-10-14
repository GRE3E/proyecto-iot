import asyncio
import logging
import re
from typing import Optional, Any
from pathlib import Path
from ollama import AsyncClient, ResponseError
from httpx import ConnectError
from datetime import datetime
from contextlib import asynccontextmanager
from src.ai.nlp.ollama_manager import OllamaManager
from src.ai.nlp.config_manager import ConfigManager
from src.ai.nlp.iot_command_processor import IoTCommandProcessor
from src.ai.nlp.user_manager import UserManager
from src.ai.nlp.prompt_creator import create_system_prompt
from src.db.database import get_db
from sqlalchemy.orm import Session

logger = logging.getLogger("NLPModule")

MEMORY_SEARCH_REGEX = re.compile(r"memory_search:\s*(.+)")
PREFERENCE_MARKERS_REGEX = re.compile(r"(preference_set:|memory_search:|name_change:)")
IOT_COMMAND_REGEX = re.compile(r"(iot_command|mqtt_publish):[^\s]+")
NAME_CHANGE_REGEX = re.compile(r"name_change:\s*(.+)")

class NLPModule:
    """Clase principal para el procesamiento NLP con integración a Ollama y control IoT."""

    @asynccontextmanager
    async def get_db_session(self):
        """Context manager para gestionar sesiones de base de datos a nivel de clase.
        Cierra la sesión inmediatamente después de su uso para liberar recursos."""
        db = next(get_db())
        try:
            yield db
        finally:
            db.close()

    def __init__(self) -> None:
        """Inicializa configuración, OllamaManager y UserManager."""
        self._config_path = Path(__file__).parent.parent / "config" / "config.json"
        self._config_manager = ConfigManager(self._config_path)
        self._config = self._config_manager.get_config()
        self._ollama_manager = OllamaManager(self._config["model"])
        self._online = self._ollama_manager.is_online()
        self.mqtt_client = None

        self._user_manager = UserManager()
        self._iot_command_processor = None
        logger.info("NLPModule inicializado.")

    def __del__(self) -> None:
        """Libera recursos al destruir la instancia."""
        logger.info("Cerrando NLPModule.")
        del self._ollama_manager

    async def set_iot_managers(self, mqtt_client: Any, db: Session) -> None:
        """Configura el cliente MQTT y el procesador IoT.
        
        Args:
            mqtt_client: Cliente MQTT para enviar comandos.
            db: Sesión de base de datos para inicializar el caché.
        """
        self.mqtt_client = mqtt_client
        self._iot_command_processor = IoTCommandProcessor(mqtt_client)
        await self._iot_command_processor.initialize(db)
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
        if self._iot_command_processor:
            self._iot_command_processor.invalidate_command_cache()
        log_fn = logger.info if self._online else logger.warning
        log_fn("NLPModule recargado." if self._online else "NLPModule recargado pero no en línea.")

    async def _validate_user(self, db, user_id: int) -> tuple:
        """Valida el usuario y obtiene sus datos
        
        Nota: user_id=0 es un caso especial que se usa para el sistema
        y no requiere actualización de memoria (ver línea donde se usa if user_id != 0)
        """
        if user_id is None:
            return None, None, None, None, None
        
        db_user, user_permissions_str, user_preferences_dict = await self._user_manager.get_user_data_by_id(db, user_id)
        if not db_user:
            return None, None, None, None, None
            
        return db_user, db_user.nombre, db_user.is_owner, user_permissions_str, user_preferences_dict
    
    async def _load_iot_commands(self, db) -> tuple:
        """Carga los comandos IoT desde la base de datos"""
        try:
            formatted_iot_commands, iot_commands_db = await self._iot_command_processor.load_commands_from_db(db)
            all_capabilities = self._config["capabilities"] + [cmd.name for cmd in iot_commands_db]
            return formatted_iot_commands, iot_commands_db, all_capabilities, None
        except Exception as e:
            error_msg = f"No se pudieron cargar los comandos IoT: {e}"
            return None, None, None, error_msg
    
    async def _get_llm_response(self, client, system_prompt, prompt_text, retries=2) -> tuple:
        """Obtiene la respuesta del modelo de lenguaje"""
        for attempt in range(retries):
            try:
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
                    logger.warning("Respuesta vacía de Ollama. Reintentando...")
                    continue
                
                return full_response_content, None
                
            except (ResponseError, ConnectError, Exception) as e:
                logger.error(f"Error con Ollama: {e}. Reintentando...")
                if attempt == retries - 1:
                    return None, f"Error con Ollama después de {retries} intentos: {e}"
                continue
        
        return None, "No se pudo generar una respuesta después de varios intentos."
    
    async def _process_memory_search(self, db, user_id, full_response_content) -> tuple:
        """Procesa la búsqueda en memoria si existe"""
        memory_search_match = MEMORY_SEARCH_REGEX.search(full_response_content)
        if not memory_search_match or not user_id:
            return "", False
            
        query = memory_search_match.group(1).strip()
        search_results = await self._user_manager.search_memory(db, user_id, query)
        
        if search_results:
            formatted_results = [
                f"- En {log.timestamp:%Y-%m-%d %H:%M} (Usuario: {log.speaker_identifier}): \"{log.prompt}\" (Asistente: \"{log.response}\")"
                for log in search_results
            ]
            search_results_str = "\n".join(formatted_results)
        else:
            search_results_str = "No se encontraron resultados en el historial de conversaciones."
            
        return search_results_str, True
    
    async def _process_iot_command(self, db, full_response_content) -> tuple:
        """Procesa comandos IoT en la respuesta"""
        if not full_response_content:
            return full_response_content, None
            
        iot_match = IOT_COMMAND_REGEX.search(full_response_content)
        extracted_command = iot_match.group(0) if iot_match else None
        
        if not extracted_command:
            return full_response_content, None
            
        clean_response = re.sub(IOT_COMMAND_REGEX, "", full_response_content).strip()
        
        is_valid, error_message = await self._iot_command_processor.validate_command(db, extracted_command)
        if not is_valid:
            return error_message, None
            
        iot_response = await self._iot_command_processor.process_iot_command(db, extracted_command)
        if iot_response:
            return iot_response, extracted_command
            
        return clean_response, extracted_command
    
    async def _process_name_change(self, db, full_response_content, user_id: int) -> str:
        """Procesa cambios de nombre en la respuesta"""
        name_change_match = NAME_CHANGE_REGEX.search(full_response_content)
        if not name_change_match or user_id is None:
            return full_response_content
            
        new_name = name_change_match.group(1).strip()
        name_change_response = await self._user_manager.handle_name_change(db, user_id, new_name)
        
        if name_change_response:
            return name_change_response
        else:
            return re.sub(NAME_CHANGE_REGEX, "", full_response_content).strip()
    
    async def generate_response(self, prompt: str, user_id: int) -> Optional[dict]:
        """Genera una respuesta usando Ollama, gestionando memoria, permisos y comandos IoT."""
        logger.info(f"Generando respuesta para el prompt: '{prompt[:100]}...' (Usuario ID: {user_id})")

        if not prompt or not prompt.strip():
            return {"response": "El prompt no puede estar vacío.", "error": "Prompt vacío", "user_name": "", "preference_key": None, "preference_value": None}

        if not self.is_online():
            try:
                self.reload()
                if not self.is_online():
                    return {"response": "El módulo NLP está fuera de línea.", "error": "Módulo NLP fuera de línea", "user_name": "", "preference_key": None, "preference_value": None}
            except Exception as e:
                return {"response": f"El módulo NLP está fuera de línea: {e}", "error": "Módulo NLP fuera de línea", "user_name": "", "preference_key": None, "preference_value": None}

        if user_id is None:
            return {"response": "user_id es requerido para consultas NLP.", "error": "user_id es requerido", "user_name": "", "preference_key": None, "preference_value": None}
        
        async with self.get_db_session() as db:
            user_task = asyncio.create_task(self._validate_user(db, user_id))
            iot_commands_task = asyncio.create_task(self._load_iot_commands(db))
            
            await asyncio.gather(user_task, iot_commands_task)
            
            db_user, user_name, is_owner, user_permissions_str, user_preferences_dict = user_task.result()
            formatted_iot_commands, iot_commands_db, all_capabilities, iot_error = iot_commands_task.result()
            
            # ⭐ NUEVO: Cargar historial de conversación 
            recent_conversations = await self._user_manager.get_recent_conversation(db, user_id, limit=5)
        
        if not db_user:
            return {"response": "Usuario no autorizado o no encontrado.", "error": "Usuario no autorizado o no encontrado.", "user_name": None, "preference_key": None, "preference_value": None, "is_owner": False}

        if iot_error:
            return {"response": iot_error, "error": iot_error, "user_name": user_name, "preference_key": None, "preference_value": None}

        search_results_str = ""
        reprompt_with_search = False
        retries = 2
        client = AsyncClient(host="http://localhost:11434")
        extracted_command = None

        for attempt in range(retries):
            system_prompt, prompt_text = create_system_prompt(
                config=self._config,
                user_name=user_name,
                is_owner=is_owner,
                user_permissions_str=user_permissions_str,
                formatted_iot_commands=formatted_iot_commands,
                all_capabilities=all_capabilities,
                search_results_str=search_results_str,
            user_preferences_dict=user_preferences_dict,
            prompt=prompt,
            recent_conversations=recent_conversations  # ⭐ NUEVO
        )

            full_response_content, llm_error = await self._get_llm_response(client, system_prompt, prompt_text)
            if llm_error:
                if attempt == retries - 1:
                    return {"response": llm_error, "error": llm_error, "user_name": user_name, "preference_key": None, "preference_value": None}
                continue

            async with self.get_db_session() as db:
                if not reprompt_with_search:
                    memory_results, needs_reprompt = await self._process_memory_search(db, user_id, full_response_content)
                    if needs_reprompt:
                        search_results_str = memory_results
                        reprompt_with_search = True
                        if attempt < retries - 1:
                            continue
                        else:
                            logger.warning("Se alcanzó el límite de reintentos para búsqueda en memoria.")

                full_response_content = await self._user_manager.handle_preference_setting(db, db_user, full_response_content)
                full_response_content = await self._process_name_change(db, full_response_content, user_id)
                full_response_content = PREFERENCE_MARKERS_REGEX.sub("", full_response_content).strip()
                
                response_for_memory = full_response_content  # Guardar ANTES de limpiar
                full_response_content, extracted_command = await self._process_iot_command(db, full_response_content)
                
                if user_id != 0:
                    try:
                        await self._user_manager.update_memory(db, user_id, prompt, response_for_memory) # Usar la versión completa
                    except Exception as e:
                        return {"response": f"Error interno al actualizar la memoria: {e}", "error": str(e), "user_name": user_name, "preference_key": None, "preference_value": None}

            return {
                "identified_speaker": user_name or "Desconocido",
                "response": full_response_content,
                "command": extracted_command,
                "user_name": user_name,
                "preference_key": None,
                "preference_value": None
            }

            self._online = False
            return {"response": "No se pudo procesar tu solicitud. Intenta más tarde.", "error": "Agotados intentos", "user_name": user_name, "preference_key": None, "preference_value": None}

    def update_assistant_name(self, new_name: str):
        """Actualiza el nombre del asistente."""
        self._config["assistant_name"] = new_name
        self._config_manager.save_config()
        logger.info(f"Nombre del asistente actualizado a '{new_name}'.")

    def update_capabilities(self, new_capabilities: list[str]):
        """Actualiza las capacidades del asistente."""
        self._config["capabilities"] = new_capabilities
        self._config_manager.save_config()
        logger.info(f"Capacidades actualizadas: {new_capabilities}")
