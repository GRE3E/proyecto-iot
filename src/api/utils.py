from src.ai.nlp.nlp_core import NLPModule
from src.ai.stt.stt import STTModule
from src.ai.speaker.speaker import SpeakerRecognitionModule
from src.ai.hotword.hotword import HotwordDetector
from src.iot.serial_manager import SerialManager
from src.iot.mqtt_client import MQTTClient
import os
import logging
from datetime import datetime
import json
from sqlalchemy.orm import Session
from src.db.models import APILog

_nlp_module = None
_stt_module = None
_speaker_module = None
_hotword_module = None
_serial_manager = None
_mqtt_client = None

def _save_api_log(endpoint: str, request_body: dict, response_data: dict, db: Session):
    """Guarda un log de la interacción de la API en la base de datos."""
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

def initialize_nlp():
    """Inicializa los módulos NLP, STT y Speaker."""
    global _nlp_module, _stt_module, _speaker_module, _hotword_module, _serial_manager, _mqtt_client
    
    try:
        logging.info("Inicializando módulos...")
        _nlp_module = NLPModule()
        logging.info(f"NLPModule inicializado. Online: {_nlp_module.is_online()}")
        _stt_module = STTModule()
        logging.info("STTModule inicializado.")
        _speaker_module = SpeakerRecognitionModule()
        logging.info("SpeakerRecognitionModule inicializado.")
        
        access_key = os.getenv("PICOVOICE_ACCESS_KEY")
        hotword_path = os.getenv("HOTWORD_PATH")
        
        if not access_key or not hotword_path:
            logging.warning("PICOVOICE_ACCESS_KEY o HOTWORD_PATH no configurados. El módulo Hotword no se inicializará.")
            _hotword_module = None
        else:
            try:
                _hotword_module = HotwordDetector(access_key=access_key, hotword_path=hotword_path)
                logging.info("Módulo Hotword inicializado correctamente")
            except Exception as e:
                logging.error(f"Error al inicializar HotwordDetector: {e}")
                _hotword_module = None

        # Inicialización opcional de SerialManager
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

        # Inicialización opcional de MQTTClient
        if _mqtt_client is None:
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