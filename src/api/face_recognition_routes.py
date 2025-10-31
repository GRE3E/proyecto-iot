from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends
from typing import List, Optional
import tempfile
import os
import uuid
import logging
from src.rc.rc_core import FaceRecognitionCore
from src.api.face_recognition_schemas import (
    ResponseModel,
    RecognitionResponse,
    UserResponse,
    StatusResponse,
)
from src.auth.auth_service import get_current_user
from src.api.utils import generate_random_password

logger = logging.getLogger("APIRoutes")

face_core = FaceRecognitionCore()

face_recognition_router = APIRouter(
    prefix="/rc",
    tags=["rc"],
    dependencies=[Depends(get_current_user)]
)

@face_recognition_router.get("/users", response_model=List[UserResponse])
async def list_users():
    """
    Lista todos los usuarios registrados en el sistema.
    """
    try:
        users = await face_core.list_users()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.post("/users/{user_name}", response_model=ResponseModel)
async def register_user(user_name: str, num_photos: int = Query(default=5, ge=1, le=10)):
    """
    Registra un nuevo usuario en el sistema.
    """
    try:
        generated_password = generate_random_password()
        result = await face_core.register_user(user_name, num_photos, generated_password)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.post("/users/{user_id}/register_face", response_model=ResponseModel)
async def register_face_to_existing_user(user_id: int, num_photos: int = Query(default=5, ge=1, le=10)):
    """
    Registra el reconocimiento facial para un usuario existente por su ID.
    """
    try:
        result = await face_core.register_face_to_existing_user(user_id, num_photos)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.delete("/users/{user_name}", response_model=ResponseModel)
async def delete_user(user_name: str):
    """
    Elimina un usuario del sistema.
    """
    try:
        result = await face_core.delete_user(user_name)
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.post("/recognize", response_model=RecognitionResponse)
async def recognize_face(
    source: str = Query(default="camera", regex="^(camera|[^/]+)$"),
    file: Optional[UploadFile] = File(None),
):
    """
    Realiza el reconocimiento facial desde una fuente específica.
    """
    temp_path = None
    try:
        if file:
            suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
            temp_name = f"rc_upload_{uuid.uuid4().hex}{suffix}"
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, temp_name)
            with open(temp_path, "wb") as f:
                f.write(await file.read())
            source_param = temp_path
        else:
            source_param = source

        result = await face_core.recognize_face(source=source_param)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en recognize_face")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                logger.warning("No se pudo borrar archivo temporal %s", temp_path)

@face_recognition_router.get("/status", response_model=StatusResponse)
async def get_status():
    """
    Verifica el estado del sistema de reconocimiento facial.
    """
    try:
        is_online = face_core.is_online()
        return {"status": "online" if is_online else "offline"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
