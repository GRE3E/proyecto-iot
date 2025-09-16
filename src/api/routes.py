from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from typing import Optional
from datetime import datetime
import json
import asyncio
import logging
from sqlalchemy.orm import Session
from src.ai.nlp.nlp_core import NLPModule
from src.ai.stt.stt import STTModule
from src.ai.speaker.speaker import SpeakerRecognitionModule
from src.ai.hotword.hotword import HotwordDetector
from src.db.database import SessionLocal
from src.db.models import APILog
from .schemas import (
    NLPQuery, NLPResponse, StatusResponse, AssistantNameUpdate, 
    OwnerNameUpdate, STTRequest, STTResponse, SpeakerRegisterRequest, 
    SpeakerIdentifyRequest, SpeakerIdentifyResponse, HotwordAudioProcessRequest, 
    HotwordAudioProcessResponse, ContinuousListeningToggle, ContinuousListeningResponse
)
import os
from pathlib import Path
import tempfile
import httpx
import pyaudio
import wave
import numpy as np
from src.iot.serial_manager import SerialManager
from src.iot.mqtt_client import MQTTClient

router = APIRouter()
_nlp_module: Optional[NLPModule] = None
_stt_module: Optional[STTModule] = None
_speaker_module: Optional[SpeakerRecognitionModule] = None
_hotword_module: Optional[HotwordDetector] = None
_serial_manager: Optional[SerialManager] = None
_mqtt_client: Optional[MQTTClient] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
        _stt_module = STTModule()
        _speaker_module = SpeakerRecognitionModule()
        
        access_key = os.getenv("PICOVOICE_ACCESS_KEY")
        hotword_path = os.getenv("HOTWORD_PATH")
        
        if not access_key or not hotword_path:
            logging.warning("PICOVOICE_ACCESS_KEY o HOTWORD_PATH no configurados. El módulo Hotword no se inicializará.")
            _hotword_module = None
        else:
            _hotword_module = HotwordDetector(access_key=access_key, hotword_path=hotword_path)
            logging.info("Módulo Hotword inicializado correctamente")

        # Inicialización opcional de SerialManager
        serial_port = os.getenv("SERIAL_PORT")
        serial_baudrate = os.getenv("SERIAL_BAUDRATE")
        if serial_port and serial_baudrate:
            try:
                _serial_manager = SerialManager(port=serial_port, baudrate=int(serial_baudrate))
                logging.info(f"SerialManager inicializado y conectado en {serial_port}:{serial_baudrate}")
            except Exception as e:
                logging.error(f"Error al inicializar SerialManager: {e}")
                _serial_manager = None
        else:
            logging.info("Variables de entorno SERIAL_PORT o SERIAL_BAUDRATE no configuradas. SerialManager no se inicializará.")

        # Inicialización opcional de MQTTClient
        mqtt_broker = os.getenv("MQTT_BROKER")
        mqtt_port = os.getenv("MQTT_PORT")
        if mqtt_broker and mqtt_port:
            try:
                _mqtt_client = MQTTClient(broker=mqtt_broker, port=int(mqtt_port))
                logging.info(f"MQTTClient inicializado y conectado en {mqtt_broker}:{mqtt_port}")
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

async def continuous_audio_processing_loop():
    """Bucle de procesamiento de audio continuo."""
    from fastapi import FastAPI
    app = FastAPI.current()  # Obtener la instancia actual de FastAPI
    
    logging.info("[Escucha Continua] Iniciando procesamiento de audio continuo...")
    
    try:
        p = pyaudio.PyAudio()
        stream = p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=16000,
            input=True,
            frames_per_buffer=1024
        )

        while not app.state.stop_continuous_listening_event.is_set():
            try:
                frames = []
                # Grabar un pequeño fragmento de audio (3 segundos)
                for _ in range(0, int(16000 / 1024 * 3)):
                    if app.state.stop_continuous_listening_event.is_set():
                        break
                    data = stream.read(1024, exception_on_overflow=False)
                    frames.append(data)
                
                if app.state.stop_continuous_listening_event.is_set():
                    break
                
                audio_filename = f"continuous_audio_{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"
                
                try:
                    wf = wave.open(audio_filename, 'wb')
                    wf.setnchannels(1)
                    wf.setsampwidth(p.get_sample_size(pyaudio.paInt16))
                    wf.setframerate(16000)
                    wf.writeframes(b''.join(frames))
                    wf.close()

                    async with httpx.AsyncClient(timeout=30.0) as client:
                        try:
                            with open(audio_filename, "rb") as f:
                                files = {'audio_file': (audio_filename, f, 'audio/wav')}
                                response = await client.post("http://localhost:8000/hotword/process_audio", files=files)
                                response.raise_for_status()
                                result = response.json()
                                logging.info(f"[Escucha Continua] Respuesta de la API: {result}")
                        except httpx.RequestError as e:
                            logging.error(f"[Escucha Continua] Falló la solicitud HTTP: {e}")
                        except httpx.HTTPStatusError as e:
                            logging.error(f"[Escucha Continua] Error de estado HTTP: {e.response.status_code} - {e.response.text}")
                        except Exception as e:
                            logging.error(f"[Escucha Continua] Error en la solicitud: {e}")
                finally:
                    # Limpiar el archivo de audio
                    try:
                        if os.path.exists(audio_filename):
                            os.remove(audio_filename)
                    except Exception as e:
                        logging.warning(f"[Escucha Continua] No se pudo eliminar {audio_filename}: {e}")
                
                # Pequeño retraso para evitar el busy-waiting
                await asyncio.sleep(0.1)

            except Exception as e:
                logging.error(f"[Escucha Continua] Error en el bucle: {e}")
                await asyncio.sleep(1)  # Esperar antes de continuar

        stream.stop_stream()
        stream.close()
        p.terminate()
        logging.info("[Escucha Continua] Procesamiento de audio continuo detenido.")
        
    except Exception as e:
        logging.error(f"[Escucha Continua] Error crítico: {e}")
    finally:
        logging.info("[Escucha Continua] Finalizando bucle de audio.")

@router.get("/status", response_model=StatusResponse)
async def get_status(db: Session = Depends(get_db)):
    """Devuelve el estado actual de los módulos."""
    try:
        nlp_status = "ONLINE" if _nlp_module and _nlp_module.is_online() else "OFFLINE"
        stt_status = "ONLINE" if _stt_module and _stt_module.is_online() else "OFFLINE"
        speaker_status = "ONLINE" if _speaker_module and _speaker_module.is_online() else "OFFLINE"
        hotword_status = "ONLINE" if _hotword_module else "OFFLINE"
        serial_status = "ONLINE" if _serial_manager and _serial_manager.is_connected() else "OFFLINE"
        mqtt_status = "ONLINE" if _mqtt_client and _mqtt_client.is_connected() else "OFFLINE"
        
        status = StatusResponse(
            nlp=nlp_status,
            stt=stt_status,
            speaker=speaker_status,
            hotword=hotword_status,
            serial=serial_status,
            mqtt=mqtt_status
        )
        return status
    except Exception as e:
        logging.error(f"Error al obtener estado: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/nlp/query", response_model=NLPResponse)
async def query_nlp(query: NLPQuery, request: Request, db: Session = Depends(get_db)):
    """Procesa una consulta NLP y devuelve la respuesta generada."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    if not _nlp_module.is_online():
        # Intentar reconectar
        try:
            _nlp_module.reload()
            if not _nlp_module.is_online():
                raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")
        except Exception as e:
            logging.error(f"Error al recargar módulo NLP: {e}")
            raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")
    
    try:
        response = await _nlp_module.generate_response(query.prompt)
        if response is None:
            raise HTTPException(status_code=500, detail="No se pudo generar la respuesta")
        
        response_obj = NLPResponse(response=response)
        _save_api_log("/nlp/query", query.dict(), response_obj.dict(), db)
        return response_obj
        
    except Exception as e:
        logging.error(f"Error en consulta NLP: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar la consulta NLP")

@router.post("/stt/transcribe", response_model=STTResponse)
async def transcribe_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Convierte voz a texto usando el módulo STT."""
    if _stt_module is None or not _stt_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo STT está fuera de línea")
    
    # Guardar el archivo de audio temporalmente en un directorio temporal
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            transcribed_text = _stt_module.transcribe_audio(str(file_location))

        if transcribed_text is None:
            raise HTTPException(status_code=500, detail="No se pudo transcribir el audio")
        
        response_obj = STTResponse(text=transcribed_text)
        _save_api_log("/stt/transcribe", {"filename": audio_file.filename}, response_obj.dict(), db)
        return response_obj
        
    except Exception as e:
        logging.error(f"Error en transcripción STT: {e}")
        raise HTTPException(status_code=500, detail="Error al transcribir el audio")

@router.post("/speaker/register", response_model=StatusResponse)
async def register_speaker(name: str, audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Registra un nuevo usuario con su voz."""
    if _speaker_module is None or not _speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            success = _speaker_module.register_speaker(name, str(file_location))

        if not success:
            raise HTTPException(status_code=500, detail="No se pudo registrar al hablante")
        
        response_data = StatusResponse(
            nlp="ONLINE" if _nlp_module and _nlp_module.is_online() else "OFFLINE",
            stt="ONLINE" if _stt_module and _stt_module.is_online() else "OFFLINE",
            speaker="ONLINE" if _speaker_module and _speaker_module.is_online() else "OFFLINE"
        )
        _save_api_log("/speaker/register", {"name": name, "filename": audio_file.filename}, response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al registrar hablante: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar el hablante")

@router.post("/speaker/identify", response_model=SpeakerIdentifyResponse)
async def identify_speaker(audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Identifica quién habla."""
    if _speaker_module is None or not _speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            identified_speaker = _speaker_module.identify_speaker(str(file_location))

        if identified_speaker is None:  # Check for None explicitly
            raise HTTPException(status_code=500, detail="No se pudo identificar al hablante")
        
        response_obj = SpeakerIdentifyResponse(speaker_name=identified_speaker)
        _save_api_log("/speaker/identify", {"filename": audio_file.filename}, response_obj.dict(), db)
        return response_obj
        
    except Exception as e:
        logging.error(f"Error al identificar hablante: {e}")
        raise HTTPException(status_code=500, detail="Error al identificar el hablante")

@router.post("/hotword/process_audio", response_model=HotwordAudioProcessResponse)
async def process_hotword_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Procesa el audio después de la detección de hotword: STT, identificación de hablante y NLP."""
    if _stt_module is None or not _stt_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo STT está fuera de línea")
    if _speaker_module is None or not _speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    if _nlp_module is None or not _nlp_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")

    transcribed_text = ""
    identified_speaker = "Unknown"
    nlp_response = ""

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)

            # 1. Transcripción de voz a texto
            transcribed_text = _stt_module.transcribe_audio(str(file_location))
            if transcribed_text is None:
                raise HTTPException(status_code=500, detail="No se pudo transcribir el audio después de la hotword")

            # 2. Identificación de hablante
            identified_speaker = _speaker_module.identify_speaker(str(file_location))
            if identified_speaker is None:
                identified_speaker = "Unknown"

            # 3. Procesamiento NLP
            nlp_response = await _nlp_module.generate_response(transcribed_text)
            if nlp_response is None:
                raise HTTPException(status_code=500, detail="No se pudo generar la respuesta NLP después de la hotword")

        response_data = HotwordAudioProcessResponse(
            transcribed_text=transcribed_text,
            identified_speaker=identified_speaker,
            nlp_response=nlp_response
        )
        _save_api_log("/hotword/process_audio", {"filename": audio_file.filename}, response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error en procesamiento de hotword: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el audio después de hotword")

@router.put("/config/assistant-name", response_model=StatusResponse)
async def update_assistant_name(update: AssistantNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del asistente en la configuración."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    try:
        _nlp_module._config["assistant_name"] = update.name
        _nlp_module._save_config()
        initialize_nlp()
        
        response_data = StatusResponse(
            nlp="ONLINE" if _nlp_module and _nlp_module.is_online() else "OFFLINE",
            stt="ONLINE" if _stt_module and _stt_module.is_online() else "OFFLINE",
            speaker="ONLINE" if _speaker_module and _speaker_module.is_online() else "OFFLINE"
        )
        _save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al actualizar nombre del asistente: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar el nombre del asistente: {str(e)}")

@router.put("/config/owner-name", response_model=StatusResponse)
async def update_owner_name(update: OwnerNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del propietario en la configuración."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    try:
        _nlp_module._config["owner_name"] = update.name
        _nlp_module._save_config()
        initialize_nlp()
        
        response_data = StatusResponse(
            nlp="ONLINE" if _nlp_module and _nlp_module.is_online() else "OFFLINE",
            stt="ONLINE" if _stt_module and _stt_module.is_online() else "OFFLINE",
            speaker="ONLINE" if _speaker_module and _speaker_module.is_online() else "OFFLINE"
        )
        _save_api_log("/config/owner-name", update.dict(), response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al actualizar nombre del propietario: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar el nombre del propietario: {str(e)}")

@router.post("/continuous_listening", response_model=ContinuousListeningResponse)
async def toggle_continuous_listening(request: ContinuousListeningToggle):
    """Controla la escucha continua (iniciar/detener)."""
    try:
        # Obtener la instancia de la aplicación desde el contexto
        from fastapi import Request
        from starlette.applications import Starlette
        import inspect
        
        # Buscar la instancia de FastAPI en el stack de llamadas
        frame = inspect.currentframe()
        app = None
        while frame:
            if 'app' in frame.f_locals and hasattr(frame.f_locals['app'], 'state'):
                app = frame.f_locals['app']
                break
            frame = frame.f_back
        
        if not app:
            return ContinuousListeningResponse(status="error", message="No se pudo acceder al estado de la aplicación.")
        
        if request.action == "start":
            if hasattr(app.state, 'continuous_listening_task') and \
               app.state.continuous_listening_task and \
               not app.state.continuous_listening_task.done():
                return ContinuousListeningResponse(status="error", message="La escucha continua ya está activa.")
            
            if not hasattr(app.state, 'stop_continuous_listening_event'):
                app.state.stop_continuous_listening_event = asyncio.Event()
                
            app.state.stop_continuous_listening_event.clear()
            app.state.continuous_listening_task = asyncio.create_task(continuous_audio_processing_loop())
            return ContinuousListeningResponse(status="success", message="Escucha continua iniciada.")
            
        elif request.action == "stop":
            if not hasattr(app.state, 'continuous_listening_task') or \
               not app.state.continuous_listening_task or \
               app.state.continuous_listening_task.done():
                return ContinuousListeningResponse(status="error", message="La escucha continua no está activa.")
            
            app.state.stop_continuous_listening_event.set()
            try:
                await asyncio.wait_for(app.state.continuous_listening_task, timeout=5.0)
            except asyncio.TimeoutError:
                app.state.continuous_listening_task.cancel()
                return ContinuousListeningResponse(status="warning", message="Tarea de escucha continua cancelada debido a tiempo de espera.")
            finally:
                app.state.continuous_listening_task = None
            return ContinuousListeningResponse(status="success", message="Escucha continua detenida.")
            
        else:
            return ContinuousListeningResponse(status="error", message="Acción inválida. Usa 'start' o 'stop'.")
            
    except Exception as e:
        logging.error(f"Error en toggle_continuous_listening: {e}")
        return ContinuousListeningResponse(status="error", message=f"Error interno: {str(e)}")