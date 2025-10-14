from src.ai.nlp.nlp_core import NLPModule
from src.ai.stt.stt import STTModule
from src.ai.speaker.speaker import SpeakerRecognitionModule
from src.ai.tts.tts_module import TTSModule
from src.ai.hotword.hotword import HotwordDetector, hotword_callback_async
from src.iot.mqtt_client import MQTTClient
import os
import logging
from datetime import datetime
import json
from sqlalchemy.orm import Session
from src.db.models import APILog
import asyncio
from src.api.schemas import StatusResponse
from typing import Optional, Dict, Any
from src.utils.error_handler import ErrorHandler

logger = logging.getLogger("APIUtils")

_nlp_module: Optional[NLPModule] = None
_stt_module: Optional[STTModule] = None
_speaker_module: Optional[SpeakerRecognitionModule] = None
_hotword_module: Optional[HotwordDetector] = None
_mqtt_client: Optional[MQTTClient] = None
_hotword_task: Optional[asyncio.Task] = None
_tts_module: Optional[TTSModule] = None

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
    utils_status = "ONLINE" if _nlp_module else "OFFLINE"
    
    return StatusResponse(
        nlp=nlp_status,
        stt=stt_status,
        speaker=speaker_status,
        hotword=hotword_status,
        mqtt=mqtt_status,
        tts=tts_status,
        utils=utils_status
    )

def _sanitize_data(data: Dict[str, Any]) -> Dict[str, Any]:
    sensitive_keys = ["password", "token", "access_key", "secret", "api_key"]
    sanitized_data = data.copy()
    for key in sensitive_keys:
        if key in sanitized_data:
            sanitized_data[key] = "[REDACTED]"
    return sanitized_data

def _save_api_log(endpoint: str, request_body: Dict[str, Any], response_data: Dict[str, Any], db: Session) -> None:
    """
    Guarda un log de la interacción de la API en la base de datos.

    Args:
        endpoint (str): Ruta del endpoint de la API.
        request_body (Dict[str, Any]): Cuerpo de la solicitud.
        response_data (Dict[str, Any]): Datos de la respuesta.
        db (Session): Sesión de base de datos.

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
        db.commit()
        db.refresh(log_entry)
        logger.info(f"API log guardado exitosamente para el endpoint: {endpoint}")
    except Exception as e:
        logger.error(f"Error al guardar log de API para el endpoint {endpoint}: {e}")
        db.rollback()
        raise

@ErrorHandler.handle_async_exceptions
async def initialize_nlp() -> None:
    """
    Inicializa los módulos NLP, STT, Speaker, Hotword, SerialManager y MQTTClient.
    Utiliza ErrorHandler para manejo unificado de excepciones.
    """
    global _nlp_module, _stt_module, _speaker_module, _hotword_module, _mqtt_client, _hotword_task, _tts_module
    
    logger.info("Inicializando módulos...")
    
    # Inicialización de módulos principales con manejo de errores unificado
    _nlp_module = await ErrorHandler.safe_execute_async(
        lambda: NLPModule(),
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
    logger.info(f"SpeakerRecognitionModule inicializado. Online: {_speaker_module.is_online() if _speaker_module else False}")
    
    _tts_module = await ErrorHandler.safe_execute_async(
        lambda: TTSModule(),
        default_return=None,
        context="initialize_nlp.tts_module"
    )
    logger.info(f"TTSModule inicializado. Online: {_tts_module.is_online() if _tts_module else False}")
    
    # Inicialización del módulo Hotword
    access_key = os.getenv("PICOVOICE_ACCESS_KEY")
    hotword_path = os.getenv("HOTWORD_PATH")
    
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
            logger.info(f"Módulo Hotword inicializado correctamente. Online: {_hotword_module.is_online()}")
            _hotword_task = asyncio.create_task(_hotword_module.start(hotword_callback_async))
        else:
            logger.error("Error al inicializar HotwordDetector")

    # Inicialización de MQTTClient
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
            logger.info(f"MQTTClient inicializado y conectado en {mqtt_broker}:{mqtt_port}. Online: {_mqtt_client.is_connected}")
    else:
        logger.info("Variables de entorno MQTT_BROKER o MQTT_PORT no configuradas. MQTTClient no se inicializará.")

    # Pasar instancias de IoT al módulo NLP
    if _nlp_module:
        from src.db.database import get_db
        db = next(get_db())
        try:
            await ErrorHandler.safe_execute_async(
                lambda: _nlp_module.set_iot_managers(mqtt_client=_mqtt_client, db=db),
                context="initialize_nlp.set_iot_managers"
            )
            logger.info("Instancias de MQTTClient pasadas al módulo NLP y caché inicializado.")
        finally:
            db.close()
        
    logger.info("Todos los módulos inicializados correctamente.")