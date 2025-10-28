from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.database import get_async_db_session
from src.rc.rc_core import FaceRecognitionCore
from src.api.face_recognition_schemas import (
    UserRegistrationRequest,
    UserIdentificationRequest,
    AddFaceToUserRequest,
    FaceQualityRequest,
    BaseResponse,
    UserIdentificationResponse,
    UserListResponse,
    FaceQualityResponse
)
import logging

router = APIRouter(prefix="/rc", tags=["Reconocimiento Facial"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=BaseResponse)
async def register_user(
    request: UserRegistrationRequest,
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    Registra un nuevo usuario mediante reconocimiento facial automático.
    La captura se realiza automáticamente cuando se detecta un rostro de calidad adecuada.
    """
    try:
        face_core = FaceRecognitionCore()
        result = await face_core.register_user_auto(
            request.name,
            request.video_source
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
            
        return result

    except Exception as e:
        logger.error(f"Error en registro de usuario: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error en registro de usuario: {str(e)}"
        )

@router.post("/identify", response_model=UserIdentificationResponse)
async def identify_user(
    request: UserIdentificationRequest,
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    Identifica al usuario que se encuentra frente a la cámara.
    Realiza reconocimiento facial en tiempo real hasta encontrar una coincidencia.
    """
    try:
        face_core = FaceRecognitionCore()
        result = await face_core.identify_user(request.video_source)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
            
        return result

    except Exception as e:
        logger.error(f"Error en identificación de usuario: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error en identificación: {str(e)}"
        )

@router.post("/add-face", response_model=BaseResponse)
async def add_face_to_user(
    request: AddFaceToUserRequest,
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    Añade reconocimiento facial a un usuario existente identificado por su ID.
    Captura automáticamente imágenes del rostro y genera los encodings correspondientes.
    """
    try:
        face_core = FaceRecognitionCore()
        result = await face_core.add_face_to_user(
            request.user_id,
            request.video_source
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
            
        return result

    except Exception as e:
        logger.error(f"Error añadiendo reconocimiento facial: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error añadiendo reconocimiento facial: {str(e)}"
        )

@router.get("/users", response_model=UserListResponse)
async def list_users(db: AsyncSession = Depends(get_async_db_session)):
    """
    Lista todos los usuarios registrados con reconocimiento facial.
    Incluye información sobre sus encodings y fechas de registro/actualización.
    """
    try:
        face_core = FaceRecognitionCore()
        result = await face_core.list_registered_users()
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
            
        return result

    except Exception as e:
        logger.error(f"Error listando usuarios: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listando usuarios: {str(e)}"
        )

@router.post("/verify-quality", response_model=FaceQualityResponse)
async def verify_face_quality(
    request: FaceQualityRequest,
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    Verifica la calidad de una imagen facial.
    Evalúa aspectos como iluminación, nitidez y posición del rostro.
    """
    try:
        face_core = FaceRecognitionCore()
        result = await face_core.verify_face_quality(request.image_path)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
            
        return result

    except Exception as e:
        logger.error(f"Error verificando calidad facial: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error verificando calidad facial: {str(e)}"
        )
