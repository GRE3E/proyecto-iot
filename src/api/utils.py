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

def get_module_status() -> StatusResponse:
    """
    Devuelve el estado actual de los módulos.

    Returns:
        StatusResponse: Objeto con el estado de cada módulo (ONLINE/OFFLINE).
    """
    nlp_status = "ONLINE" if _nlp_module and _nlp_module.is_online() else "OFFLINE"
    stt_status = "ONLINE" if _stt_module and _stt_module.is_online() else "OFFLINE"
    speaker_status = "ONLINE" if _speaker_module and _speaker_module.is_online() else "OFFLINE"
    hotword_status = "ONLINE" if _hotword_module and _hotword_module.is_online() else "OFFLINE"
    mqtt_status = "ONLINE" if _mqtt_client and _mqtt_client.is_connected else "OFFLINE"
    tts_status = "ONLINE" if _tts_module and _tts_module.is_online() else "OFFLINE"
    face_recognition_status = "ONLINE" if _face_recognition_module and _face_recognition_module.get_status() else "OFFLINE"
    utils_status = "ONLINE" if _nlp_module else "OFFLINE"
    
    return StatusResponse(
        nlp=nlp_status,
        stt=stt_status,
        speaker=speaker_status,
        hotword=hotword_status,
        mqtt=mqtt_status,
        tts=tts_status,
        face_recognition=face_recognition_status,
        utils=utils_status
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
async def initialize_nlp(ollama_host: str, config: Dict[str, Any]) -> None:
    """
    Inicializa los módulos NLP, STT, Speaker, Hotword, SerialManager y MQTTClient.
    Utiliza ErrorHandler para manejo unificado de excepciones.
    Args:
        ollama_host (str): La URL del host de Ollama.
    """
    global _nlp_module, _stt_module, _speaker_module, _hotword_module, _mqtt_client, _hotword_task, _tts_module, _ollama_manager
    
    logger.info("Inicializando módulos...")

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
        return

    _nlp_module = await ErrorHandler.safe_execute_async(
        lambda: NLPModule(ollama_manager=_ollama_manager, config=config),
        default_return=None,
        context="initialize_nlp.nlp_module"
    )
    logger.info(f"NLPModule inicializado. Online: {_nlp_module.is_online() if _nlp_module else False}")
    
    _stt_module = await ErrorHandler.safe_execute_async(
        lambda: STTModule(),
        default_return=None,
        context="initialize_nlp.stt_module"
    )
    logger.info(f"STTModule inicializado. Online: {_stt_module.is_online() if _stt_module else False}")
    
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
    
    _tts_module = await ErrorHandler.safe_execute_async(
        lambda: TTSModule(),
        default_return=None,
        context="initialize_nlp.tts_module"
    )
    logger.info(f"TTSModule inicializado. Online: {_tts_module.is_online() if _tts_module else False}")
    
    _face_recognition_module = await ErrorHandler.safe_execute_async(
        lambda: FaceRecognitionCore(),
        default_return=None,
        context="initialize_nlp.face_recognition_module"
    )
    logger.info(f"FaceRecognitionCore inicializado. Online: {True if _face_recognition_module else False}")
    
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
        
    logger.info("Todos los módulos inicializados correctamente.")
