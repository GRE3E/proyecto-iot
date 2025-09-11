import subprocess
from typing import Optional

class NLPModule:
    def __init__(self):
        """Inicializa la conexión con Ollama."""
        self._model = "mistral:7b-instruct"
        self._online = self._check_connection()
    
    def _check_connection(self) -> bool:
        """Verifica la conexión con Ollama."""
        try:
            result = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True)
            return "mistral:7b-instruct" in result.stdout
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def is_online(self) -> bool:
        """Devuelve True si el módulo responde, False si falla."""
        return self._online
    
    def generate_response(self, prompt: str) -> Optional[str]:
        """Envía prompt al modelo mistral:7b-instruct en Ollama y devuelve respuesta en texto."""
        if not self.is_online():
            return None
            
        system_prompt = """Eres un asistente de casa inteligente.
        Tu función es ayudar a controlar dispositivos IoT, responder preguntas sobre el hogar y proporcionar información útil.

        Capacidades:
        - Controlar luces, termostatos, cámaras de seguridad
        - Monitorear sensores de temperatura, humedad, movimiento
        - Gestionar rutinas y automatizaciones
        - Proporcionar información sobre el estado del hogar
        - Responder en español de manera amigable y concisa

        Siempre responde de forma útil, segura y orientada a la domótica.
        """
            
        try:
            cmd = ["ollama", "run", self._model, f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"]
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', check=True)
            if result.returncode == 0 and result.stdout:
                return result.stdout.strip()
            return None
        except subprocess.CalledProcessError as e:
            print(f"Error al generar respuesta: {str(e)}")
            self._online = False
            return None