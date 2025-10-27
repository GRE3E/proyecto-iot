import json
import os
import logging
from pathlib import Path
from typing import Dict, Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger("ConfigManager")

class ConfigManager:
    """
    Gestiona la carga y guardado de la configuración del asistente.
    """
    def __init__(self, config_path: Path):
        self._config_path = config_path
        self._config: Dict[str, Any] = {}
        self.load_config()

    def load_config(self) -> None:
        """Carga la configuración del asistente desde config.json o crea valores por defecto."""
        try:
            with open(self._config_path, "r", encoding="utf-8") as f:
                self._config = json.load(f)
            logger.info(f"Configuración cargada desde {self._config_path}")
        except FileNotFoundError:
            logger.warning(f"Archivo de configuración no encontrado en {self._config_path}. Creando configuración por defecto.")
            self._set_default_config()
            self.save_config()
        except json.JSONDecodeError:
            logger.error(f"Error al decodificar JSON en {self._config_path}. Usando configuración por defecto.")
            self._set_default_config()
            self.save_config()
        
        self._validate_timezone()

    def save_config(self) -> None:
        """Guarda la configuración actual en config.json."""
        try:
            os.makedirs(os.path.dirname(self._config_path), exist_ok=True)
            config_to_save = self._config.copy()
            if "owner_name" in config_to_save:
                del config_to_save["owner_name"]
            with open(self._config_path, "w", encoding="utf-8") as f:
                json.dump(config_to_save, f, indent=4, ensure_ascii=False)
            logger.info(f"Configuración guardada en {self._config_path}")
        except IOError as e:
            logger.error(f"Error de E/S al guardar la configuración en {self._config_path}: {e}")
        except PermissionError as e:
            logger.error(f"Error de permisos al guardar la configuración en {self._config_path}: {e}")

    def get_config(self) -> Dict[str, Any]:
        """Devuelve la configuración actual."""
        logger.debug(f"Obteniendo configuración: {self._config}")
        return self._config

    def update_config(self, new_config: Dict[str, Any]) -> None:
        """Actualiza la configuración con un nuevo diccionario y la guarda."""
        logger.info(f"Actualizando configuración con: {new_config}")
        self._config.update(new_config)
        self.save_config()

    def _set_default_config(self) -> None:
        """Establece la configuración por defecto."""
        logger.info("Estableciendo configuración por defecto.")
        self._config = {
        "assistant_name": "Murphy",
        "language": "es",
        "model": {
          "name": "qwen2.5:3b-instruct",
          "temperature": 0.3,
          "top_p": 0.9,
          "top_k": 40,
          "repeat_penalty": 1.1,
          "num_ctx": 8192,
          "max_tokens": 1024
        },
        "capabilities": [
           "control_luces",
           "control_temperatura",
           "control_dispositivos",
           "consulta_estado",
           "administrar_comandos_iot"
        ],
        "memory_size": 50,
        "timezone": "America/Lima",
        "debug": False
    }

    def _validate_timezone(self) -> None:
        """Valida la configuración de la zona horaria y establece un valor por defecto si es inválido."""
        configured_timezone = self._config.get("timezone")
        if configured_timezone:
            try:
                ZoneInfo(configured_timezone)
            except ZoneInfoNotFoundError:
                logger.warning(
                    f"Zona horaria configurada '{configured_timezone}' no es válida. Estableciendo 'UTC' como predeterminada."
                )
                self._config["timezone"] = "UTC"
                self.save_config()
        else:
            logger.warning("No se encontró la configuración de zona horaria. Estableciendo 'UTC' como predeterminada.")
            self._config["timezone"] = "UTC"
            self.save_config()