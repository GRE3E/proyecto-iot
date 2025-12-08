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
from src.ai.nlp.config.config_manager import ConfigManager
from src.auth.default_owner_init import init_default_owner_startup
from src.services.audit_service import get_audit_service

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RC_DIR = os.path.join(BASE_DIR, "src", "rc")
CONFIG_PATH = "config/config.json"

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
    get_audit_service().log_startup()

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
    get_audit_service().log_shutdown()

async def periodic_temperature_check():
    """
    Tarea en segundo plano que solicita el estado de la temperatura cada 30 minutos
    y guarda el resultado en la base de datos.
    """
    import re
    import json
    from src.db.database import get_db
    from src.db.models import TemperatureHistory
    
    DEFAULT_USER_ID = 1  # Usuario por defecto para lecturas periódicas
    
    while True:
        try:
            logger.info("Ejecutando chequeo periódico de temperatura...")
            mqtt_client = get_mqtt_client()
            if mqtt_client and mqtt_client.is_connected:
                request_topic = "iot/sensors/TEMPERATURA/status/get"
                response_topic = "iot/sensors/TEMPERATURA/status"
                device_name = "SensorPrincipal"
                
                # Crear un Future para esperar la respuesta MQTT
                response_future = asyncio.get_event_loop().create_future()
                
                def message_handler(topic, payload):
                    if not response_future.done():
                        try:
                            # Si el payload ya es un número (int o float)
                            if isinstance(payload, (int, float)):
                                response_future.set_result(float(payload))
                                return
                            
                            # Convertir bytes a string si es necesario
                            if isinstance(payload, bytes):
                                payload = payload.decode('utf-8')
                            
                            payload_str = str(payload).strip()
                            
                            # Intentar parsear como JSON primero
                            try:
                                data = json.loads(payload_str)
                                if isinstance(data, dict):
                                    temperature = data.get("temperature") or data.get("temp") or data.get("value")
                                    if temperature is not None:
                                        response_future.set_result(float(temperature))
                                        return
                                elif isinstance(data, (int, float)):
                                    response_future.set_result(float(data))
                                    return
                            except (json.JSONDecodeError, TypeError):
                                pass
                            
                            # Intentar extraer número del formato "Temperatura: XXC" o similar
                            temp_match = re.search(r'(\d+(?:\.\d+)?)\s*[°]?C?', payload_str, re.IGNORECASE)
                            if temp_match:
                                temperature = float(temp_match.group(1))
                                response_future.set_result(temperature)
                                return
                            
                            # Intentar como valor numérico directo
                            temperature = float(payload_str)
                            response_future.set_result(temperature)
                        except Exception as e:
                            logger.error(f"Error parseando temperatura periódica '{payload}': {e}")
                            if not response_future.done():
                                response_future.set_exception(e)
                
                # Suscribirse al tópico de respuesta
                mqtt_client.subscribe(response_topic, message_handler)
                
                try:
                    # Publicar el mensaje de solicitud
                    await mqtt_client.publish(request_topic, "GET")
                    logger.info(f"Solicitud de temperatura enviada a {request_topic}")
                    
                    # Esperar la respuesta con timeout de 15 segundos
                    temperature = await asyncio.wait_for(response_future, timeout=15.0)
                    logger.info(f"Temperatura periódica obtenida: {temperature}°C")
                    
                    # Guardar en la base de datos
                    async with get_db() as db:
                        new_temperature_record = TemperatureHistory(
                            user_id=DEFAULT_USER_ID,
                            temperature=temperature,
                            device_name=device_name
                        )
                        db.add(new_temperature_record)
                        await db.commit()
                        logger.info(f"Temperatura {temperature}°C guardada en BD (periódico)")
                        
                except asyncio.TimeoutError:
                    logger.warning("Timeout esperando respuesta de temperatura (periódico)")
                except Exception as e:
                    logger.error(f"Error al procesar temperatura periódica: {e}")
                finally:
                    # Desuscribirse del tópico de respuesta
                    mqtt_client.unsubscribe(response_topic, message_handler)
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
