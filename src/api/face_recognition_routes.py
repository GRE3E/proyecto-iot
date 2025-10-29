from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from typing import List, Optional
import tempfile
import os
import uuid
import logging
from src.rc.rc_core import FaceRecognitionCore
from src.api.face_recognition_schemas import (
    UserRegistrationResponse,
    UserDeletionResponse,
    UserRecognitionResponse,
    UserResponse,
)
from src.auth.jwt_manager import get_current_user

logger = logging.getLogger("APIRoutes")

face_core = FaceRecognitionCore()

face_recognition_router = APIRouter(
    prefix="/rc",
    tags=["rc"]
)

@face_recognition_router.post("/register/{user_name}", response_model=UserRegistrationResponse)
async def register_user(user_name: str, num_photos: int = Query(5, ge=1, le=20), current_user: dict = Depends(get_current_user)):
    """
    Registra un usuario: toma fotos (desde la cámara) y genera encodings.
    Sólo orquesta llamadas al core.
    """
    try:
        result = await face_core.register_user(user_name, num_photos)
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("message", "Registro fallido"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en register_user")
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.delete("/users/{user_name}", response_model=UserDeletionResponse)
async def delete_user(user_name: str, current_user: dict = Depends(get_current_user)):
    """
    Elimina usuario tanto del dataset como de la base de datos.
    """
    try:
        result = await face_core.delete_user(user_name)
        if not result.get("success", False):
            raise HTTPException(status_code=404, detail=result.get("message", "No encontrado"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en delete_user")
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    """
    Lista todos los usuarios registrados (dataset + base de datos).
    """
    try:
        users = await face_core.list_users()
        if not users:
            return []
        formatted = []
        for u in users:
            if isinstance(u, dict):
                formatted.append(u)
            else:
                formatted.append({"nombre": str(u)})
        return formatted
    except Exception as e:
        logger.exception("Error en list_users")
        raise HTTPException(status_code=500, detail=str(e))

@face_recognition_router.post("/recognize", response_model=UserRecognitionResponse)
async def recognize_face(
    source: Optional[str] = Query("camera", description='Use "camera" or provide file (multipart)'),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Reconoce rostros — si se envía un archivo lo usa como fuente, sino usa la cámara.
    Endpoint ligero: guarda temporalmente la imagen (si hay), llama a core.recognize_face y borra temp.
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
            source_param = "camera"

        result = await face_core.recognize_face(source=source_param)
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("message", "Reconocimiento falló"))

        users = result.get("recognized_users") or []
        normalized = []
        for u in users:
            if isinstance(u, str):
                normalized.append(u)
            elif isinstance(u, dict) and "nombre" in u:
                normalized.append(u["nombre"])
            else:
                normalized.append(str(u))

        return {"success": True, "recognized_users": normalized}

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
