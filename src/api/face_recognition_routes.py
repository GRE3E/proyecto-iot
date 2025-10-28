from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.database import get_db
from src.db.models import User
from src.rc.rc_core import FaceRecognitionCore
from src.api.face_recognition_schemas import (
    UserRegistrationResponse,
    UserDeletionResponse,
    UserRecognitionResponse,
    UserListResponse,
    UserResponse
)
from typing import List
import logging

logger = logging.getLogger("FaceRecognitionAPI")

face_recognition_router = APIRouter(
    prefix="/face-recognition",
    tags=["face-recognition"]
)

face_core = FaceRecognitionCore()

@face_recognition_router.post("/register/{user_name}", response_model=UserRegistrationResponse)
async def register_user(
    user_name: str,
    num_photos: int = 5,
    db: AsyncSession = Depends(get_db)
):
    """
    Registra un nuevo usuario tomando fotos desde la cámara.
    
    Args:
        user_name (str): Nombre del usuario a registrar
        num_photos (int): Número de fotos a tomar
        db (AsyncSession): Sesión de base de datos
        
    Returns:
        UserRegistrationResponse: Resultado del registro
    """
    try:
        result = await face_core.register_user(user_name, num_photos)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Error en registro de usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.delete("/users/{user_name}", response_model=UserDeletionResponse)
async def delete_user(
    user_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina un usuario y sus datos asociados.
    
    Args:
        user_name (str): Nombre del usuario a eliminar
        db (AsyncSession): Sesión de base de datos
        
    Returns:
        UserDeletionResponse: Resultado de la eliminación
    """
    try:
        result = await face_core.delete_user(user_name)
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Error eliminando usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.post("/recognize", response_model=UserRecognitionResponse)
async def recognize_face(
    source: str = "camera",
    db: AsyncSession = Depends(get_db)
):
    """
    Realiza reconocimiento facial desde cámara o archivo.
    
    Args:
        source (str): "camera" o ruta a imagen
        db (AsyncSession): Sesión de base de datos
        
    Returns:
        UserRecognitionResponse: Resultado del reconocimiento
    """
    try:
        result = await face_core.recognize_face(source)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Error en reconocimiento facial: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.get("/users", response_model=List[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db)):
    """
    Lista todos los usuarios registrados.
    
    Args:
        db (AsyncSession): Sesión de base de datos
        
    Returns:
        List[UserResponse]: Lista de usuarios
    """
    try:
        users = await face_core.list_users()
        return users
    except Exception as e:
        logger.error(f"Error listando usuarios: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.post("/users/{user_name}/photo", response_model=UserRegistrationResponse)
async def upload_user_photo(
    user_name: str,
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Sube una foto para un usuario existente.
    
    Args:
        user_name (str): Nombre del usuario
        photo (UploadFile): Archivo de imagen
        db (AsyncSession): Sesión de base de datos
        
    Returns:
        UserRegistrationResponse: Resultado de la subida
    """
    try:
        # TODO: Implementar lógica para procesar y guardar la foto
        raise HTTPException(status_code=501, detail="Funcionalidad no implementada")
    except Exception as e:
        logger.error(f"Error subiendo foto: {e}")
        raise HTTPException(status_code=500, detail=str(e))
