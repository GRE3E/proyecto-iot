import os
import logging
from datetime import datetime
import json
from src.ai.nlp.nlp_core import NLPModule
from src.ai.stt.stt import STTModule
from src.ai.speaker.speaker import SpeakerRecognitionModule
from src.ai.tts.tts_module import TTSModule
from src.rc.rc_core import FaceRecognitionCore 
from src.ai.hotword.hotword import HotwordDetector, hotword_callback_async
from src.iot.mqtt_client import MQTTClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import APILog
import asyncio
from src.api.schemas import StatusResponse
from typing import Optional, Dict, Any
from src.utils.error_handler import ErrorHandler
from src.ai.nlp.ollama_manager import OllamaManager
from src.ai.nlp.config_manager import ConfigManager
import random
import string

logger = logging.getLogger("APIUtils")

_nlp_module: Optional[NLPModule] = None
_stt_module: Optional[STTModule] = None
_speaker_module: Optional[SpeakerRecognitionModule] = None
_hotword_module: Optional[HotwordDetector] = None
_mqtt_client: Optional[MQTTClient] = None
_hotword_task: Optional[asyncio.Task] = None
_tts_module: Optional[TTSModule] = None
_face_recognition_module: Optional[FaceRecognitionCore] = None 
_ollama_manager: Optional[OllamaManager] = None
_config_manager: Optional[ConfigManager] = None

def get_module_status() -> StatusResponse:
    """
    Devuelve el estado actual de los módulos.

    Returns:
        StatusResponse: Objeto con el estado de cada módulo (ONLINE/OFFLINE/DISABLED).
    """
    if not _config_manager:
        return StatusResponse(
            nlp="OFFLINE",
            stt="OFFLINE",
            speaker="OFFLINE",
            hotword="OFFLINE",
            mqtt="OFFLINE",
            tts="OFFLINE",
            face_recognition="OFFLINE",
            utils="OFFLINE"
        )

    def get_status(module: Optional[Any], module_name: str) -> str:
        if not _config_manager.is_module_enabled(module_name):
            return "DISABLED"
        return "ONLINE" if module and (
            hasattr(module, 'is_online') and module.is_online() or
            hasattr(module, 'is_connected') and module.is_connected or
            hasattr(module, 'get_status') and module.get_status()
        ) else "OFFLINE"

    return StatusResponse(
        nlp=get_status(_nlp_module, "nlp"),
        stt=get_status(_stt_module, "stt"),
        speaker=get_status(_speaker_module, "speaker"),
        hotword=get_status(_hotword_module, "hotword"),
        mqtt=get_status(_mqtt_client, "mqtt"),
        tts=get_status(_tts_module, "tts"),
        face_recognition=get_status(_face_recognition_module, "face_recognition") if _face_recognition_module else "OFFLINE",
        utils="ONLINE" if _nlp_module else "OFFLINE"
    )

def _sanitize_data(data: Dict[str, Any]) -> Dict[str, Any]:
    sensitive_keys = ["password", "token", "access_key", "secret", "api_key"]
    sanitized_data = data.copy()
    for key in sensitive_keys:
        if key in sanitized_data:
            sanitized_data[key] = "[REDACTED]"
    return sanitized_data

async def _save_api_log(endpoint: str, request_body: Dict[str, Any], response_data: Dict[str, Any], db: AsyncSession) -> None:
    """
    Guarda un log de la interacción de la API en la base de datos.

    Args:
        endpoint (str): Ruta del endpoint de la API.
        request_body (Dict[str, Any]): Cuerpo de la solicitud.
        response_data (Dict[str, Any]): Datos de la respuesta.
        db (AsyncSession): Sesión de base de datos asíncrona.

    Raises:
        Exception: Si ocurre un error al guardar el log.
    """
    try:
        log_entry = APILog(
            timestamp=datetime.now(),
            endpoint=endpoint,
            request_body=json.dumps(_sanitize_data(request_body), ensure_ascii=False),
            response_data=json.dumps(_sanitize_data(response_data), ensure_ascii=False)
        )
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)
        logger.info(f"API log guardado exitosamente para el endpoint: {endpoint}")
    except Exception as e:
        logger.error(f"Error al guardar log de API para el endpoint {endpoint}: {e}")
        await db.rollback()
        raise

@ErrorHandler.handle_async_exceptions
async def initialize_all_modules(config_manager: ConfigManager, ollama_host: str) -> None:
    """
    Inicializa los módulos según la configuración.
    
    Args:
        config_manager (ConfigManager): Gestor de configuración
        ollama_host (str): La URL del host de Ollama
    """
    global _nlp_module, _stt_module, _speaker_module, _hotword_module, _mqtt_client
    global _hotword_task, _tts_module, _face_recognition_module, _ollama_manager, _config_manager
    
    _config_manager = config_manager
    logger.info("Inicializando módulos...")

    if _config_manager.is_module_enabled("nlp"):
        await initialize_nlp_module_only(config_manager.get_config(), ollama_host)
    
    if _config_manager.is_module_enabled("stt"):
        await _initialize_stt_module()
    
    if _config_manager.is_module_enabled("speaker"):
        await _initialize_speaker_module()
    
    if _config_manager.is_module_enabled("tts"):
        await _initialize_tts_module()
    
    if _config_manager.is_module_enabled("face_recognition"):
        await _initialize_face_recognition_module()
    
    if _config_manager.is_module_enabled("hotword"):
        await _initialize_hotword_module()
    
    if _config_manager.is_module_enabled("mqtt"):
        await _initialize_mqtt_client()
    
    if _nlp_module:
        await _set_nlp_iot_managers()
        
    logger.info("Módulos inicializados según la configuración.")

async def initialize_nlp_module_only(config: Dict[str, Any], ollama_host: str) -> None:
    global _ollama_manager, _nlp_module
    await _initialize_ollama_manager(config, ollama_host)
    await _initialize_nlp_module(config)

async def _initialize_ollama_manager(config: Dict[str, Any], ollama_host: str) -> None:
    global _ollama_manager
    ollama_model_config = config.get("model", {})
    _ollama_manager = await ErrorHandler.safe_execute_async(
        lambda: OllamaManager(model_config=ollama_model_config, ollama_host=ollama_host),
        default_return=None,
        context="initialize_nlp.ollama_manager"
    )
    if _ollama_manager and _ollama_manager.is_online():
        logger.info("OllamaManager inicializado y en línea.")
    else:
        logger.error("Fallo al inicializar OllamaManager. El módulo NLP no estará disponible.")

async def _initialize_nlp_module(config: Dict[str, Any]) -> None:
    global _nlp_module
    if _ollama_manager and _ollama_manager.is_online():
        _nlp_module = await ErrorHandler.safe_execute_async(
            lambda: NLPModule(ollama_manager=_ollama_manager, config=config),
            default_return=None,
            context="initialize_nlp.nlp_module"
        )
        logger.info(f"NLPModule inicializado. Online: {_nlp_module.is_online() if _nlp_module else False}")
    else:
        logger.warning("OllamaManager no está en línea, no se puede inicializar NLPModule.")

async def _initialize_stt_module() -> None:
    global _stt_module
    _stt_module = await ErrorHandler.safe_execute_async(
        lambda: STTModule(),
        default_return=None,
        context="initialize_nlp.stt_module"
    )
    logger.info(f"STTModule inicializado. Online: {_stt_module.is_online() if _stt_module else False}")

async def _initialize_speaker_module() -> None:
    global _speaker_module
    _speaker_module = await ErrorHandler.safe_execute_async(
        lambda: SpeakerRecognitionModule(),
        default_return=None,
        context="initialize_nlp.speaker_module"
    )
    if _speaker_module:
        await ErrorHandler.safe_execute_async(
            lambda: asyncio.create_task(_speaker_module.load_users()),
            context="initialize_nlp.load_speaker_users"
        )
    logger.info(f"SpeakerRecognitionModule inicializado. Online: {_speaker_module.is_online() if _speaker_module else False}")

async def _initialize_tts_module() -> None:
    global _tts_module
    _tts_module = await ErrorHandler.safe_execute_async(
        lambda: TTSModule(),
        default_return=None,
        context="initialize_nlp.tts_module"
    )
    logger.info(f"TTSModule inicializado. Online: {_tts_module.is_online() if _tts_module else False}")

async def _initialize_face_recognition_module() -> None:
    global _face_recognition_module
    _face_recognition_module = await ErrorHandler.safe_execute_async(
        lambda: FaceRecognitionCore(),
        default_return=None,
        context="initialize_nlp.face_recognition_module"
    )
    logger.info(f"FaceRecognitionCore inicializado. Online: {_face_recognition_module.is_online() if _face_recognition_module else False}")

async def _initialize_hotword_module() -> None:
    global _hotword_module, _hotword_task
    access_key = os.getenv("PICOVOICE_ACCESS_KEY")
    hotword_path = "src/ai/hotword/models/Okey-Murphy_en_windows_v3_0_0.ppn"
    
    if not access_key or not hotword_path:
        logger.warning("PICOVOICE_ACCESS_KEY o HOTWORD_PATH no configurados. El módulo Hotword no se inicializará.")
        _hotword_module = None
    else:
        _hotword_module = await ErrorHandler.safe_execute_async(
            lambda: HotwordDetector(access_key=access_key, hotword_path=hotword_path),
            default_return=None,
            context="initialize_nlp.hotword_module"
        )
        
        if _hotword_module:
            _hotword_task = asyncio.create_task(_hotword_module.start(hotword_callback_async))
            await _hotword_module._online_event.wait()
            logger.info(f"Módulo Hotword inicializado correctamente. Online: {_hotword_module.is_online()}")
        else:
            logger.error("Error al inicializar HotwordDetector")

async def _initialize_mqtt_client() -> None:
    global _mqtt_client
    mqtt_broker = os.getenv("MQTT_BROKER")
    mqtt_port = os.getenv("MQTT_PORT")
    if mqtt_broker and mqtt_port:
        _mqtt_client = await ErrorHandler.safe_execute_async(
            lambda: MQTTClient(broker=mqtt_broker, port=int(mqtt_port)),
            default_return=None,
            context="initialize_nlp.mqtt_client"
        )
        
        if _mqtt_client:
            await ErrorHandler.safe_execute_async(
                lambda: _mqtt_client.connect(),
                context="initialize_nlp.mqtt_connect"
            )
            await _mqtt_client._online_event.wait()
            logger.info(f"MQTTClient inicializado y conectado en {mqtt_broker}:{mqtt_port}. Online: {_mqtt_client.is_connected}")
    else:
        logger.info("Variables de entorno MQTT_BROKER o MQTT_PORT no configuradas. MQTTClient no se inicializará.")

async def _set_nlp_iot_managers() -> None:
    if _nlp_module:
        from src.db.database import get_db
    
        async with get_db() as db:
            try:
                await ErrorHandler.safe_execute_async(
                    lambda: _nlp_module.set_iot_managers(mqtt_client=_mqtt_client, db=db),
                    context="initialize_nlp.set_iot_managers"
                )
                logger.info("Instancias de MQTTClient pasadas al módulo NLP y caché inicializado.")
            finally:
                pass

async def shutdown_ollama_manager() -> None:
    global _ollama_manager
    if _ollama_manager:
        _ollama_manager.close()
        logger.info("OllamaManager cerrado.")
        _ollama_manager = None

async def shutdown_hotword_module() -> None:
    global _hotword_module, _hotword_task
    if _hotword_task:
        logger.info("Cancelando tarea de HotwordDetector...")
        _hotword_task.cancel()
        try:
            await _hotword_task
        except asyncio.CancelledError:
            logger.info("Tarea de HotwordDetector cancelada correctamente")
        except Exception as e:
            logger.error(f"Error al esperar la tarea de HotwordDetector: {e}")
        _hotword_task = None
    if _hotword_module:
        _hotword_module.stop()
        logger.info("HotwordDetector cerrado.")
        _hotword_module = None

async def shutdown_mqtt_client() -> None:
    global _mqtt_client
    if _mqtt_client:
        await ErrorHandler.safe_execute_async(
            _mqtt_client.disconnect,
            default_return=None,
            context="shutdown_mqtt_client"
        )
        logger.info("Desconectando cliente MQTT...")
        _mqtt_client = None

async def shutdown_speaker_module() -> None:
    global _speaker_module
    if _speaker_module:
        await asyncio.to_thread(_speaker_module.shutdown)
        logger.info("SpeakerRecognitionModule cerrado.")
        _speaker_module = None

async def shutdown_nlp_module() -> None:
    global _nlp_module
    if _nlp_module:
        await _nlp_module.close()
        _nlp_module = None
        logger.info("NLPModule apagado.")

async def shutdown_stt_module() -> None:
    global _stt_module
    if _stt_module:
        await asyncio.to_thread(_stt_module.shutdown)
        _stt_module = None
        logger.info("STTModule apagado.")

async def shutdown_tts_module() -> None:
    global _tts_module
    if _tts_module:
        await asyncio.to_thread(_tts_module.shutdown)
        _tts_module = None
        logger.info("TTSModule apagado.")

async def shutdown_face_recognition_module() -> None:
    global _face_recognition_module
    if _face_recognition_module:
        logger.info("FaceRecognitionCore module shut down and dereferenced.")
        await ErrorHandler.safe_execute_async(
            _face_recognition_module.shutdown,
            default_return=None,
            context="shutdown_face_recognition_module"
        )
        _face_recognition_module = None


def generate_random_password(length: int = 12) -> str:
    """Generates a random password with a specified length."""
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(random.choice(characters) for i in range(length))
    return password
