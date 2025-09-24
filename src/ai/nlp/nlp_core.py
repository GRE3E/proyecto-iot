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
from src.db.models import UserMemory, User, Permission, IoTCommand, Preference # Importar IoTCommand y Preference
import src.db.models as models # Importar el módulo models
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
                "language": "es",
                "capabilities": ["control_luces", "control_temperatura", "control_dispositivos", "consulta_estado"],
                "model": {
                    "name": "mistral:7b-instruct",
                    "temperature": 0.7,
                    "max_tokens": 150
                },
                "memory_size": 10,

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
    
    async def generate_response(self, prompt: str, user_name: Optional[str] = None, is_owner: bool = False) -> Optional[dict]:
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
        user_preferences_str = ""
        if user_name:
            db_user = db.query(User).filter(User.nombre == user_name).first()
            if db_user:
                db.expire(db_user) # Expire the object to ensure fresh data is loaded
                db.refresh(db_user)
                permissions = [up.permission.name for up in db_user.permissions]
                user_permissions_str = ", ".join(permissions)

                # Cargar preferencias del usuario
                user_preferences = db.query(Preference).filter(Preference.user_id == db_user.id).all()
                if user_preferences:
                    user_preferences_str = ", ".join([f"{p.key}: {p.value}" for p in user_preferences])
                else:
                    user_preferences_str = "No hay preferencias de usuario registradas."

        # Fetch IoTCommand objects from the database
        iot_commands_db = db.query(models.IoTCommand).all()
        
        # Format IoT commands for the system prompt
        formatted_iot_commands = ""
        if iot_commands_db:
            for cmd in iot_commands_db:
                formatted_iot_commands += f"- {cmd.command_payload}: {cmd.description}\n"
        else:
            formatted_iot_commands = "No hay comandos IoT registrados."
            
        # Combine config capabilities with IoTCommand names for the capabilities section
        all_capabilities = self._config['capabilities'] + [cmd.name for cmd in iot_commands_db]
        
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            assistant_name=self._config['assistant_name'],
            language=self._config['language'],
            capabilities='\n'.join(f'- {cap}' for cap in all_capabilities),
            iot_commands=formatted_iot_commands,
            last_interaction=memory_db.last_interaction.isoformat() if memory_db.last_interaction else "No hay registro de interacciones previas.",
            device_states=memory_db.device_states if memory_db.device_states else "No hay estados de dispositivos registrados.",
            user_preferences=user_preferences_str, # Usar las preferencias cargadas dinámicamente
            identified_speaker=user_name if user_name else "Desconocido",
            is_owner=is_owner,
            user_permissions=user_permissions_str,
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
                    serial_command_match = re.search(r"serial_command:\s*(.+)", full_response_content)
                    mqtt_publish_match = re.search(r"mqtt_publish:\s*([^,]+),\s*(.+)", full_response_content)

                    # Lógica para detectar y guardar preferencias del usuario
                    preference_match = re.search(r"preference_set:\s*([^,]+),\s*(.+)", full_response_content)
                    if preference_match and db_user:
                        pref_key = preference_match.group(1).strip()
                        pref_value = preference_match.group(2).strip()
                        
                        existing_preference = db.query(Preference).filter(
                            Preference.user_id == db_user.id,
                            Preference.key == pref_key
                        ).first()

                        if existing_preference:
                            existing_preference.value = pref_value
                            logging.info(f"Preferencia '{pref_key}' actualizada para el usuario '{db_user.nombre}': {pref_value}")
                        else:
                            new_preference = Preference(user_id=db_user.id, key=pref_key, value=pref_value)
                            db.add(new_preference)
                            logging.info(f"Nueva preferencia '{pref_key}' guardada para el usuario '{db_user.nombre}': {pref_value}")
                        db.commit()
                        db.refresh(db_user) # Refrescar el usuario para que las preferencias se actualicen en la sesión
                        full_response_content = full_response_content.split(preference_match.group(0))[0].strip()
                        if not full_response_content:
                            full_response_content = f"Entendido, he guardado tu preferencia de {pref_key} como {pref_value}."

                    # Inicializar variables para comandos IoT
                    identified_serial_command = None
                    identified_mqtt_topic = None
                    identified_mqtt_payload = None

                    if self.serial_manager and serial_command_match:
                        iot_command_attempted = True
                        command_to_send = serial_command_match.group(1).strip()
                        identified_serial_command = command_to_send # Guardar el comando serial identificado

                        if is_owner:
                            logging.info(f"Usuario propietario. Enviando comando serial directamente: {command_to_send}")
                            self.serial_manager.send_command(command_to_send)
                            full_response_content = full_response_content.split(serial_command_match.group(0))[0].strip()
                        else:
                            # Obtener el objeto IoTCommand para verificar sus permisos
                            iot_command_obj = db.query(IoTCommand).filter(IoTCommand.command_payload == command_to_send).first()

                            if iot_command_obj:
                                required_permissions = [p.name for p in iot_command_obj.permissions]
                                has_iot_permission = False
                                if db_user:
                                    for req_perm in required_permissions:
                                        if db_user.has_permission(req_perm):
                                            has_iot_permission = True
                                            break

                                if not has_iot_permission:
                                    full_response_content = f"Lo siento {user_name}, no tienes permiso para ejecutar el comando '{command_to_send}'."
                                else:
                                    logging.info(f"Enviando comando serial: {command_to_send}")
                                    self.serial_manager.send_command(command_to_send)
                                    # Eliminar el prefijo 'serial_command:COMMAND' de la respuesta conversacional
                                    full_response_content = full_response_content.split(serial_command_match.group(0))[0].strip()
                            else:
                                logging.warning(f"Comando IoT '{command_to_send}' no encontrado en la base de datos.")
                                full_response_content = f"Lo siento, el comando '{command_to_send}' no está registrado o no tiene permisos asociados."

                    elif self.mqtt_client and mqtt_publish_match:
                        iot_command_attempted = True
                        topic = mqtt_publish_match.group(1).strip()
                        payload = mqtt_publish_match.group(2).strip()
                        mqtt_command_identifier = topic  # Usar el tópico como identificador para buscar el comando IoT
                        identified_mqtt_topic = topic # Guardar el tópico MQTT identificado
                        identified_mqtt_payload = payload # Guardar el payload MQTT identificado
                            
                        # Obtener el objeto IoTCommand para verificar sus permisos
                        iot_command_obj = db.query(IoTCommand).filter(IoTCommand.mqtt_topic == mqtt_command_identifier).first() # Asumiendo que el tópico es único para un comando IoT

                        if iot_command_obj:
                            required_permissions = [p.name for p in iot_command_obj.permissions]
                            has_iot_permission = False
                            if db_user:
                                for req_perm in required_permissions:
                                    if db_user.has_permission(req_perm):
                                        has_iot_permission = True
                                        break
                            
                            if not is_owner and not has_iot_permission:
                                full_response_content = f"Lo siento {user_name}, no tienes permiso para publicar en el tópico '{topic}'."
                            else:
                                logging.info(f"Publicando MQTT en tópico '{topic}': {payload}")
                                self.mqtt_client.publish(topic, payload)
                                full_response_content = f"Mensaje MQTT publicado en {topic}. " + full_response_content.split(mqtt_publish_match.group(0))[0].strip()
                        else:
                            logging.warning(f"Comando MQTT para tópico '{topic}' no encontrado en la base de datos o sin permisos asociados.")
                            full_response_content = f"Lo siento, el comando MQTT para el tópico '{topic}' no está registrado o no tiene permisos asociados."
                    
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

                    self._memory_manager.update_memory(prompt, full_response_content, db, speaker_identifier=user_name)
                    return {
                        "identified_speaker": user_name if user_name else "Desconocido", 
                        "response": full_response_content,
                        "serial_command": identified_serial_command,
                        "mqtt_topic": identified_mqtt_topic,
                        "mqtt_payload": identified_mqtt_payload
                    }
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