import os
import sys
import asyncio
import logging
import warnings
from dotenv import load_dotenv
from src.utils.error_handler import ErrorHandler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router
from src.api.websocket_routes import websocket_router
from src.api.utils import initialize_all_modules, _hotword_module, _mqtt_client
from src.api.utils import (
    shutdown_ollama_manager, shutdown_hotword_module, shutdown_mqtt_client,
    shutdown_speaker_module, shutdown_nlp_module, shutdown_stt_module,
    shutdown_tts_module, shutdown_face_recognition_module
)
from .db.database import async_engine, create_all_tables
from src.utils.logger_config import setup_logging
from src.ai.nlp.config_manager import ConfigManager

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

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
@ErrorHandler.handle_async_exceptions
async def startup_event() -> None:
    logger.info("Iniciando aplicación Casa Inteligente...")

    config_manager = ConfigManager(CONFIG_PATH)
    config = config_manager.get_config()
    logger.info(f"Configuración cargada: {config}")

    await create_all_tables()

    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    await initialize_all_modules(config_manager=config_manager, ollama_host=ollama_host)

    app.state.mqtt_client = _mqtt_client
    app.state.iot_data = {}

    if _hotword_module and not _hotword_module.is_online():
        logger.warning("HotwordDetector no está en línea. Verifique PICOVOICE_ACCESS_KEY o HOTWORD_PATH.")

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

app.include_router(router, prefix="")
app.include_router(websocket_router, prefix="")
