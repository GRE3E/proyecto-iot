import asyncio
import logging
import re
from typing import Optional, Any, Dict
from pathlib import Path
from datetime import datetime
from ollama import ResponseError
from httpx import ConnectError
from src.ai.nlp.memory_manager import MemoryManager
from src.ai.nlp.ollama_manager import OllamaManager
from src.ai.nlp.config_manager import ConfigManager
from src.ai.nlp.iot_command_processor import IoTCommandProcessor
from src.ai.nlp.user_manager import UserManager
from src.ai.nlp.prompt_creator import create_system_prompt
from src.ai.nlp.prompt_loader import load_system_prompt_template
from src.db.database import get_db
from src.iot.mqtt_client import MQTTClient
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("NLPModule")

MEMORY_SEARCH_REGEX = re.compile(r"memory_search:\s*(.+)")
PREFERENCE_MARKERS_REGEX = re.compile(r"(preference_set:|memory_search:|name_change:)")
IOT_COMMAND_REGEX = re.compile(r"(iot_command|mqtt_publish):[^\s]+")
NAME_CHANGE_REGEX = re.compile(r"name_change:\s*(.+)")
NEGATION_REGEX = re.compile(r"\b(no |nunca|no quiero|no enciendas|no abras|no activar|no cierre|no prenda)\b")
DEVICE_LOCATION_REGEX = re.compile(r"\b(salón|sala|cocina|dormitorio|pasillo|comedor|baño|garaje|lavandería|habitación|principal|invitados|barra|isla)\b", re.IGNORECASE)

def _find_project_root(current_path: Path) -> Path:
    """Busca la raíz del proyecto buscando un marcador como 'main.py' o 'requirements.txt'."""
    for parent in current_path.parents:
        if (parent / "main.py").exists() or (parent / "requirements.txt").exists():
            return parent
    return current_path

class UserDeviceContext:
    """Almacena el contexto de dispositivo del usuario para resolución de ambigüedades"""
    
    def __init__(self, context_ttl_seconds: int = 300):
        self.last_device = None
        self.last_location = None
        self.last_device_type = None
        self.timestamp = None
        self.context_ttl_seconds = context_ttl_seconds
    
    def update(self, device_name: str, location: str, device_type: str):
        """Actualiza el contexto con un nuevo dispositivo mencionado"""
        self.last_device = device_name
        self.last_location = location
        self.last_device_type = device_type
        self.timestamp = datetime.now()
        logger.debug(f"Contexto actualizado: dispositivo={device_name}, ubicación={location}")
    
    def is_expired(self) -> bool:
        """Verifica si el contexto expiró"""
        if not self.timestamp:
            return True
        return (datetime.now() - self.timestamp).total_seconds() > self.context_ttl_seconds
    
    def get_context_info(self) -> Optional[Dict[str, str]]:
        """Retorna la información del contexto si no está expirado"""
        if self.is_expired():
            self.last_device = None
            self.last_location = None
            self.last_device_type = None
            return None
        
        if self.last_device:
            return {
                "device": self.last_device,
                "location": self.last_location,
                "device_type": self.last_device_type
            }
        return None

class NLPModule:
    """Clase principal para el procesamiento NLP con integración a Ollama y control IoT."""

    def __init__(self, ollama_manager: OllamaManager, config: Dict[str, Any]) -> None:
        """Inicializa configuración, OllamaManager y UserManager."""
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
        self._system_prompt_template = load_system_prompt_template()
        
        # Contexto de dispositivo persistente por usuario
        self._user_device_context = {}  # {user_id: UserDeviceContext}
        
        logger.info("NLPModule inicializado.")

    async def close(self) -> None:
        """Cierra explícitamente los recursos del NLPModule."""
        logger.info("Cerrando NLPModule.")
        if self._ollama_manager:
            self._ollama_manager.close()
        self._is_closing = True

    async def set_iot_managers(self, mqtt_client: MQTTClient, db: AsyncSession) -> None:
        """Configura el cliente MQTT y el procesador IoT.
        
        Args:
            mqtt_client: Cliente MQTT para enviar comandos.
            db: Sesión de base de datos para inicializar la caché.
        """
        if self.mqtt_client:
            await self.mqtt_client.disconnect()
        self.mqtt_client = mqtt_client
        self._iot_command_processor = IoTCommandProcessor(mqtt_client)
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
            self._system_prompt_template = load_system_prompt_template()
            log_fn = logger.info if self._online else logger.warning
            log_fn("NLPModule recargado." if self._online else "NLPModule recargado pero no en línea.")

    async def _validate_user(self, user_id: int) -> tuple[Optional[Any], Optional[str], Optional[bool], Optional[str], Optional[dict]]:
        """Valida el usuario y obtiene sus datos"""
        if user_id is None:
            return None, None, None, None, None

        async with get_db() as db:
            db_user, user_permissions_str, user_preferences_dict = await self._user_manager.get_user_data_by_id(db, user_id)
            if not db_user:
                return None, None, None, None, None
                
            return db_user, db_user.nombre, db_user.is_owner, user_permissions_str, user_preferences_dict
    
    async def _load_iot_commands(self) -> tuple[Optional[Any], Optional[list[str]], Optional[str]]:
        """Carga los comandos IoT desde la base de datos"""
        try:
            async with get_db() as db:
                formatted_iot_commands, iot_commands_db = await self._iot_command_processor.load_commands_from_db(db)
                return formatted_iot_commands, [cmd.name for cmd in iot_commands_db], None
        except Exception as e:
            error_msg = "Error al cargar comandos IoT."
            logger.error(f"No se pudieron cargar los comandos IoT: {e}")
            return None, None, error_msg
    
    async def _get_llm_response(self, system_prompt, prompt_text) -> tuple[Optional[str], Optional[str]]:
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
    
    def _extract_device_location(self, text: str) -> Optional[str]:
        """Extrae la ubicación del dispositivo del texto"""
        match = DEVICE_LOCATION_REGEX.search(text)
        if match:
            return match.group(1).lower()
        return None
    
    def _get_or_create_user_context(self, user_id: int) -> UserDeviceContext:
        """Obtiene o crea el contexto de dispositivo del usuario"""
        if user_id not in self._user_device_context:
            self._user_device_context[user_id] = UserDeviceContext(context_ttl_seconds=300)
        return self._user_device_context[user_id]
    
    def _update_device_context(self, user_id: int, prompt: str, extracted_command: Optional[str]):
        """Actualiza el contexto de dispositivo si se ejecutó un comando"""
        if not extracted_command or not user_id:
            return
        
        try:
            parts = extracted_command.split(":")
            if len(parts) >= 2:
                topic_payload = parts[1]
                topic = topic_payload.split(",")[0] if "," in topic_payload else topic_payload
                
                location = self._extract_device_location(prompt)
                
                device_type = "desconocido"
                if "light" in topic.lower():
                    device_type = "luz"
                elif "door" in topic.lower():
                    device_type = "puerta"
                elif "actuator" in topic.lower():
                    device_type = "actuador"
                elif "climate" in topic.lower():
                    device_type = "clima"
                
                context = self._get_or_create_user_context(user_id)
                device_name = topic.split("/")[-2] if "/" in topic else topic
                context.update(device_name, location or "desconocida", device_type)
                
                logger.info(f"Contexto de dispositivo actualizado para usuario {user_id}: {device_name} en {location}")
        except Exception as e:
            logger.warning(f"Error al actualizar contexto de dispositivo: {e}")
    
    def _enhance_prompt_with_context(self, user_id: int, prompt: str) -> str:
        """Mejora el prompt con contexto de dispositivo anterior si aplica"""
        context = self._get_or_create_user_context(user_id)
        context_info = context.get_context_info()
        
        if not context_info:
            return prompt
        
        reference_words = ["la", "eso", "esa", "el", "esa misma", "lo mismo"]
        has_reference = any(word in prompt.lower() for word in reference_words)
        
        if has_reference and not self._extract_device_location(prompt):
            context_hint = f"[Contexto anterior: Fue sobre la {context_info['device_type']} en {context_info['location']}. Si el usuario dice 'la' o similar, probablemente se refiere a eso.]"
            enhanced_prompt = f"{prompt}\n{context_hint}"
            logger.debug(f"Prompt mejorado con contexto para usuario {user_id}")
            return enhanced_prompt
        
        return prompt
    
    async def _process_memory_search(self, db: AsyncSession, user_id: int, full_response_content: str) -> str:
        """Procesa memory_search y RETORNA los resultados formateados al usuario"""
        memory_search_match = MEMORY_SEARCH_REGEX.search(full_response_content)
        
        if not memory_search_match or not user_id:
            return full_response_content
        
        query = memory_search_match.group(1).strip()
        logger.info(f"Memory search ejecutada para usuario {user_id}: '{query}'")
        
        try:
            search_results = await self._user_manager.search_memory(db, user_id, query)
            
            if search_results:
                # Formatea los resultados encontrados
                results_formatted = "\n".join([
                    f"📍 {log.timestamp.strftime('%Y-%m-%d %H:%M')} - Tú: \"{log.prompt[:60]}...\"\n"
                    f"   Yo: \"{log.response[:80]}...\""
                    for log in search_results
                ])
                
                replacement_text = f"Encontré estos registros en tu historial:\n\n{results_formatted}"
                logger.debug(f"Resultados encontrados: {len(search_results)} registros")
            else:
                replacement_text = "No encontré información sobre eso en tu historial."
                logger.debug("Memory search: sin resultados")
            
            # CLAVE: Reemplaza "memory_search:" con los resultados formateados
            full_response_content = full_response_content.replace(
                f"memory_search: {query}",
                replacement_text
            )
            # También limpia variantes
            full_response_content = re.sub(MEMORY_SEARCH_REGEX, replacement_text, full_response_content)
            
        except Exception as e:
            logger.error(f"Error en memory search para usuario {user_id}: {e}")
            full_response_content = re.sub(MEMORY_SEARCH_REGEX, "Error al buscar en el historial", full_response_content)
        
        return full_response_content.strip()

    async def get_conversation_history(self, db: AsyncSession, user_id: int, limit: int = 100):
        """Recupera el historial de conversación para un usuario específico."""
        return await self._memory_manager.get_raw_conversation_logs_by_user_id(db, user_id, limit)
    
    def _contains_negation(self, text: str) -> bool:
        """Detecta si el texto contiene negaciones"""
        return bool(NEGATION_REGEX.search(text.lower()))
    
    async def _process_iot_command(self, db: AsyncSession, full_response_content: str, token: str, user_id: int, iot_commands_db: list) -> tuple[str, Optional[str]]:
        """Procesa comandos IoT con throttling y detección de ambigüedad"""
        if not full_response_content:
            return full_response_content, None
        
        # Verificar ambigüedad ANTES de procesar
        ambiguity_msg = await self._iot_command_processor.detect_ambiguous_commands(
            db, full_response_content, full_response_content, iot_commands_db
        )
        
        if ambiguity_msg:
            logger.info(f"Comando ambiguo detectado para usuario {user_id}")
            return ambiguity_msg, None
        
        iot_match = IOT_COMMAND_REGEX.search(full_response_content)
        extracted_command = iot_match.group(0) if iot_match else None
        
        if not extracted_command:
            return full_response_content, None
        
        clean_response = re.sub(IOT_COMMAND_REGEX, "", full_response_content).strip()
        
        # Procesar comando con throttling
        iot_response = await self._iot_command_processor.process_iot_command(
            db, full_response_content, token, user_id=user_id
        )
        
        if iot_response:
            return iot_response, extracted_command
        
        return clean_response, extracted_command
    
    async def _process_name_change(self, db: AsyncSession, full_response_content: str, user_id: int) -> str:
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
    
    def _should_load_conversation_history(self, prompt: str) -> bool:
        """Determina si necesita cargar historial basado en palabras clave"""
        keywords = ["recuerda", "dijiste", "antes", "anterior", "que me dijiste", "me contaste", 
                   "lo que dijiste", "mencionaste", "hablamos de", "me dijeron"]
        return any(keyword in prompt.lower() for keyword in keywords)

    async def generate_response(self, prompt: str, user_id: int, token: str) -> Optional[dict]:
        """Genera una respuesta usando Ollama, gestionando memoria, permisos y comandos IoT."""
        logger.info(f"Generando respuesta para el prompt: '{prompt[:100]}...' (Usuario ID: {user_id})")

        if self._is_closing:
            logger.warning("NLPModule se está cerrando, no se puede generar respuesta.")
            return {
                "response": "El módulo NLP se está cerrando.",
                "error": "Módulo NLP cerrándose",
                "user_name": None,
                "preference_key": None,
                "preference_value": None,
                "is_owner": False
            }

        if not prompt or not prompt.strip():
            return {
                "response": "El prompt no puede estar vacío.",
                "error": "Prompt vacío",
                "user_name": None,
                "preference_key": None,
                "preference_value": None,
                "is_owner": False
            }

        # Detectar negaciones ANTES de procesar
        if self._contains_negation(prompt):
            logger.info(f"Negación detectada en prompt: '{prompt}'. No se procesarán comandos IoT.")

        if not self.is_online():
            try:
                await self.reload()
                if not self.is_online():
                    return {
                        "response": "El módulo NLP está fuera de línea.",
                        "error": "Módulo NLP fuera de línea",
                        "user_name": None,
                        "preference_key": None,
                        "preference_value": None,
                        "is_owner": False
                    }
            except Exception as e:
                return {
                    "response": f"El módulo NLP está fuera de línea: {e}",
                    "error": "Módulo NLP fuera de línea",
                    "user_name": None,
                    "preference_key": None,
                    "preference_value": None,
                    "is_owner": False
                }

        if user_id is None:
            return {
                "response": "user_id es requerido para consultas NLP.",
                "error": "user_id es requerido",
                "user_name": None,
                "preference_key": None,
                "preference_value": None,
                "is_owner": False
            }
        
        async with get_db() as db:
            user_task = asyncio.create_task(self._validate_user(user_id))
            iot_commands_task = asyncio.create_task(self._load_iot_commands())
            
            await asyncio.gather(user_task, iot_commands_task)
            
            db_user, user_name, is_owner, user_permissions_str, user_preferences_dict = user_task.result()
            formatted_iot_commands, iot_command_names, iot_error = iot_commands_task.result()
            
            # Solo cargar historial si es necesario
            formatted_conversation_history = ""
            if self._should_load_conversation_history(prompt):
                formatted_conversation_history = await self._memory_manager.get_conversation_logs_by_user_id(db, user_id, limit=5)
                logger.debug("Historial de conversación cargado (detectada palabra clave)")
            
            if not db_user:
                return {
                    "response": "Usuario no autorizado o no encontrado.",
                    "error": "Usuario no autorizado o no encontrado.",
                    "user_name": None,
                    "preference_key": None,
                    "preference_value": None,
                    "is_owner": False
                }

            if iot_error:
                return {
                    "response": iot_error,
                    "error": iot_error,
                    "user_name": user_name,
                    "preference_key": None,
                    "preference_value": None,
                    "is_owner": False
                }

            search_results_str = ""
            extracted_command = None
            
            # Mejorar prompt con contexto de dispositivo anterior
            enhanced_prompt = self._enhance_prompt_with_context(user_id, prompt)

            system_prompt, prompt_text = create_system_prompt(
                config=self._config,
                user_name=user_name,
                is_owner=is_owner,
                user_permissions_str=user_permissions_str,
                formatted_iot_commands=formatted_iot_commands,
                iot_command_names=iot_command_names,
                search_results_str=search_results_str,
                user_preferences_dict=user_preferences_dict,
                prompt=enhanced_prompt,
                conversation_history=formatted_conversation_history,
                system_prompt_template=self._system_prompt_template
            )

            full_response_content, llm_error = await self._get_llm_response(system_prompt, prompt_text)
            
            if llm_error:
                return {
                    "response": llm_error,
                    "error": llm_error,
                    "user_name": user_name,
                    "preference_key": None,
                    "preference_value": None,
                    "is_owner": False
                }
            
            # Procesar memory_search y MOSTRAR resultados
            full_response_content = await self._process_memory_search(db, user_id, full_response_content)

            # Procesar cambios de nombre
            full_response_content = await self._process_name_change(db, full_response_content, user_id)
            
            # Procesar preferencias
            full_response_content = await self._user_manager.handle_preference_setting(db, db_user, full_response_content)
            
            # Limpiar marcadores restantes
            full_response_content = PREFERENCE_MARKERS_REGEX.sub("", full_response_content).strip()
            
            response_for_memory = full_response_content
            
            # Obtener comandos IoT para detección de ambigüedad
            _, iot_commands_db = await self._iot_command_processor.load_commands_from_db(db)
            
            # Solo procesar comando IoT si NO hay negación
            if not self._contains_negation(prompt):
                # Procesar con throttling y detección de ambigüedad
                full_response_content, extracted_command = await self._process_iot_command(
                    db, full_response_content, token, user_id, iot_commands_db
                )
                
                # Actualizar contexto con el comando ejecutado
                self._update_device_context(user_id, prompt, extracted_command)
            else:
                logger.info("Comando IoT no procesado debido a negación en prompt")
                full_response_content = re.sub(IOT_COMMAND_REGEX, "", full_response_content).strip()
            
            # Actualizar memoria (solo si no es usuario especial)
            if user_id != 0:
                try:
                    await self._user_manager.update_memory(db, user_id, prompt, response_for_memory)
                except Exception as e:
                    logger.error(f"Error al actualizar memoria: {e}")
                    return {
                        "response": f"Error interno al actualizar la memoria: {e}",
                        "error": str(e),
                        "user_name": user_name,
                        "preference_key": None,
                        "preference_value": None,
                        "is_owner": False
                    }

            return {
                "identified_speaker": user_name or "Desconocido",
                "response": full_response_content,
                "command": extracted_command,
                "user_name": user_name,
                "preference_key": None,
                "preference_value": None,
                "is_owner": is_owner
            }

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
        