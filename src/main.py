import os
import sys
import asyncio
import logging
import warnings
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import Response

from src.utils.error_handler import ErrorHandler
from src.api.routes import router
from src.api.utils import initialize_all_modules, _hotword_module, _mqtt_client
from src.api.utils import (
    shutdown_ollama_manager, shutdown_hotword_module, shutdown_mqtt_client,
    shutdown_speaker_module, shutdown_nlp_module, shutdown_stt_module,
    shutdown_tts_module, shutdown_face_recognition_module, get_mqtt_client
)
from .db.database import async_engine, create_all_tables
from src.utils.logger_config import setup_logging
from src.ai.nlp.config_manager import ConfigManager
from src.auth.default_owner_init import init_default_owner_startup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RC_DIR = os.path.join(BASE_DIR, "src", "rc")
CONFIG_PATH = "src/ai/config/config.json"

sys.path.insert(0, BASE_DIR)
sys.path.insert(0, RC_DIR)

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

load_dotenv()
setup_logging()

if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logger = logging.getLogger("MainApp")

app = FastAPI(title="Casa Inteligente API")

@app.middleware("http")
async def dynamic_cors(request: Request, call_next):
    response: Response = await call_next(request)

    origin = request.headers.get("origin")

    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"

    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Vary"] = "Origin"

    return response

@app.on_event("startup")
@ErrorHandler.handle_async_exceptions
async def startup_event() -> None:
    logger.info("Iniciando aplicación Casa Inteligente...")

    config_manager = ConfigManager(CONFIG_PATH)
    config = config_manager.get_config()
    logger.info(f"Configuración cargada: {config}")

    await create_all_tables()
    await init_default_owner_startup()

    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

    await initialize_all_modules(config_manager=config_manager, ollama_host=ollama_host)

    app.state.mqtt_client = _mqtt_client
    app.state.iot_data = {}

    # Iniciar tarea periódica para la temperatura (cada 30 min)
    asyncio.create_task(periodic_temperature_check())

    if _hotword_module and not _hotword_module.is_online():
        logger.warning("HotwordDetector no está en línea. Verifique configuración.")

    logger.info("Aplicación iniciada correctamente")

@app.on_event("shutdown")
@ErrorHandler.handle_async_exceptions
async def shutdown_event() -> None:
    logger.info("Cerrando aplicación...")

    await shutdown_hotword_module()
    await shutdown_mqtt_client()
    await shutdown_ollama_manager()
    await shutdown_speaker_module()
    await shutdown_nlp_module()
    await shutdown_stt_module()
    await shutdown_tts_module()
    await shutdown_face_recognition_module()

    if async_engine:
        await ErrorHandler.safe_execute_async(
            async_engine.dispose,
            default_return=None,
            context="shutdown_event.db_engine_dispose"
        )
        logger.info("Cerrando motor de la base de datos...")

    logger.info("Aplicación cerrada correctamente")

async def periodic_temperature_check():
    """
    Tarea en segundo plano que solicita el estado de la temperatura cada 30 minutos.
    """
    while True:
        try:
            logger.info("Ejecutando chequeo periódico de temperatura...")
            mqtt_client = get_mqtt_client()
            if mqtt_client and mqtt_client.is_connected:
                # Publicar comando para obtener el estado de la temperatura
                # Ajusta el tópico según tu configuración real de Arduino
                topic = "iot/sensors/TEMPERATURA/status/get" 
                await mqtt_client.publish(topic, "GET")
                logger.info(f"Solicitud de temperatura enviada a {topic}")
            else:
                logger.warning("MQTT Client no conectado. Omitiendo chequeo de temperatura.")
            
            # Esperar 30 minutos (30 * 60 segundos)
            await asyncio.sleep(1800) 
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error en tarea periódica de temperatura: {e}")
            await asyncio.sleep(60) # Reintentar en 1 minuto si falla

app.include_router(router, prefix="")
