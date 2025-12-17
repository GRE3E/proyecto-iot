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

@face_recognition_router.post("/users/{user_id}/upload_faces", response_model=ResponseModel)
async def upload_faces_to_user(user_id: int, files: List[UploadFile] = File(...)):
    """
    Registra el reconocimiento facial subiendo fotos desde el cliente.
    """
    try:
        result = await face_core.register_face_from_uploads(user_id, files)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        return result
    except HTTPException:
        raise
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
        elif source == "camera":
            # Intentar usar CameraManager para evitar conflictos con el stream
            try:
                from src.api.camera_routes import get_camera_manager
                mgr = get_camera_manager()
                # Intentar obtener snapshot de la cámara "door" (principal)
                jpg_bytes = mgr.get_snapshot("door")
                
                if jpg_bytes:
                    logger.info("📸 Captura obtenida desde CameraManager para reconocimiento")
                    suffix = ".jpg"
                    temp_name = f"rc_cam_snap_{uuid.uuid4().hex}{suffix}"
                    temp_dir = tempfile.gettempdir()
                    temp_path = os.path.join(temp_dir, temp_name)
                    with open(temp_path, "wb") as f:
                        f.write(jpg_bytes)
                    source_param = temp_path
                else:
                    logger.warning("⚠️ No se pudo obtener snapshot de CameraManager, intentando acceso directo...")
                    source_param = "camera"
            except Exception as e:
                logger.error(f"Error al intentar usar CameraManager: {e}")
                source_param = "camera"
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
