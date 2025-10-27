import os
import sys
import asyncio
import logging
import warnings
from dotenv import load_dotenv
from src.utils.error_handler import ErrorHandler
from fastapi import FastAPI
from src.api.routes import router
from src.api.utils import initialize_nlp, _hotword_module, _hotword_task, _mqtt_client, _ollama_manager
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

@app.on_event("startup")
@ErrorHandler.handle_async_exceptions
async def startup_event() -> None:
    logger.info("Iniciando aplicación Casa Inteligente...")

    config_manager = ConfigManager(CONFIG_PATH)
    config = config_manager.get_config()
    logger.info(f"Configuración cargada: {config}")

    await create_all_tables()

    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    await initialize_nlp(ollama_host=ollama_host, config=config)

    app.state.mqtt_client = _mqtt_client
    app.state.iot_data = {}

    if _hotword_module and not _hotword_module.is_online():
        logger.warning("HotwordDetector no está en línea. Verifique PICOVOICE_ACCESS_KEY o HOTWORD_PATH.")

    logger.info("Aplicación iniciada correctamente")

@app.on_event("shutdown")
@ErrorHandler.handle_async_exceptions
async def shutdown_event() -> None:
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

    if _ollama_manager:
        await ErrorHandler.safe_execute_async(
            _ollama_manager.close,
            default_return=None,
            context="shutdown_event.ollama_manager_close"
        )
        logger.info("Cerrando OllamaManager...")

    if async_engine:
        await ErrorHandler.safe_execute_async(
            async_engine.dispose,
            default_return=None,
            context="shutdown_event.db_engine_dispose"
        )
        logger.info("Cerrando motor de la base de datos...")

    logger.info("Aplicación cerrada correctamente")

app.include_router(router, prefix="")
