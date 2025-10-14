import os
import asyncio
import logging
import warnings
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from src.utils.error_handler import ErrorHandler

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
# Cargar variables de entorno del archivo .env al inicio
load_dotenv()

# IMPORTANTE: Configurar la política del bucle de eventos ANTES de cualquier otra importación
if os.name == 'nt':  # Windows
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from src.api.routes import router
from src.api.utils import initialize_nlp, _hotword_module, _hotword_task, _mqtt_client
from src.api import utils
from .db.database import Base, engine
from .db import models
import httpx
import json
import pyaudio
import wave
from datetime import datetime
import numpy as np
from src.utils.logger_config import setup_logging

# Configurar logging
setup_logging()
logger = logging.getLogger("MainApp")

app = FastAPI(title="Casa Inteligente API")

# Configuración
CONFIG_PATH = "src/ai/config/config.json"

@ErrorHandler.handle_exceptions
def load_config() -> Dict[str, Any]:
    """
    Carga la configuración desde config.json o crea una por defecto si no existe.

    Returns:
        Dict[str, Any]: Diccionario con la configuración cargada o por defecto.
    """
    default_config = {
        "assistant_name": "Murph",
        "language": "es",
        "capabilities": ["control_luces", "control_temperatura", "control_dispositivos", "consulta_estado"],
        "model": {
            "name": "mistral:7b-instruct",
            "temperature": 0.7,
            "max_tokens": 150
        },
        "memory_size": 10
    }
    
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except FileNotFoundError:
        logger.warning(f"Archivo de configuración no encontrado en {CONFIG_PATH}. Creando configuración por defecto.")
        config = default_config
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
    except json.JSONDecodeError as e:
        logger.error(f"Error al decodificar JSON en {CONFIG_PATH}: {e}. Usando configuración por defecto.")
        config = default_config
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
    
    return config

@app.on_event("startup")
@ErrorHandler.handle_async_exceptions
async def startup_event() -> None:
    """
    Evento de inicio de la aplicación.
    Inicializa la configuración, la base de datos y los módulos de IA/IoT.
    """
    logger.info("Iniciando aplicación Casa Inteligente...")
    
    config = load_config()
    logger.info(f"Configuración cargada: {config}")

    Base.metadata.create_all(bind=engine)
    
    await initialize_nlp()

    app.state.mqtt_client = _mqtt_client
    app.state.iot_data = {}

    if _hotword_module and not _hotword_module.is_online():
        logger.warning("HotwordDetector no está en línea. Verifique PICOVOICE_ACCESS_KEY o HOTWORD_PATH.")

    logger.info("Aplicación iniciada correctamente")

@app.on_event("shutdown")
@ErrorHandler.handle_async_exceptions
async def shutdown_event() -> None:
    """
    Evento de cierre de la aplicación.
    Realiza la limpieza de recursos, como detener el HotwordDetector y desconectar los gestores IoT.
    """
    logger.info("Cerrando aplicación...")
    
    if _hotword_task:
        logger.info("Cancelando tarea de HotwordDetector...")
        _hotword_task.cancel()
        try:
            await _hotword_task
        except asyncio.CancelledError:
            logger.info("Tarea de HotwordDetector cancelada correctamente")
        except Exception as e:
            logger.error(f"Error al esperar la tarea de HotwordDetector: {e}")

    if hasattr(app.state, 'mqtt_client') and app.state.mqtt_client:
        await ErrorHandler.safe_execute_async(
            app.state.mqtt_client.disconnect,
            default_return=None,
            context="shutdown_event.mqtt_disconnect"
        )
        logger.info("Desconectando cliente MQTT...")
    
    logger.info("Aplicación cerrada correctamente")

app.include_router(router, prefix="")