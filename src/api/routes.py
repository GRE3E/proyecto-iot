from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional
import logging
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.api.schemas import StatusResponse
from src.api.hotword_routes import hotword_router
from src.api.nlp_routes import nlp_router
from src.api.stt_routes import stt_router
from src.api.speaker_routes import speaker_router
from src.api.iot_routes import iot_router
# Importar módulos globales desde utils
from src.api import utils

router = APIRouter()

router.include_router(hotword_router, prefix="/hotword", tags=["hotword"])
router.include_router(nlp_router, prefix="/nlp", tags=["nlp"])
router.include_router(stt_router, prefix="/stt", tags=["stt"])
router.include_router(speaker_router, prefix="/speaker", tags=["speaker"])
router.include_router(iot_router, prefix="/iot", tags=["iot"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/status", response_model=StatusResponse)
async def get_status(db: Session = Depends(get_db)):
    """Devuelve el estado actual de los módulos."""
    try:
        nlp_status = "ONLINE" if utils._nlp_module and utils._nlp_module.is_online() else "OFFLINE"
        stt_status = "ONLINE" if utils._stt_module and utils._stt_module.is_online() else "OFFLINE"
        speaker_status = "ONLINE" if utils._speaker_module and utils._speaker_module.is_online() else "OFFLINE"
        hotword_status = "ONLINE" if utils._hotword_module and utils._hotword_module.is_online() else "OFFLINE"
        serial_status = "ONLINE" if utils._serial_manager and utils._serial_manager.is_connected else "OFFLINE"
        mqtt_status = "ONLINE" if utils._mqtt_client and utils._mqtt_client.is_connected else "OFFLINE"
        
        status = StatusResponse(
            nlp=nlp_status,
            stt=stt_status,
            speaker=speaker_status,
            hotword=hotword_status,
            serial=serial_status,
            mqtt=mqtt_status
        )
        logging.info(f"Status Response: {status.model_dump_json()}")
        return status
    except Exception as e:
        logging.error(f"Error al obtener estado: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")