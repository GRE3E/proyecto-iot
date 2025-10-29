from fastapi import APIRouter, HTTPException, Depends
import logging
from src.api.schemas import StatusResponse
from src.api.hotword_routes import hotword_router
from src.api.tts_routes import tts_router
from src.api.nlp_routes import nlp_router
from src.api.stt_routes import stt_router
from src.api.speaker_routes import speaker_router
from src.api.iot_routes import iot_router
from src.api.addons_routes import router as addons_router
from src.api.permissions_routes import router as permissions_router
from src.api.face_recognition_routes import face_recognition_router
from src.api.auth_router import router as auth_router
from src.api import utils
from src.auth.auth_service import get_current_user

logger = logging.getLogger("APIRoutes")

router = APIRouter()

# Incluir los demás routers
router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(hotword_router, prefix="/hotword", tags=["hotword"], dependencies=[Depends(get_current_user)])
router.include_router(tts_router, prefix="/tts", tags=["tts"], dependencies=[Depends(get_current_user)])
router.include_router(nlp_router, prefix="/nlp", tags=["nlp"], dependencies=[Depends(get_current_user)])
router.include_router(stt_router, prefix="/stt", tags=["stt"], dependencies=[Depends(get_current_user)])
router.include_router(speaker_router, prefix="/speaker", tags=["speaker"], dependencies=[Depends(get_current_user)])
router.include_router(iot_router, prefix="/iot", tags=["iot"], dependencies=[Depends(get_current_user)])
router.include_router(addons_router, prefix="/addons", tags=["addons"], dependencies=[Depends(get_current_user)])
router.include_router(permissions_router, prefix="/permissions", tags=["permissions"], dependencies=[Depends(get_current_user)])
router.include_router(face_recognition_router, prefix="/rc", tags=["rc"], dependencies=[Depends(get_current_user)])

@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Devuelve el estado actual de los módulos."""
    try:
        status = utils.get_module_status()
        logger.info(f"Status Response para /status: {status.model_dump_json()}")
        return status
    except Exception as e:
        logger.error(f"Error al obtener estado para /status: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
