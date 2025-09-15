import subprocess
import json
import os
import asyncio
import logging
from typing import Optional
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.db.models import UserMemory, ConversationLog
import asyncio.windows_events # Importar para WindowsSelectorEventLoopPolicy

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class NLPModule:
    def __init__(self):
        """Inicializa la conexión con Ollama y carga la configuración."""
        self._config_path = Path(__file__).parent.parent / 'config' / 'config.json'
        self._load_config()
        self._online = self._check_connection()
        db = next(self._get_db())
        self._memory_db = db.query(UserMemory).first()
        if not self._memory_db:
            self._memory_db = UserMemory()
            db.add(self._memory_db)
            db.commit()
            db.refresh(self._memory_db)

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
        
        # Actualizar última interacción en memoria
        self._memory_db.last_interaction = timestamp
        self._memory_db = db.merge(self._memory_db) # Volver a adjuntar y obtener la instancia administrada
        db.commit()
        db.refresh(self._memory_db)
        
        # Guardar conversación en ConversationLog
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
            # Verificar que Ollama está instalado y en ejecución
            result = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True, timeout=10)
            if self._config["model"]["name"] not in result.stdout:
                print(f"Error: El modelo {self._config['model']['name']} no está disponible.")
                print("Modelos disponibles:")
                print(result.stdout)
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
                
            # Probar la configuración de OLLAMA_OPTIONS
            try:
                options = {
                    "temperature": self._config['model']['temperature'],
                    "num_predict": self._config['model']['max_tokens']
                }
                json.dumps(options, ensure_ascii=False)
            except (TypeError, ValueError) as e:
                print(f"Error al generar OLLAMA_OPTIONS: {str(e)}")
                return False
                
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error al verificar Ollama: {e.stderr}")
            return False
        except FileNotFoundError:
            print("Error: Ollama no está instalado o no se encuentra en el PATH")
            return False
        except subprocess.TimeoutExpired:
            print("Error: Timeout al verificar Ollama")
            return False
    
    def is_online(self) -> bool:
        """Devuelve True si el módulo responde, False si falla."""
        return self._online

    def reload(self):
        """Recarga configuración y revalida conexión."""
        self._load_config()
        db = next(self._get_db())
        self._online = self._check_connection()
    
    async def generate_response(self, prompt: str) -> Optional[str]:
        """Envía prompt al modelo Ollama y devuelve respuesta en texto."""
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
                asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            
        db = next(self._get_db())

        system_prompt = f"""Eres {self._config['assistant_name']}, un asistente de casa inteligente.
        El nombre del propietario de la casa es {self._config['owner_name']}.
        Tu función es ayudar a controlar dispositivos IoT, responder preguntas sobre el hogar y proporcionar información útil.

        Capacidades:
        {chr(10).join(f'- {cap}' for cap in self._config['capabilities'])}

        Contexto de memoria:
        - Última interacción: {self._memory_db.last_interaction.isoformat() if self._memory_db.last_interaction else None}
        - Estados de dispositivos: {self._memory_db.device_states}
        - Preferencias del usuario: {self._memory_db.user_preferences}
        - Historial de conversaciones: {json.dumps([{'prompt': c.prompt, 'response': c.response} for c in db.query(ConversationLog).order_by(ConversationLog.timestamp.desc()).limit(self._config['memory_size']).all()], ensure_ascii=False) if db.query(ConversationLog).count() > 0 else '[]'}

        Responde siempre en {self._config['language']} de manera amigable y concisa.
        Utiliza el contexto de memoria para proporcionar respuestas más personalizadas y coherentes.
        Recuerda que tu nombre es {self._config['assistant_name']}.
        Recuerda que el nombre del propietario de la casa es {self._config['owner_name']}.
        """
            
        # Implementar mecanismo de reintento
        retries = 3
        for attempt in range(retries):
            try:
                prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
                options = {
                    "temperature": self._config['model']['temperature'],
                    "num_predict": self._config['model']['max_tokens']
                }
                options_str = json.dumps(options, ensure_ascii=False)
                
                cmd = [
                    "ollama", "run",
                    self._config['model']['name'],
                    prompt_text
                ]
                
                logging.info(f"Ejecutando comando Ollama: ollama run {self._config['model']['name']} [prompt]")
                
                # SOLUCIÓN 1: Usar subprocess.run en lugar de asyncio.create_subprocess_exec
                # Esto funciona mejor en Windows y evita el problema de NotImplementedError
                try:
                    # Configurar variables de entorno
                    env = os.environ.copy()
                    env['OLLAMA_OPTIONS'] = options_str
                    
                    # Ejecutar el comando de forma sincrónica
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=30,  # Timeout de 30 segundos
                        env=env,
                        encoding='utf-8'
                    )
                    
                    logging.debug(f"Ollama stdout: {result.stdout}")
                    logging.debug(f"Ollama stderr: {result.stderr}")
                    
                    if result.returncode == 0 and result.stdout:
                        response = result.stdout.strip()
                        if response:  # Verificar que la respuesta no esté vacía
                            self._update_memory(prompt, response, db)
                            return response
                        else:
                            logging.warning("Ollama devolvió una respuesta vacía")
                    else:
                        error_msg = f"Error al generar respuesta (intento {attempt + 1}/{retries}):\n"
                        error_msg += f"Código de salida: {result.returncode}\n"
                        error_msg += f"Salida de error: {result.stderr}"
                        logging.error(error_msg)
                
                except subprocess.TimeoutExpired:
                    logging.error(f"Timeout al ejecutar Ollama (intento {attempt + 1}/{retries})")
                except subprocess.CalledProcessError as e:
                    logging.error(f"Error al ejecutar comando Ollama (intento {attempt + 1}/{retries}): {e}")
                except Exception as e:
                    logging.error(f"Error inesperado al ejecutar Ollama (intento {attempt + 1}/{retries}): {e}")
                
                if attempt < retries - 1:
                    await asyncio.sleep(2)  # Esperar antes de reintentar
                    
            except Exception as e:
                logging.exception(f"Excepción al generar respuesta (intento {attempt + 1}/{retries}): {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(2)  # Esperar antes de reintentar
        
        logging.error("Se agotaron todos los intentos para generar respuesta")
        self._online = False
        return None
    
    def generate_response_sync(self, prompt: str) -> Optional[str]:
        """Versión sincrónica de generate_response para casos donde no se puede usar async."""
        if not prompt or not prompt.strip():
            logging.warning("El prompt no puede estar vacío.")
            return None

        if not self.is_online():
            logging.error("El módulo NLP no está en línea.")
            return None
            
        db = next(self._get_db())

        system_prompt = f"""Eres {self._config['assistant_name']}, un asistente de casa inteligente.
        El nombre del propietario de la casa es {self._config['owner_name']}.
        Tu función es ayudar a controlar dispositivos IoT, responder preguntas sobre el hogar y proporcionar información útil.

        Capacidades:
        {chr(10).join(f'- {cap}' for cap in self._config['capabilities'])}

        Responde siempre en {self._config['language']} de manera amigable y concisa.
        Recuerda que tu nombre es {self._config['assistant_name']}.
        Recuerda que el nombre del propietario de la casa es {self._config['owner_name']}.
        """
            
        # Implementar mecanismo de reintento
        retries = 3
        for attempt in range(retries):
            try:
                prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
                options = {
                    "temperature": self._config['model']['temperature'],
                    "num_predict": self._config['model']['max_tokens']
                }
                options_str = json.dumps(options, ensure_ascii=False)
                
                cmd = [
                    "ollama", "run",
                    self._config['model']['name'],
                    prompt_text
                ]
                
                logging.info(f"Ejecutando comando Ollama sincrónico: ollama run {self._config['model']['name']} [prompt]")
                
                try:
                    # Configurar variables de entorno
                    env = os.environ.copy()
                    env['OLLAMA_OPTIONS'] = options_str
                    
                    # Ejecutar el comando
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=30,
                        env=env,
                        encoding='utf-8'
                    )
                    
                    if result.returncode == 0 and result.stdout:
                        response = result.stdout.strip()
                        if response:
                            self._update_memory(prompt, response, db)
                            return response
                        else:
                            logging.warning("Ollama devolvió una respuesta vacía")
                    else:
                        logging.error(f"Error en Ollama (intento {attempt + 1}/{retries}): {result.stderr}")
                
                except subprocess.TimeoutExpired:
                    logging.error(f"Timeout al ejecutar Ollama (intento {attempt + 1}/{retries})")
                except Exception as e:
                    logging.error(f"Error al ejecutar Ollama (intento {attempt + 1}/{retries}): {e}")
                
                if attempt < retries - 1:
                    import time
                    time.sleep(2)  # Esperar antes de reintentar
                    
            except Exception as e:
                logging.exception(f"Excepción al generar respuesta sincrónica (intento {attempt + 1}/{retries}): {str(e)}")
                if attempt < retries - 1:
                    import time
                    time.sleep(2)
        
        logging.error("Se agotaron todos los intentos para generar respuesta sincrónica")
        self._online = False
        return None