from fastapi import APIRouter, HTTPException, Depends
import logging
from sqlalchemy.orm import Session

from src.db.database import SessionLocal
from src.api.schemas import StatusResponse
from src.api.hotword_routes import hotword_router
from src.api.tts_routes import tts_router
from src.api.nlp_routes import nlp_router
from src.api.stt_routes import stt_router
from src.api.speaker_routes import speaker_router
from src.api.iot_routes import iot_router
from src.api.addons_routes import router as addons_router
from src.api.permissions_routes import router as permissions_router
from src.api.face_recognition_routes import face_recognition_router  # 👈 import correcto
from src.api import utils

logger = logging.getLogger("APIRoutes")

router = APIRouter()

# === Rutas incluidas (sin alterar nada del servidor principal) ===
router.include_router(hotword_router, prefix="/hotword", tags=["hotword"])
router.include_router(tts_router, prefix="/tts", tags=["tts"])
router.include_router(nlp_router, prefix="/nlp", tags=["nlp"])
router.include_router(stt_router, prefix="/stt", tags=["stt"])
router.include_router(speaker_router, prefix="/speaker", tags=["speaker"])
router.include_router(iot_router, prefix="/iot", tags=["iot"])
router.include_router(addons_router, prefix="/addons", tags=["addons"])
router.include_router(permissions_router, prefix="/permissions", tags=["permissions"])


def get_db():
    """
    Dependencia que proporciona una sesión de base de datos.
    Cada solicitud obtendrá su propia sesión de base de datos que se cerrará después.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/status", response_model=StatusResponse)
async def get_status(db: Session = Depends(get_db)):
    """Devuelve el estado actual de los módulos."""
    try:
        status = utils.get_module_status()
        logger.info(f"Status Response para /status: {status.model_dump_json()}")
        return status
    except Exception as e:
        logger.error(f"Error al obtener estado para /status: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
