import subprocess
import time
import logging
import os
import inspect
import threading
import ollama
from ollama import AsyncClient
from typing import Dict, Any, Optional

logger = logging.getLogger("OllamaManager")

class OllamaManager:
    """
    Gestiona el ciclo de vida del servidor Ollama y la conectividad del modelo.
    """
    _GLOBAL_ASYNC_CLIENT: Optional[AsyncClient] = None
    _CLIENT_INIT_LOCK = threading.Lock()

    def __init__(self, model_config: Dict[str, Any], ollama_host: str = 'http://localhost:11434', start_server: bool = True):
        """
        Inicializa OllamaManager, intentando iniciar el servidor Ollama y verificar la conexión.

        Args:
            model_config (Dict[str, Any]): Configuración del modelo Ollama, incluyendo nombre, temperatura y max_tokens.
            ollama_host (str): La URL del host de Ollama. Por defecto es 'http://localhost:11434'.
            start_server (bool): Si True, intenta iniciar el servidor Ollama si no está corriendo.
                Si False, omite el arranque y solo verifica la conexión contra un servidor existente.
        """
        self._ollama_process: Optional[subprocess.Popen] = None
        self._online: bool = False
        self._model_config: Dict[str, Any] = model_config
        self._model_name: Optional[str] = model_config.get("name")
        self._ollama_host: str = ollama_host
        self._async_client: Optional[AsyncClient] = None
        if start_server:
            logger.debug("Iniciando Ollama server...")
            self._start_ollama_server()
        else:
            logger.debug("Omitiendo inicio de servidor Ollama (start_server=False).")
        logger.debug("Verificando conexión a Ollama...")
        self._online = self._check_connection()

        if self._online:
            with OllamaManager._CLIENT_INIT_LOCK:
                if OllamaManager._GLOBAL_ASYNC_CLIENT is None:
                    OllamaManager._GLOBAL_ASYNC_CLIENT = AsyncClient(host=self._ollama_host)
            self._async_client = OllamaManager._GLOBAL_ASYNC_CLIENT
            logger.info("OllamaManager inicializado y en línea.")

        else:
            logger.warning("OllamaManager inicializado pero no está en línea.")

    def _start_ollama_server(self, retries: int = 30, delay: int = 1):
        """
        Inicia el servidor de Ollama como un subproceso si no está ya en ejecución.
        Implementa un mecanismo de reintento para esperar a que el servidor esté listo.

        Args:
            retries (int): Número de intentos para conectar con el servidor.
            delay (int): Retraso en segundos entre intentos.
        """
        logger.debug("Intentando verificar si el servidor Ollama ya está en ejecución.")

        try:
            client = ollama.Client(host=self._ollama_host)
            client.list()
            logger.info("El servidor de Ollama ya está en ejecución.")
            self._online = True
            return

        except ollama.ResponseError:
            logger.info("El servidor de Ollama no está en ejecución, intentando iniciarlo...")

        except Exception as e:
            logger.warning(f"Error al verificar el estado de Ollama: {e}. Intentando iniciar el servidor.")

        try:
            self._ollama_process = subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            logger.info("Servidor de Ollama iniciado en segundo plano.")
            time.sleep(1) 

            if self._ollama_process.poll() is not None:
                stdout, stderr = self._ollama_process.communicate()

                if stdout:
                    logger.error(f"Ollama server stdout (early exit): {stdout.strip()}")

                if stderr:
                    logger.error(f"Ollama server stderr (early exit): {stderr.strip()}")
                logger.error(f"El proceso de Ollama terminó inesperadamente con código {self._ollama_process.returncode} justo después de iniciar.")
                self._online = False
                return

            for attempt in range(retries):

                try:
                    client = ollama.Client(host=self._ollama_host)
                    client.list()
                    logger.info("Conexión con el servidor de Ollama establecida exitosamente.")
                    self._online = True
                    return

                except ollama.ResponseError:
                    logger.debug(f"Intento {attempt + 1}/{retries}: Servidor Ollama aún no disponible. Reintentando en {delay}s...")
                    time.sleep(delay)
            logger.error("Fallo al conectar con el servidor de Ollama después de iniciarlo en el tiempo esperado.")
            self._online = False

        except FileNotFoundError:
            logger.error("El comando 'ollama' no se encontró. Asegúrese de que Ollama esté instalado y en el PATH.")
            self._online = False

        except Exception as e:
            logger.error(f"Error inesperado al iniciar el servidor de Ollama: {e}")
            self._online = False

    def __del__(self):
        """
        Evita realizar operaciones de E/S durante la recolección.
        Los recursos deben cerrarse explícitamente mediante el método asíncrono `close()`.
        """
        try:
            logger.debug("__del__ llamado en OllamaManager; cierre explícito recomendado con close().")
        except Exception:
            # Evitar cualquier I/O o excepción durante recolección
            pass

    async def close(self):
        """
        Cierra de forma asíncrona el cliente global de Ollama y termina explícitamente
        el proceso del servidor si fue iniciado por esta instancia.
        También lee y registra la salida del proceso para depuración.
        """
        if self._async_client:
            try:
                close_method = None
                if hasattr(self._async_client, "close"):
                    close_method = getattr(self._async_client, "close")
                elif hasattr(self._async_client, "aclose"):
                    close_method = getattr(self._async_client, "aclose")

                if close_method is not None:
                    if inspect.iscoroutinefunction(close_method):
                        await close_method()
                    else:
                        close_method()
                    logger.info("AsyncClient de Ollama cerrado correctamente.")
                else:
                    logger.debug("El AsyncClient de Ollama no expone métodos de cierre.")
            except Exception as e:
                logger.error(f"Error al cerrar el cliente asíncrono de Ollama: {e}")
            finally:
                OllamaManager._GLOBAL_ASYNC_CLIENT = None
                self._async_client = None

        if self._ollama_process and self._ollama_process.poll() is None:
            logger.info("Terminando el proceso del servidor de Ollama...")

            try:
                self._ollama_process.terminate()
                self._ollama_process.wait(timeout=5)
                stdout, stderr = self._ollama_process.communicate()

                if stdout:
                    logger.debug(f"Ollama stdout: {stdout.strip()}")

                if stderr:
                    logger.error(f"Ollama stderr: {stderr.strip()}")

                if self._ollama_process.poll() is None:
                    logger.warning("El proceso de Ollama no terminó, forzando el cierre...")
                    self._ollama_process.kill()
                    self._ollama_process.wait()

                if self._ollama_process.returncode is not None:
                    logger.info(f"Proceso del servidor de Ollama terminado con código {self._ollama_process.returncode}.")

                else:
                    logger.error("El proceso de Ollama no se pudo terminar correctamente.")

            except subprocess.TimeoutExpired:
                logger.warning("El proceso de Ollama no terminó a tiempo, forzando el cierre...")
                self._ollama_process.kill()
                self._ollama_process.wait()
                stdout, stderr = self._ollama_process.communicate()

                if stdout:
                    logger.debug(f"Ollama stdout (después de kill): {stdout.strip()}")

                if stderr:
                    logger.error(f"Ollama stderr (después de kill): {stderr.strip()}")

                if self._ollama_process.returncode is not None:
                    logger.info(f"Proceso del servidor de Ollama terminado con código {self._ollama_process.returncode} (forzado).")
                
                else:
                    logger.error("El proceso de Ollama no se pudo terminar correctamente incluso con kill.")
            
            except Exception as e:
                logger.error(f"Error inesperado al intentar terminar el proceso de Ollama: {e}")
            
            finally:
                self._ollama_process = None
        
        elif self._ollama_process and self._ollama_process.poll() is not None:
            logger.info("El proceso de Ollama ya había terminado.")
            self._ollama_process = None

    def _check_connection(self) -> bool:
        """
        Verifica la conexión con Ollama y la disponibilidad del modelo configurado.
        También valida los parámetros de configuración del modelo.

        Returns:
            bool: True si la conexión es exitosa y el modelo está disponible, False en caso contrario.
        """
        logger.debug("Realizando verificación de conexión y modelo Ollama.")
        
        try:
            client = ollama.Client(host=self._ollama_host)
            available_models = client.list()
            model_names = [m['name'] for m in available_models.get('models', [])]
            logger.debug(f"Modelos Ollama disponibles: {', '.join(model_names)}")

            if not self._model_name or self._model_name not in model_names:
                logger.error(f"Error: El modelo '{self._model_name}' no está disponible en {self._ollama_host}.")
                logger.error("Modelos disponibles: " + ", ".join(model_names) if model_names else "Ninguno.")
                return False
                
            temperature = self._model_config.get("temperature")
            if not isinstance(temperature, (int, float)) or not (0 <= temperature <= 1):
                logger.error(f"Error: El valor de 'temperature' ({temperature}) debe ser un número entre 0 y 1.")
                return False
                
            max_tokens = self._model_config.get("max_tokens")
            if not isinstance(max_tokens, int) or max_tokens <= 0:
                logger.error(f"Error: El valor de 'max_tokens' ({max_tokens}) debe ser un número entero positivo.")
                return False
            
            top_p = self._model_config.get("top_p")
            if top_p is not None and (not isinstance(top_p, (int, float)) or not (0 <= top_p <= 1)):
                logger.error(f"Error: El valor de 'top_p' ({top_p}) debe ser un número entre 0 y 1.")
                return False

            top_k = self._model_config.get("top_k")
            if top_k is not None and (not isinstance(top_k, int) or top_k < 0):
                logger.error(f"Error: El valor de 'top_k' ({top_k}) debe ser un número entero no negativo.")
                return False

            repeat_penalty = self._model_config.get("repeat_penalty")
            if repeat_penalty is not None and (not isinstance(repeat_penalty, (int, float)) or repeat_penalty < 0):
                logger.error(f"Error: El valor de 'repeat_penalty' ({repeat_penalty}) debe ser un número no negativo.")
                return False

            num_ctx = self._model_config.get("num_ctx")
            if num_ctx is not None and (not isinstance(num_ctx, int) or num_ctx <= 0):
                logger.error(f"Error: El valor de 'num_ctx' ({num_ctx}) debe ser un número entero positivo.")
                return False
            
            logger.info(f"Conexión Ollama y modelo '{self._model_name}' verificados exitosamente.")
            return True

        except ollama.ResponseError as e:
            logger.error(f"Error de respuesta de Ollama al verificar la conexión en {self._ollama_host}: {e}")
            return False

        except ConnectionError as e:
            logger.error(f"Error de conexión con el servidor Ollama en {self._ollama_host}: {e}")
            return False

        except KeyError:
            logger.error("La clave 'models' no se encontró en la respuesta de Ollama.")
            return False

        except Exception as e:
            logger.error(f"Error inesperado al verificar la conexión de Ollama en {self._ollama_host}: {e}")
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
        logger.info("Recargando configuración de Ollama y revalidando conexión...")
        self._model_config = model_config
        self._model_name = model_config.get("name")
        self._online = self._check_connection()
        
        if self._online:
            with OllamaManager._CLIENT_INIT_LOCK:
                if OllamaManager._GLOBAL_ASYNC_CLIENT is None:
                    OllamaManager._GLOBAL_ASYNC_CLIENT = AsyncClient(host=self._ollama_host)
            self._async_client = OllamaManager._GLOBAL_ASYNC_CLIENT
            logger.info("Ollama recargado y en línea.")
        
        else:
            logger.warning("Ollama recargado pero no está en línea. Verifique la configuración y el servidor.")

    def get_async_client(self) -> AsyncClient:
        """
        Devuelve la instancia del cliente asíncrono de Ollama.
        """
        
        if not self._async_client:
            
            raise RuntimeError("El cliente asíncrono de Ollama no ha sido inicializado. Asegúrate de que el servidor Ollama esté corriendo y la conexión se haya establecido correctamente.")
        
        return self._async_client

    async def generate_stateless(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Genera una respuesta del modelo en modo completamente stateless.

        No mantiene ninguna sesión, historial o contexto entre llamadas,
        garantizando aislamiento por usuario/hilo.

        Args:
            prompt (str): Prompt del usuario a enviar al modelo.
            system_prompt (Optional[str]): Instrucción de sistema opcional para la llamada.

        Returns:
            str: Texto de respuesta generado por el modelo.

        Raises:
            RuntimeError: Si el cliente asíncrono no está inicializado o no hay conexión.
            Exception: Propaga errores de Ollama en caso de fallo de generación.
        """
        if not self._online or not self._async_client:
            logger.error("Intento de generación stateless sin cliente en línea.")
            raise RuntimeError("OllamaManager no está en línea o el AsyncClient no está inicializado.")

        options: Dict[str, Any] = {}
        for key in ("temperature", "max_tokens", "top_p", "top_k", "repeat_penalty", "num_ctx"):
            val = self._model_config.get(key)
            if val is not None:
                options[key] = val

        kwargs: Dict[str, Any] = {
            "model": self._model_name,
            "prompt": prompt,
        }

        try:
            sig = inspect.signature(self._async_client.generate)
            if "system" in sig.parameters and system_prompt is not None:
                kwargs["system"] = system_prompt
            if "options" in sig.parameters:
                kwargs["options"] = options
            if "stream" in sig.parameters:
                kwargs["stream"] = False
        except (ValueError, TypeError):
            if system_prompt is not None:
                kwargs["system"] = system_prompt
            kwargs["options"] = options
            kwargs["stream"] = False

        logger.debug("Generando respuesta stateless con Ollama...")
        try:
            response: Dict[str, Any] = await self._async_client.generate(**kwargs)
            text = response.get("response", "")
            logger.info("Generación stateless completada exitosamente.")
            return text
        except ollama.ResponseError as e:
            logger.error(f"Error de respuesta de Ollama durante generación: {e}")
            raise
        except Exception as e:
            logger.error(f"Error inesperado durante generación stateless: {e}")
            raise
        