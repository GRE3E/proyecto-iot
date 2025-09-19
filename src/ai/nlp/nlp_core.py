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
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.db.models import UserMemory, ConversationLog
import asyncio.windows_events
import ollama
import time

# Configurar el registro de eventos
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class NLPModule:
    def __init__(self):
        """Inicializa la conexión con Ollama y carga la configuración."""
        self._config_path = Path(__file__).parent.parent / 'config' / 'config.json'
        self._load_config()
        self._ollama_process = None
        self._start_ollama_server()
        self._online = self._check_connection()
        self.serial_manager = None
        self.mqtt_client = None
        db = next(self._get_db())
        if not db.query(UserMemory).first():
            new_memory = UserMemory()
            db.add(new_memory)
            db.commit()
        db.close() # Cerrar explícitamente la sesión utilizada para la inicialización

    def _start_ollama_server(self):
        """Inicia el servidor de Ollama como un subproceso si no está ya en ejecución."""
        try:
            # Intentar conectar para ver si ya está en ejecución
            client = ollama.Client(host='http://localhost:11434')
            client.list()
            logging.info("El servidor de Ollama ya está en ejecución.")
            self._online = True
            return
        except ollama.ResponseError:
            logging.info("El servidor de Ollama no está en ejecución, intentando iniciarlo...")
        except Exception as e:
            logging.warning(f"Error al verificar el estado de Ollama: {e}. Intentando iniciar el servidor.")

        try:
            # Iniciar el servidor de Ollama en un subproceso
            self._ollama_process = subprocess.Popen(
                ["ollama", "serve"],
                stdout=sys.stdout,
                stderr=sys.stderr,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            logging.info("Servidor de Ollama iniciado en segundo plano.")
            time.sleep(5) 
            for _ in range(5):
                line = self._ollama_process.stdout.readline()
                if line:
                    logging.info(f"Ollama server output: {line.strip()}")
                else:
                    break
                if "Listening on" in line:
                    logging.info("Ollama server reportó que está escuchando.")
                    break
            
            time.sleep(5)
            
            # Verificar la conexión después de intentar iniciar
            if self._check_connection():
                logging.info("Conexión con el servidor de Ollama establecida exitosamente.")
                self._online = True
            else:
                logging.error("Fallo al conectar con el servidor de Ollama después de iniciarlo.")
                self._online = False

        except FileNotFoundError:
            logging.error("El comando 'ollama' no se encontró. Asegúrese de que Ollama esté instalado y en el PATH.")
            self._online = False
        except Exception as e:
            logging.error(f"Error al iniciar el servidor de Ollama: {e}")
            self._online = False

    def __del__(self):
        """Asegura que el proceso de Ollama se termine al cerrar la aplicación."""
        if self._ollama_process and self._ollama_process.poll() is None:
            logging.info("Terminando el proceso del servidor de Ollama...")
            self._ollama_process.terminate()
            self._ollama_process.wait(timeout=5)
            if self._ollama_process.poll() is None:
                self._ollama_process.kill()
            logging.info("Proceso del servidor de Ollama terminado.")

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
                "memory_size": 10
            }
            self._save_config()

    def _save_config(self):
        """Guarda la configuración actual."""
        os.makedirs(os.path.dirname(self._config_path), exist_ok=True)
        with open(self._config_path, 'w', encoding='utf-8') as f:
            json.dump(self._config, f, indent=4, ensure_ascii=False)

    def _get_db(self):
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def _update_memory(self, prompt: str, response: str, db: Session):
        """Actualiza la memoria y guarda el log de la conversación en la base de datos."""
        timestamp = datetime.now()
        
        # Obtener la instancia de UserMemory dentro de la sesión actual
        memory_db = db.query(UserMemory).first()
        if not memory_db:
            memory_db = UserMemory()
            db.add(memory_db)
            db.flush() 
        
        # Actualizar última interacción en memoria
        memory_db.last_interaction = timestamp
        db.commit()
        db.refresh(memory_db) 
        
        conversation = ConversationLog(
            timestamp=timestamp,
            prompt=prompt,
            response=response
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    def _check_connection(self) -> bool:
        """Verifica la conexión con Ollama y la disponibilidad del modelo."""
        try:
            client = ollama.Client(host='http://localhost:11434')
            available_models = client.list()
            model_names = [m['name'] for m in available_models['models']]

            if self._config["model"]["name"] not in model_names:
                print(f"Error: El modelo {self._config['model']['name']} no está disponible.")
                print("Modelos disponibles:")
                for model_name in model_names:
                    print(f"- {model_name}")
                return False
                
            # Validar los parámetros del modelo
            if not isinstance(self._config["model"]["temperature"], (int, float)) or \
               not 0 <= self._config["model"]["temperature"] <= 1:
                print(f"Error: El valor de temperature debe estar entre 0 y 1")
                return False
                
            if not isinstance(self._config["model"]["max_tokens"], int) or \
               self._config["model"]["max_tokens"] <= 0:
                print(f"Error: num_predict debe ser un número entero positivo")
                return False
                
            return True
        except ollama.ResponseError as e:
            print(f"Error al conectar con Ollama: {e}")
            return False
        except Exception as e:
            print(f"Error inesperado al verificar Ollama: {e}")
            return False
    
    def is_online(self) -> bool:
        """Devuelve True si el módulo responde, False si falla."""
        return self._online

    def reload(self):
        """Recarga la configuración y revalida la conexión."""
        self._load_config()
        self._online = self._check_connection()
    
    async def generate_response(self, prompt: str, identified_speaker: str = "Desconocido") -> Optional[str]:
        """Envía el prompt al modelo Ollama y devuelve la respuesta en texto."""
        if not prompt or not prompt.strip():
            logging.warning("El prompt no puede estar vacío.")
            return None

        if not self.is_online():
            logging.error("El módulo NLP no está en línea.")
            return None
            
        # Configurar la política de bucle de eventos para Windows si es necesario
        if os.name == 'nt':
            try:
                # Obtener el bucle actual
                loop = asyncio.get_running_loop()
                # Si no es WindowsSelectorEventLoop, configurarlo
                if not isinstance(loop, asyncio.windows_events.SelectorEventLoop):
                    asyncio.set_event_loop_policy(asyncio.windows_events.WindowsSelectorEventLoopPolicy())
            except RuntimeError:
                # No hay bucle en ejecución, configurar la política
                asyncio.set_event_loop_policy(asyncio.windows_events.WindowsSelectorEventLoopPolicy())
            
        db = next(self._get_db())

        # Recuperar UserMemory dentro de la sesión actual
        memory_db = db.query(UserMemory).first()
        if not memory_db:
            memory_db = UserMemory()
            db.add(memory_db)
            db.commit()
            db.refresh(memory_db)

        system_prompt = f"""Eres {self._config['assistant_name']}, un asistente de hogar inteligente avanzado, diseñado para interactuar de manera eficiente y segura con el usuario para controlar dispositivos IoT, ejecutar comandos específicos, y proporcionar información relevante sobre el entorno del hogar. Tu objetivo principal es ser proactivo, útil y conciso.

        **Directrices de Interacción:**
        1.  **Control de Dispositivos**: Cuando el usuario solicite una acción sobre un dispositivo (ej. "Enciende la luz de la sala", "Ajusta la temperatura a 22 grados"), tu respuesta debe ser una confirmación clara y concisa de la acción que vas a realizar. Por ejemplo: "De acuerdo, encendiendo la luz de la sala." o "Entendido, ajustando la temperatura a 22 grados." Si la acción implica un comando IoT directo, prepárate para generar el comando `serial_command:` o `mqtt_publish:`.
        2.  **Información y Preguntas**: Para preguntas sobre el estado del hogar o información general, proporciona respuestas directas y útiles, utilizando el contexto disponible.
        3.  **Clarificación**: Si no entiendes un comando o una pregunta, pide al usuario que lo reformule de manera educada y ofrece ejemplos si es posible.
        4.  **Prioridad**: Siempre prioriza la seguridad del usuario y la ejecución correcta de los comandos sobre las respuestas conversacionales extensas.
        5.  **Tono**: Responde siempre en {self._config['language']} de manera amigable, respetuosa y profesional.

        **Capacidades Disponibles (para referencia interna):**
        {chr(10).join(f'- {cap}' for cap in self._config['capabilities'])}

        **Contexto de Memoria del Usuario:**
        - Última interacción: {memory_db.last_interaction.isoformat() if memory_db.last_interaction else "No hay registro de interacciones previas."}
        - Estados de dispositivos conocidos: {memory_db.device_states if memory_db.device_states else "No hay estados de dispositivos registrados."}
        - Preferencias del usuario: {memory_db.user_preferences if memory_db.user_preferences else "No hay preferencias de usuario registradas."}
        - Hablante identificado: {identified_speaker}

        **Información del Asistente y Propietario:**
        - Tu nombre es {self._config['assistant_name']}.
        - El nombre del propietario de la casa es {self._config['owner_name']}.

        **Instrucciones Adicionales para la Generación de Respuesta:**
        - Mantén las respuestas lo más breves y directas posible, especialmente para confirmaciones de comandos.
        - Evita divagar o añadir información innecesaria.
        - Si una acción requiere un comando IoT, asegúrate de que tu respuesta final incluya el prefijo `serial_command:` o `mqtt_publish:` seguido del comando o tópico/payload, respectivamente, para que el sistema lo procese. Por ejemplo: `De acuerdo, encendiendo la luz. serial_command:LIGHT_ON` o `Publicando mensaje. mqtt_publish:home/lights/kitchen,ON`.
        """
            
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
                    response = full_response_content.strip()
                    # Lógica para enviar comandos IoT si la respuesta de la IA lo indica
                    if self.serial_manager and "serial_command:" in response:
                        command_to_send = response.split("serial_command:")[1].strip()
                        logging.info(f"Enviando comando serial: {command_to_send}")
                        self.serial_manager.send_command(command_to_send)
                        response = f"Comando serial enviado: {command_to_send}. " + response.split("serial_command:")[0].strip()
                    elif self.mqtt_client and "mqtt_publish:" in response:
                        parts = response.split("mqtt_publish:")[1].strip().split(",", 1)
                        if len(parts) == 2:
                            topic = parts[0].strip()
                            payload = parts[1].strip()
                            logging.info(f"Publicando MQTT en tópico '{topic}': {payload}")
                            self.mqtt_client.publish(topic, payload)
                            response = f"Mensaje MQTT publicado en {topic}. " + response.split("mqtt_publish:")[0].strip()
                        else:
                            logging.warning(f"Formato de comando MQTT inválido: {response}")

                    self._update_memory(prompt, response, db)
                    return response
                else:
                    logging.warning("Ollama devolvió una respuesta vacía")
                
            except ollama.ResponseError as e:
                logging.error(f"Error de Ollama al generar respuesta (intento {attempt + 1}/{retries}): {e}")
            except Exception as e:
                logging.exception(f"Excepción al generar respuesta (intento {attempt + 1}/{retries}): {str(e)}")
                
            if attempt < retries - 1:
                await asyncio.sleep(2)  # Esperar antes de reintentar
        
        logging.error("Se agotaron todos los intentos para generar respuesta")
        self._online = False
        return None
    
    def generate_response_sync(self, prompt: str, identified_speaker: str = "Desconocido") -> Optional[str]:
        """Versión sincrónica de generate_response para casos donde no se puede usar async."""
        if not prompt or not prompt.strip():
            logging.warning("El prompt no puede estar vacío.")
            return None

        if not self.is_online():
            logging.error("El módulo NLP no está en línea.")
            return None
            
        db = next(self._get_db())

        # Recuperar UserMemory dentro de la sesión actual
        memory_db = db.query(UserMemory).first()
        if not memory_db:
            memory_db = UserMemory()
            db.add(memory_db)
            db.commit()
            db.refresh(memory_db)

        system_prompt = f"""Eres {self._config['assistant_name']}, un asistente de hogar inteligente avanzado, diseñado para interactuar de manera eficiente y segura con el usuario para controlar dispositivos IoT, ejecutar comandos específicos, y proporcionar información relevante sobre el entorno del hogar. Tu objetivo principal es ser proactivo, útil y conciso.

        **Directrices de Interacción:**
        1.  **Control de Dispositivos**: Cuando el usuario solicite una acción sobre un dispositivo (ej. "Enciende la luz de la sala", "Ajusta la temperatura a 22 grados"), tu respuesta debe ser una confirmación clara y concisa de la acción que vas a realizar. Por ejemplo: "De acuerdo, encendiendo la luz de la sala." o "Entendido, ajustando la temperatura a 22 grados." Si la acción implica un comando IoT directo, prepárate para generar el comando `serial_command:` o `mqtt_publish:`.
        2.  **Información y Preguntas**: Para preguntas sobre el estado del hogar o información general, proporciona respuestas directas y útiles, utilizando el contexto disponible.
        3.  **Clarificación**: Si no entiendes un comando o una pregunta, pide al usuario que lo reformule de manera educada y ofrece ejemplos si es posible.
        4.  **Prioridad**: Siempre prioriza la seguridad del usuario y la ejecución correcta de los comandos sobre las respuestas conversacionales extensas.
        5.  **Tono**: Responde siempre en {self._config['language']} de manera amigable, respetuosa y profesional.

        **Capacidades Disponibles (para referencia interna):**
        {chr(10).join(f'- {cap}' for cap in self._config['capabilities'])}

        **Contexto de Memoria del Usuario:**
        - Última interacción: {memory_db.last_interaction.isoformat() if memory_db.last_interaction else "No hay registro de interacciones previas."}
        - Estados de dispositivos conocidos: {memory_db.device_states if memory_db.device_states else "No hay estados de dispositivos registrados."}
        - Preferencias del usuario: {memory_db.user_preferences if memory_db.user_preferences else "No hay preferencias de usuario registradas."}
        - Hablante identificado: {identified_speaker}

        **Información del Asistente y Propietario:**
        - Tu nombre es {self._config['assistant_name']}.
        - El nombre del propietario de la casa es {self._config['owner_name']}.

        **Instrucciones Adicionales para la Generación de Respuesta:**
        - Mantén las respuestas lo más breves y directas posible, especialmente para confirmaciones de comandos.
        - Evita divagar o añadir información innecesaria.
        - Si una acción requiere un comando IoT, asegúrate de que tu respuesta final incluya el prefijo `serial_command:` o `mqtt_publish:` seguido del comando o tópico/payload, respectivamente, para que el sistema lo procese. Por ejemplo: `De acuerdo, encendiendo la luz. serial_command:LIGHT_ON` o `Publicando mensaje. mqtt_publish:home/lights/kitchen,ON`.
        """
            
        # Implementar mecanismo de reintento
        retries = 3
        for attempt in range(retries):
            try:
                prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
                
                client = ollama.Client(host='http://localhost:11434')
                response_data = client.chat(
                    model=self._config['model']['name'],
                    messages=[{'role': 'user', 'content': prompt_text}],
                    options={
                        "temperature": self._config['model']['temperature'],
                        "num_predict": self._config['model']['max_tokens']
                    }
                )
                
                if response_data and 'message' in response_data and 'content' in response_data['message']:
                    response = response_data['message']['content'].strip()
                    if response:
                        # Lógica para enviar comandos IoT si la respuesta de la IA lo indica
                        if self.serial_manager and "serial_command:" in response:
                            command_to_send = response.split("serial_command:")[1].strip()
                            logging.info(f"Enviando comando serial: {command_to_send}")
                            self.serial_manager.send_command(command_to_send)
                            response = f"Comando serial enviado: {command_to_send}. " + response.split("serial_command:")[0].strip()
                        elif self.mqtt_client and "mqtt_publish:" in response:
                            parts = response.split("mqtt_publish:")[1].strip().split(",", 1)
                            if len(parts) == 2:
                                topic = parts[0].strip()
                                payload = parts[1].strip()
                                logging.info(f"Publicando MQTT en tópico '{topic}': {payload}")
                                self.mqtt_client.publish(topic, payload)
                                response = f"Mensaje MQTT publicado en {topic}. " + response.split("mqtt_publish:")[0].strip()
                            else:
                                logging.warning(f"Formato de comando MQTT inválido: {response}")

                        self._update_memory(prompt, response, db)
                        return response
                    else:
                        logging.warning("Ollama devolvió una respuesta vacía")
                else:
                    logging.warning("Ollama devolvió una respuesta inesperada o vacía")
                
            except ollama.ResponseError as e:
                logging.error(f"Error de Ollama al generar respuesta (intento {attempt + 1}/{retries}): {e}")
            except Exception as e:
                logging.exception(f"Excepción al generar respuesta (intento {attempt + 1}/{retries}): {str(e)}")
                
            if attempt < retries - 1:
                import time
                time.sleep(2)
        
        logging.error("Se agotaron todos los intentos para generar respuesta")
        self._online = False
        return None