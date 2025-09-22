import subprocess
import time
import logging
import os
import json
import sys
import asyncio
from typing import Optional
from datetime import datetime
from pathlib import Path
import asyncio.windows_events
import ollama
from src.ai.nlp.system_prompt import SYSTEM_PROMPT_TEMPLATE
from src.ai.nlp.ollama_manager import OllamaManager
from src.ai.nlp.memory_manager import MemoryManager
from src.db.models import UserMemory, User, Permission
from src.utils.datetime_utils import get_current_datetime, format_datetime
import re

# Configurar el registro de eventos
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class NLPModule:
    def __init__(self):
        """Inicializa la conexión con Ollama y carga la configuración."""
        self._config_path = Path(__file__).parent.parent / 'config' / 'config.json'
        self._load_config()
        self._ollama_manager = OllamaManager(self._config["model"])
        self._online = self._ollama_manager.is_online()
        self.serial_manager = None
        self.mqtt_client = None
        self._memory_manager = MemoryManager()

    def __del__(self):
        """Asegura que el proceso de Ollama se termine al cerrar la aplicación."""
        del self._ollama_manager

    def set_iot_managers(self, serial_manager, mqtt_client):
        self.serial_manager = serial_manager
        self.mqtt_client = mqtt_client
        logging.info("IoT managers set in NLPModule.")

    def _load_config(self):
        """Carga la configuración del asistente."""
        try:
            with open(self._config_path, 'r', encoding='utf-8') as f:
                self._config = json.load(f)
        except FileNotFoundError:
            self._config = {
                "assistant_name": "Murph",
                "owner_name": "Propietario",
                "language": "es",
                "capabilities": ["control_luces", "control_temperatura", "control_dispositivos", "consulta_estado"],
                "model": {
                    "name": "mistral:7b-instruct",
                    "temperature": 0.7,
                    "max_tokens": 150
                },
                "memory_size": 10,

                "owner_only_commands": ["LIGHT_ON", "SET_TEMPERATURE"],
                "timezone": "America/Lima" # Zona horaria por defecto
            }
            self._save_config()

    def _save_config(self):
        """Guarda la configuración actual."""
        os.makedirs(os.path.dirname(self._config_path), exist_ok=True)
        with open(self._config_path, 'w', encoding='utf-8') as f:
            json.dump(self._config, f, indent=4, ensure_ascii=False)

    def _check_connection(self) -> bool:
        """Verifica la conexión con Ollama y la disponibilidad del modelo."""
        return self._ollama_manager.is_online()
    
    def is_online(self) -> bool:
        """Devuelve True si el módulo responde, False si falla."""
        return self._ollama_manager.is_online()

    def reload(self):
        """Recarga la configuración y revalida la conexión."""
        self._load_config()
        self._ollama_manager.reload(self._config["model"])
        self._online = self._ollama_manager.is_online()
    
    async def generate_response(self, prompt: str, user_name: Optional[str] = None, is_owner: bool = False) -> Optional[str]:
        """Envía el prompt al modelo Ollama y devuelve la respuesta en texto."""
        if not prompt or not prompt.strip():
            logging.warning("El prompt no puede estar vacío.")
            return None

        if not self.is_online():
            logging.error("El módulo NLP no está en línea.")
            return None
            
        if os.name == 'nt':
            try:
                loop = asyncio.get_running_loop()
                if not isinstance(loop, asyncio.windows_events.SelectorEventLoop):
                    asyncio.set_event_loop_policy(asyncio.windows_events.WindowsSelectorEventLoopPolicy())
            except RuntimeError:
                asyncio.set_event_loop_policy(asyncio.windows_events.WindowsSelectorEventLoopPolicy())
            
        db = next(self._memory_manager.get_db())
        memory_db = self._memory_manager.get_user_memory(db)

        user_permissions_str = ""
        if user_name:
            db_user = db.query(User).filter(User.nombre == user_name).first()
            if db_user:
                permissions = [up.permission.name for up in db_user.permissions]
                user_permissions_str = ", ".join(permissions)

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            assistant_name=self._config['assistant_name'],
            language=self._config['language'],
            capabilities='\n'.join(f'- {cap}' for cap in self._config['capabilities']),
            last_interaction=memory_db.last_interaction.isoformat() if memory_db.last_interaction else "No hay registro de interacciones previas.",
            device_states=memory_db.device_states if memory_db.device_states else "No hay estados de dispositivos registrados.",
            user_preferences=memory_db.user_preferences if memory_db.user_preferences else "No hay preferencias de usuario registradas.",
            identified_speaker=user_name if user_name else "Desconocido",
            is_owner=is_owner,
            user_permissions=user_permissions_str,
            owner_name=self._config['owner_name'],
            current_datetime=format_datetime(get_current_datetime(self._config.get("timezone", "UTC")))
        )
            
        # Implementar mecanismo de reintento
        retries = 3
        for attempt in range(retries):
            try:
                prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
                
                client = ollama.AsyncClient(host='http://localhost:11434')
                response_stream = await client.chat(
                    model=self._config['model']['name'],
                    messages=[{'role': 'user', 'content': prompt_text}],
                    options={
                        "temperature": self._config['model']['temperature'],
                        "num_predict": self._config['model']['max_tokens']
                    },
                    stream=True
                )
                
                full_response_content = ""
                async for chunk in response_stream:
                    if 'content' in chunk['message']:
                        full_response_content += chunk['message']['content']
                
                if full_response_content:
                    # Inicializar una bandera para saber si se intentó enviar un comando IoT
                    iot_command_attempted = False
                    
                    # Lógica para enviar comandos IoT si la respuesta de la IA lo indica
                    if self.serial_manager and "serial_command:" in full_response_content:
                        iot_command_attempted = True
                        command_to_send = full_response_content.split("serial_command:")[1].strip()
                        if command_to_send in self._config.get("owner_only_commands", []) and not is_owner:
                            full_response_content = f"Lo siento {user_name}, no tienes permiso para ejecutar el comando '{command_to_send}'. Solo el propietario puede hacerlo."
                        else:
                            logging.info(f"Enviando comando serial: {command_to_send}")
                            self.serial_manager.send_command(command_to_send)
                            full_response_content = f"Comando serial enviado: {command_to_send}. " + full_response_content.split("serial_command:")[0].strip()
                    elif self.mqtt_client and "mqtt_publish:" in full_response_content:
                        iot_command_attempted = True
                        parts = full_response_content.split("mqtt_publish:")[1].strip().split(",", 1)
                        if len(parts) == 2:
                            topic = parts[0].strip()
                            payload = parts[1].strip()
                            # Asumimos que el topic o una parte del payload podría ser el "comando" para owner_only_commands
                            # Aquí se podría implementar una lógica más sofisticada para extraer el comando real
                            mqtt_command_identifier = topic # O alguna parte del payload
                            if mqtt_command_identifier in self._config.get("owner_only_commands", []) and not is_owner:
                                full_response_content = f"Lo siento {user_name}, no tienes permiso para publicar en el tópico '{topic}'. Solo el propietario puede hacerlo."
                            else:
                                logging.info(f"Publicando MQTT en tópico '{topic}': {payload}")
                                self.mqtt_client.publish(topic, payload)
                                full_response_content = f"Mensaje MQTT publicado en {topic}. " + full_response_content.split("mqtt_publish:")[0].strip()
                        else:
                            logging.warning(f"Formato de comando MQTT inválido: {full_response_content}")
                            full_response_content = "Lo siento, el formato del comando MQTT es inválido."
                    
                    # Si no se intentó enviar un comando IoT, o si se envió y el usuario tenía permiso,
                    # entonces la respuesta ya está formateada correctamente.
                    # Si se intentó enviar un comando IoT y el usuario no tenía permiso,
                    # la respuesta ya contiene el mensaje de denegación.

                    # Check for name change command in the prompt
                    name_change_pattern = r"(?:llámame|mi nombre es)\s+([A-Za-zÀ-ÿ]+)"
                    match = re.search(name_change_pattern, prompt, re.IGNORECASE)
                    
                    if match and user_name:
                        new_name = match.group(1).capitalize() # Capitalize the new name
                        db_session = next(self._memory_manager.get_db())
                        existing_user = db_session.query(User).filter(User.nombre == user_name).first()
                        if existing_user:
                            logging.info(f"Cambiando nombre de '{existing_user.nombre}' a '{new_name}' en la base de datos.")
                            existing_user.nombre = new_name
                            db_session.commit()
                            full_response_content = f"De acuerdo, a partir de ahora te llamaré {new_name}."
                        else:
                            logging.warning(f"No se encontró el usuario '{user_name}' para cambiar el nombre.")

                    self._memory_manager.update_memory(prompt, full_response_content, db)
                    return full_response_content
                else:
                    logging.warning("Ollama devolvió una respuesta vacía")
                
            except ollama.ResponseError as e:
                logging.error(f"Error de Ollama al generar respuesta (intento {attempt + 1}/{retries}): {e}")
            except Exception as e:
                logging.exception(f"Excepción al generar respuesta (intento {attempt + 1}/{retries}): {str(e)}")
                
            if attempt < retries - 1:
                await asyncio.sleep(2)
        
        logging.error("Se agotaron todos los intentos para generar respuesta")
        self._online = False
        return None