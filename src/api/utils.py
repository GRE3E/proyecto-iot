from src.ai.nlp.nlp_core import NLPModule
from src.ai.stt.stt import STTModule
from src.ai.speaker.speaker import SpeakerRecognitionModule
from src.ai.tts.tts_module import TTSModule
from src.ai.hotword.hotword import HotwordDetector, hotword_callback_async
from src.iot.serial_manager import SerialManager
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

_nlp_module: Optional[NLPModule] = None
_stt_module: Optional[STTModule] = None
_speaker_module: Optional[SpeakerRecognitionModule] = None
_hotword_module: Optional[HotwordDetector] = None
_serial_manager: Optional[SerialManager] = None
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
    serial_status = "ONLINE" if _serial_manager and _serial_manager.is_connected else "OFFLINE"
    mqtt_status = "ONLINE" if _mqtt_client and _mqtt_client.is_connected else "OFFLINE"
    tts_status = "ONLINE" if _tts_module and _tts_module.is_online() else "OFFLINE"
    utils_status = "ONLINE" if _nlp_module else "OFFLINE"
    
    return StatusResponse(
        nlp=nlp_status,
        stt=stt_status,
        speaker=speaker_status,
        hotword=hotword_status,
        serial=serial_status,
        mqtt=mqtt_status,
        tts=tts_status,
        utils=utils_status
    )

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
            request_body=json.dumps(request_body, ensure_ascii=False),
            response_data=json.dumps(response_data, ensure_ascii=False)
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
    except Exception as e:
        logging.error(f"Error al guardar log de API: {e}")
        db.rollback()
        raise

async def initialize_nlp() -> None:
    """
    Inicializa los módulos NLP, STT, Speaker, Hotword, SerialManager y MQTTClient.

    Raises:
        Exception: Si ocurre un error durante la inicialización.
    """
    global _nlp_module, _stt_module, _speaker_module, _hotword_module, _serial_manager, _mqtt_client, _hotword_task, _tts_module
    
    try:
        logging.info("Inicializando módulos...")
        _nlp_module = NLPModule()
        await _nlp_module._memory_manager.async_init()
        logging.info(f"NLPModule inicializado. Online: {_nlp_module.is_online()}")
        _stt_module = STTModule()
        logging.info("STTModule inicializado.")
        _speaker_module = SpeakerRecognitionModule()
        logging.info("SpeakerRecognitionModule inicializado.")
        _tts_module = TTSModule()
        logging.info("TTSModule inicializado.")
        
        # Inicialización del módulo Hotword
        access_key = os.getenv("PICOVOICE_ACCESS_KEY")
        hotword_path = os.getenv("HOTWORD_PATH")
        
        if not access_key or not hotword_path:
            logging.warning("PICOVOICE_ACCESS_KEY o HOTWORD_PATH no configurados. El módulo Hotword no se inicializará.")
            _hotword_module = None
        else:
            try:
                _hotword_module = HotwordDetector(access_key=access_key, hotword_path=hotword_path)
                logging.info("Módulo Hotword inicializado correctamente")
                _hotword_task = asyncio.create_task(_hotword_module.start(hotword_callback_async))
            except Exception as e:
                logging.error(f"Error al inicializar HotwordDetector: {e}")
                _hotword_module = None

        # Inicialización de SerialManager
        serial_port = os.getenv("SERIAL_PORT")
        serial_baudrate = os.getenv("SERIAL_BAUDRATE")
        if serial_port and serial_baudrate:
            try:
                _serial_manager = SerialManager(port=serial_port, baudrate=int(serial_baudrate))
                _serial_manager.connect()
                logging.info(f"SerialManager inicializado y conectado en {serial_port}:{serial_baudrate}. Online: {_serial_manager.is_connected}")
            except Exception as e:
                logging.error(f"Error al inicializar SerialManager: {e}")
                _serial_manager = None
        else:
            logging.info("Variables de entorno SERIAL_PORT o SERIAL_BAUDRATE no configuradas. SerialManager no se inicializará.")

        # Inicialización de MQTTClient
        mqtt_broker = os.getenv("MQTT_BROKER")
        mqtt_port = os.getenv("MQTT_PORT")
        if mqtt_broker and mqtt_port:
            try:
                _mqtt_client = MQTTClient(broker=mqtt_broker, port=int(mqtt_port))
                _mqtt_client.connect()
                logging.info(f"MQTTClient inicializado y conectado en {mqtt_broker}:{mqtt_port}. Online: {_mqtt_client.is_connected}")
            except Exception as e:
                logging.error(f"Error al inicializar MQTTClient: {e}")
                _mqtt_client = None
        else:
            logging.info("Variables de entorno MQTT_BROKER o MQTT_PORT no configuradas. MQTTClient no se inicializará.")

        # Pasar instancias de IoT al módulo NLP
        if _nlp_module:
            _nlp_module.set_iot_managers(serial_manager=_serial_manager, mqtt_client=_mqtt_client)
            logging.info("Instancias de SerialManager y MQTTClient pasadas al módulo NLP.")
            
        logging.info("Módulos inicializados correctamente")
    except Exception as e:
        logging.error(f"Error al inicializar módulos: {e}")
        raise