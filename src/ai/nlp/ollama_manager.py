import subprocess
import time
import logging
import os
import ollama
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class OllamaManager:
    def __init__(self, model_config):
        self._ollama_process = None
        self._online = False
        self._model_config = model_config
        self._start_ollama_server()
        self._online = self._check_connection()

    def _start_ollama_server(self):
        """Inicia el servidor de Ollama como un subproceso si no está ya en ejecución."""
        try:
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
            self._ollama_process = subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            logging.info("Servidor de Ollama iniciado en segundo plano.")
            
            # Esperar a que el servidor esté listo
            for _ in range(30):  # Intentar durante 30 segundos
                try:
                    client = ollama.Client(host='http://localhost:11434')
                    client.list()
                    logging.info("Conexión con el servidor de Ollama establecida exitosamente.")
                    self._online = True
                    return
                except ollama.ResponseError:
                    time.sleep(1)  # Esperar 1 segundo antes de reintentar
            
            logging.error("Fallo al conectar con el servidor de Ollama después de iniciarlo en el tiempo esperado.")
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

    def _check_connection(self) -> bool:
        """Verifica la conexión con Ollama y la disponibilidad del modelo."""
        try:
            client = ollama.Client(host='http://localhost:11434')
            available_models = client.list()
            model_names = [m['name'] for m in available_models['models']]

            if self._model_config["name"] not in model_names:
                logging.error(f"Error: El modelo {self._model_config['name']} no está disponible.")
                logging.error("Modelos disponibles:")
                for model_name in model_names:
                    logging.error(f"- {model_name}")
                return False
                
            if not isinstance(self._model_config["temperature"], (int, float)) or \
               not 0 <= self._model_config["temperature"] <= 1:
                logging.error(f"Error: El valor de temperature debe estar entre 0 y 1")
                return False
                
            if not isinstance(self._model_config["max_tokens"], int) or \
               self._model_config["max_tokens"] <= 0:
                logging.error(f"Error: num_predict debe ser un número entero positivo")
                return False
                
            return True
        except ollama.ResponseError as e:
            logging.error(f"Error al conectar con Ollama: {e}")
            return False
        except Exception as e:
            logging.error(f"Error inesperado al verificar Ollama: {e}")
            return False

    def is_online(self) -> bool:
        """Devuelve True si el módulo responde, False si falla."""
        return self._online

    def reload(self, model_config):
        """Recarga la configuración y revalida la conexión."""
        self._model_config = model_config
        self._online = self._check_connection()