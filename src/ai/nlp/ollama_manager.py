import subprocess
import time
import logging
import os
import ollama
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

from typing import Dict, Any

class OllamaManager:
    """
    Gestiona el ciclo de vida del servidor Ollama y la conectividad del modelo.
    """
    def __init__(self, model_config: Dict[str, Any]):
        """
        Inicializa OllamaManager, intentando iniciar el servidor Ollama y verificar la conexión.

        Args:
            model_config (Dict[str, Any]): Configuración del modelo Ollama, incluyendo nombre, temperatura y max_tokens.
        """
        self._ollama_process: Optional[subprocess.Popen] = None
        self._online: bool = False
        self._model_config: Dict[str, Any] = model_config
        self._start_ollama_server()
        self._online = self._check_connection()

    def _start_ollama_server(self, retries: int = 30, delay: int = 1):
        """
        Inicia el servidor de Ollama como un subproceso si no está ya en ejecución.
        Implementa un mecanismo de reintento para esperar a que el servidor esté listo.

        Args:
            retries (int): Número de intentos para conectar con el servidor.
            delay (int): Retraso en segundos entre intentos.
        """
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
            
            for attempt in range(retries):
                try:
                    client = ollama.Client(host='http://localhost:11434')
                    client.list()
                    logging.info("Conexión con el servidor de Ollama establecida exitosamente.")
                    self._online = True
                    return
                except ollama.ResponseError:
                    logging.debug(f"Intento {attempt + 1}/{retries}: Servidor Ollama aún no disponible. Reintentando en {delay}s...")
                    time.sleep(delay)
            
            logging.error("Fallo al conectar con el servidor de Ollama después de iniciarlo en el tiempo esperado.")
            self._online = False

        except FileNotFoundError:
            logging.error("El comando 'ollama' no se encontró. Asegúrese de que Ollama esté instalado y en el PATH.")
            self._online = False
        except Exception as e:
            logging.error(f"Error inesperado al iniciar el servidor de Ollama: {e}")
            self._online = False

    def __del__(self):
        """
        Asegura que el proceso de Ollama se termine al cerrar la aplicación.
        """
        self.close()

    def close(self):
        """
        Termina explícitamente el proceso del servidor de Ollama si está en ejecución.
        """
        if self._ollama_process and self._ollama_process.poll() is None:
            logging.info("Terminando el proceso del servidor de Ollama...")
            try:
                self._ollama_process.terminate()
                self._ollama_process.wait(timeout=5)
                if self._ollama_process.poll() is None:
                    self._ollama_process.kill()
                logging.info("Proceso del servidor de Ollama terminado.")
            except Exception as e:
                logging.error(f"Error al intentar terminar el proceso de Ollama: {e}")

    def _check_connection(self) -> bool:
        """
        Verifica la conexión con Ollama y la disponibilidad del modelo configurado.
        También valida los parámetros de configuración del modelo.

        Returns:
            bool: True si la conexión es exitosa y el modelo está disponible, False en caso contrario.
        """
        try:
            client = ollama.Client(host='http://localhost:11434')
            available_models = client.list()
            model_names = [m['name'] for m in available_models.get('models', [])]

            model_name = self._model_config.get("name")
            if not model_name or model_name not in model_names:
                logging.error(f"Error: El modelo '{model_name}' no está disponible.")
                logging.error("Modelos disponibles: " + ", ".join(model_names) if model_names else "Ninguno.")
                return False
                
            temperature = self._model_config.get("temperature")
            if not isinstance(temperature, (int, float)) or not (0 <= temperature <= 1):
                logging.error(f"Error: El valor de 'temperature' ({temperature}) debe ser un número entre 0 y 1.")
                return False
                
            max_tokens = self._model_config.get("max_tokens")
            if not isinstance(max_tokens, int) or max_tokens <= 0:
                logging.error(f"Error: El valor de 'max_tokens' ({max_tokens}) debe ser un número entero positivo.")
                return False
                
            return True
        except ollama.ResponseError as e:
            logging.error(f"Error de respuesta de Ollama al verificar la conexión: {e}")
            return False
        except ConnectionError as e:
            logging.error(f"Error de conexión con el servidor Ollama: {e}")
            return False
        except Exception as e:
            logging.error(f"Error inesperado al verificar la conexión de Ollama: {e}")
            return False

    def is_online(self) -> bool:
        """
        Indica si el módulo Ollama está en línea y listo para usarse.

        Returns:
            bool: True si el módulo está en línea, False en caso contrario.
        """
        return self._online

    def reload(self, model_config: Dict[str, Any]):
        """
        Recarga la configuración del modelo y revalida la conexión con Ollama.

        Args:
            model_config (Dict[str, Any]): La nueva configuración del modelo Ollama.
        """
        logging.info("Recargando configuración de Ollama y revalidando conexión...")
        self._model_config = model_config
        self._online = self._check_connection()
        if self._online:
            logging.info("Ollama recargado y en línea.")
        else:
            logging.warning("Ollama recargado pero no está en línea. Verifique la configuración y el servidor.")