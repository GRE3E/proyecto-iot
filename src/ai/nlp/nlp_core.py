import subprocess
import json
import os
from typing import Optional
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.db.models import UserMemory, ConversationLog

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
                "capabilities": ["control_luces", "control_temperatura", "control_dispositivos", "consulta_estado"]
            }
            self._save_config()

    def _save_config(self):
        """Guarda la configuración actual."""
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
            result = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True)
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
    
    def is_online(self) -> bool:
        """Devuelve True si el módulo responde, False si falla."""
        return self._online

    def reload(self):
        """Recarga configuración y revalida conexión."""
        self._load_config()
        db = next(self._get_db())
        self._online = self._check_connection()
    
    def generate_response(self, prompt: str) -> Optional[str]:
        """Envía prompt al modelo Ollama y devuelve respuesta en texto."""
        if not self.is_online():
            return None
            
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
            
        try:
            prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
            options = {
                "temperature": self._config['model']['temperature'],
                "num_predict": self._config['model']['max_tokens']
            }
            options_str = json.dumps(options, ensure_ascii=False)
            os.environ['OLLAMA_OPTIONS'] = options_str
            
            cmd = [
                "ollama", "run",
                self._config['model']['name'],
                prompt_text
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', check=True)
            if result.returncode == 0 and result.stdout:
                response = result.stdout.strip()
                self._update_memory(prompt, response, db)
                return response
            return None
        except subprocess.CalledProcessError as e:
            error_msg = f"Error al generar respuesta:\n"
            error_msg += f"Comando: {' '.join(cmd)}\n"
            error_msg += f"Código de salida: {e.returncode}\n"
            error_msg += f"Salida de error: {e.stderr}"
            print(error_msg)
            self._online = False
            return None