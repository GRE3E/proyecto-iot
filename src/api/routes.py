from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from typing import Optional
from datetime import datetime
import json
from sqlalchemy.orm import Session
from src.ai.nlp.nlp_core import NLPModule
from src.ai.stt.stt import STTModule
from src.ai.speaker.speaker import SpeakerRecognitionModule
from src.db.database import SessionLocal
from src.db.models import APILog
from .schemas import NLPQuery, NLPResponse, StatusResponse, AssistantNameUpdate, OwnerNameUpdate, STTRequest, STTResponse, SpeakerRegisterRequest, SpeakerIdentifyRequest, SpeakerIdentifyResponse
import os
from pathlib import Path
import tempfile

router = APIRouter()
_nlp_module: Optional[NLPModule] = None
_stt_module: Optional[STTModule] = None
_speaker_module: Optional[SpeakerRecognitionModule] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _save_api_log(endpoint: str, request_body: dict, response_data: dict, db: Session):
    """Guarda un log de la interacción de la API en la base de datos."""
    log_entry = APILog(
        timestamp=datetime.now(),
        endpoint=endpoint,
        request_body=json.dumps(request_body, ensure_ascii=False),
        response_data=json.dumps(response_data, ensure_ascii=False)
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

def initialize_nlp():
    """Inicializa los módulos NLP, STT y Speaker."""
    global _nlp_module, _stt_module, _speaker_module
    _nlp_module = NLPModule()
    _stt_module = STTModule()
    _speaker_module = SpeakerRecognitionModule()

@router.get("/status", response_model=StatusResponse)
async def get_status(db: Session = Depends(get_db)):
    """Devuelve el estado actual de los módulos."""
    status = StatusResponse(
        nlp="ONLINE" if _nlp_module.is_online() else "OFFLINE",
        stt="ONLINE" if _stt_module.is_online() else "OFFLINE",
        speaker="ONLINE" if _speaker_module.is_online() else "OFFLINE"
    )
    return status

@router.post("/nlp/query", response_model=NLPResponse)
async def query_nlp(query: NLPQuery, request: Request, db: Session = Depends(get_db)):
    """Procesa una consulta NLP y devuelve la respuesta generada."""
    if _nlp_module is None or not _nlp_module.is_online():
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    response = _nlp_module.generate_response(query.prompt)
    if response is None:
        raise HTTPException(status_code=500, detail="Failed to generate response")
    
    _save_api_log("/nlp/query", query.dict(), NLPResponse(response=response).dict(), db)
    return NLPResponse(response=response)

@router.post("/stt/transcribe", response_model=STTResponse)
async def transcribe_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Convierte voz a texto usando el módulo STT."""
    if _stt_module is None or not _stt_module.is_online():
        raise HTTPException(status_code=503, detail="STT module is offline")
    
    # Guardar el archivo de audio temporalmente en un directorio temporal
    with tempfile.TemporaryDirectory() as tmpdir:
        file_location = Path(tmpdir) / audio_file.filename
        with open(file_location, "wb+") as file_object:
            file_object.write(await audio_file.read())
        
        transcribed_text = _stt_module.transcribe_audio(str(file_location))

    if transcribed_text is None:
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")
    
    _save_api_log("/stt/transcribe", {"filename": audio_file.filename}, STTResponse(text=transcribed_text).dict(), db)
    return STTResponse(text=transcribed_text)

@router.post("/speaker/register", response_model=StatusResponse)
async def register_speaker(name: str, audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Registra un nuevo usuario con su voz."""
    if _speaker_module is None or not _speaker_module.is_online():
        raise HTTPException(status_code=503, detail="Speaker module is offline")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        file_location = Path(tmpdir) / audio_file.filename
        with open(file_location, "wb+") as file_object:
            file_object.write(await audio_file.read())
        
        success = _speaker_module.register_speaker(name, str(file_location))

    if not success:
        raise HTTPException(status_code=500, detail="Failed to register speaker")
    
    response_data = StatusResponse(nlp="ONLINE" if _nlp_module.is_online() else "OFFLINE",
                                   stt="ONLINE" if _stt_module.is_online() else "OFFLINE",
                                   speaker="ONLINE" if _speaker_module.is_online() else "OFFLINE")
    _save_api_log("/speaker/register", {"name": name, "filename": audio_file.filename}, response_data.dict(), db)
    return response_data

@router.post("/speaker/identify", response_model=SpeakerIdentifyResponse)
async def identify_speaker(audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Identifica quién habla."""
    if _speaker_module is None or not _speaker_module.is_online():
        raise HTTPException(status_code=503, detail="Speaker module is offline")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        file_location = Path(tmpdir) / audio_file.filename
        with open(file_location, "wb+") as file_object:
            file_object.write(await audio_file.read())
        
        identified_speaker = _speaker_module.identify_speaker(str(file_location))

    if identified_speaker is None: # Check for None explicitly
        raise HTTPException(status_code=500, detail="Failed to identify speaker")
    
    _save_api_log("/speaker/identify", {"filename": audio_file.filename}, SpeakerIdentifyResponse(speaker_name=identified_speaker).dict(), db)
    return SpeakerIdentifyResponse(speaker_name=identified_speaker)

@router.put("/config/assistant-name", response_model=StatusResponse)
async def update_assistant_name(update: AssistantNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del asistente en la configuración."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    try:
        _nlp_module._config["assistant_name"] = update.name
        _nlp_module._save_config()
        initialize_nlp()
        response_data = StatusResponse(nlp="ONLINE" if _nlp_module.is_online() else "OFFLINE",
                                       stt="ONLINE" if _stt_module.is_online() else "OFFLINE",
                                       speaker="ONLINE" if _speaker_module.is_online() else "OFFLINE")
        _save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update assistant name: {str(e)}")

@router.put("/config/owner-name", response_model=StatusResponse)
async def update_owner_name(update: OwnerNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del propietario en la configuración."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    try:
        _nlp_module._config["owner_name"] = update.name
        _nlp_module._save_config()
        initialize_nlp()
        response_data = StatusResponse(nlp="ONLINE" if _nlp_module.is_online() else "OFFLINE",
                                       stt="ONLINE" if _stt_module.is_online() else "OFFLINE",
                                       speaker="ONLINE" if _speaker_module.is_online() else "OFFLINE")
        _save_api_log("/config/owner-name", update.dict(), response_data.dict(), db)
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update owner name: {str(e)}")