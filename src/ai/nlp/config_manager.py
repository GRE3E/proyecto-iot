import json
import os
import logging
from pathlib import Path
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

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
            logging.info(f"Configuración cargada desde {self._config_path}")
        except FileNotFoundError:
            logging.warning(f"Archivo de configuración no encontrado en {self._config_path}. Creando configuración por defecto.")
            self._config = {
                "assistant_name": "Murph",
                "language": "es",
                "capabilities": [
                    "control_luces",
                    "control_temperatura",
                    "control_dispositivos",
                    "consulta_estado",
                ],
                "model": {
                    "name": "mistral:7b-instruct",
                    "temperature": 0.7,
                    "max_tokens": 150,
                },
                "memory_size": 10,
                "timezone": "America/Lima",
            }
            self.save_config()
        except json.JSONDecodeError:
            logging.error(f"Error al decodificar JSON en {self._config_path}. Usando configuración por defecto.")
            self._config = {
                "assistant_name": "Murph",
                "language": "es",
                "capabilities": [
                    "control_luces",
                    "control_temperatura",
                    "control_dispositivos",
                    "consulta_estado",
                ],
                "model": {
                    "name": "mistral:7b-instruct",
                    "temperature": 0.7,
                    "max_tokens": 150,
                },
                "memory_size": 10,
                "timezone": "America/Lima",
            }
            self.save_config()

    def save_config(self) -> None:
        """Guarda la configuración actual en config.json."""
        os.makedirs(os.path.dirname(self._config_path), exist_ok=True)
        with open(self._config_path, "w", encoding="utf-8") as f:
            json.dump(self._config, f, indent=4, ensure_ascii=False)
        logging.info(f"Configuración guardada en {self._config_path}")

    def get_config(self) -> Dict[str, Any]:
        """Devuelve la configuración actual."""
        return self._config

    def update_config(self, new_config: Dict[str, Any]) -> None:
        """Actualiza la configuración con un nuevo diccionario y la guarda."""
        self._config.update(new_config)
        self.save_config()