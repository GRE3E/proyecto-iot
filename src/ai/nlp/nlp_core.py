import subprocess
import json
import os
from typing import Optional
from datetime import datetime
from pathlib import Path

class NLPModule:
    def __init__(self):
        """Inicializa la conexión con Ollama y carga la configuración."""
        self._config_path = Path(__file__).parent.parent / 'config' / 'config.json'
        self._memory_path = Path(__file__).parent.parent / 'config' / 'memory.json'
        self._logs_path = Path(__file__).parent.parent / 'logs'
        self._load_config()
        self._load_memory()
        self._load_conversations()
        self._online = self._check_connection()

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
                "memory_file": "memory.json",
                "memory_size": 100
            }
            self._save_config()

    def _save_config(self):
        """Guarda la configuración actual."""
        with open(self._config_path, 'w', encoding='utf-8') as f:
            json.dump(self._config, f, indent=4, ensure_ascii=False)

    def _load_memory(self):
        """Carga la memoria del asistente y el historial de conversaciones."""
        # Cargar memoria base
        try:
            with open(self._memory_path, 'r', encoding='utf-8') as f:
                self._memory = json.load(f)
        except FileNotFoundError:
            self._memory = {
                "device_states": {
                    "luces": {},
                    "temperatura": {},
                    "dispositivos": {}
                },
                "user_preferences": {},
                "last_interaction": None
            }
            self._save_memory()
        
        # Cargar historial de conversaciones
        self._load_conversations()

    def _load_conversations(self):
        """Carga el historial de conversaciones."""
        log_file = self._logs_path / 'logs_ai.json'
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                self._conversations = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self._conversations = []

    def _save_memory(self):
        """Guarda la memoria actual."""
        with open(self._memory_path, 'w', encoding='utf-8') as f:
            json.dump(self._memory, f, indent=4, ensure_ascii=False)

    def _update_memory(self, prompt: str, response: str):
        """Actualiza la memoria y guarda el log de la conversación."""
        timestamp = datetime.now()
        conversation = {
            "timestamp": timestamp.isoformat(),
            "prompt": prompt,
            "response": response
        }
        
        # Actualizar última interacción en memoria
        self._memory["last_interaction"] = timestamp.isoformat()
        self._save_memory()
        
        # Actualizar conversaciones en memoria
        self._conversations.append(conversation)
        self._conversations = self._conversations[-self._config["memory_size"]:]
        
        # Guardar conversaciones
        log_file = self._logs_path / 'logs_ai.json'
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(self._conversations, f, indent=2, ensure_ascii=False)
    
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
        """Recarga configuración y memoria, y revalida conexión."""
        self._load_config()
        self._load_memory()
        self._online = self._check_connection()
    
    def generate_response(self, prompt: str) -> Optional[str]:
        """Envía prompt al modelo Ollama y devuelve respuesta en texto."""
        if not self.is_online():
            return None
            
        system_prompt = f"""Eres {self._config['assistant_name']}, un asistente de casa inteligente.
        Tu función es ayudar a controlar dispositivos IoT, responder preguntas sobre el hogar y proporcionar información útil.

        Capacidades:
        {chr(10).join(f'- {cap}' for cap in self._config['capabilities'])}

        Contexto de memoria:
        - Última interacción: {self._memory['last_interaction']}
        - Estados de dispositivos: {json.dumps(self._memory['device_states'], ensure_ascii=False)}
        - Preferencias del usuario: {json.dumps(self._memory['user_preferences'], ensure_ascii=False)}
        - Historial de conversaciones: {json.dumps(self._conversations[-3:], ensure_ascii=False) if self._conversations else '[]'}

        Responde siempre en {self._config['language']} de manera amigable y concisa.
        Utiliza el contexto de memoria para proporcionar respuestas más personalizadas y coherentes.
        Recuerda que tu nombre es {self._config['assistant_name']}.
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
                self._update_memory(prompt, response)
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