import os
import tempfile
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import Dict
from sqlalchemy import select
from src.db.database import get_db
from src.db.models import User
from src.auth.jwt_manager import verify_token
from jose import JWTError
from src.auth.auth_service import get_current_user
from src.api.camera_schemas import (
    CameraListResponse,
    CameraInfo,
    CameraStartRequest,
    SnapshotRecognizeResponse,
)
from src.api import utils
from src.cameras.camera_manager import CameraManager


camera_router = APIRouter()
_camera_manager: CameraManager | None = None


def _get_camera_manager() -> CameraManager:
    global _camera_manager
    if _camera_manager is None:
        _camera_manager = CameraManager()
    return _camera_manager


@camera_router.get("/cameras", response_model=CameraListResponse)
async def list_cameras() -> CameraListResponse:
    mgr = _get_camera_manager()
    cams = mgr.list_cameras()
    return {"cameras": {k: CameraInfo(**v) for k, v in cams.items()}}


@camera_router.post("/cameras/{camera_id}/start", response_model=Dict[str, str])
async def start_camera(camera_id: str, req: CameraStartRequest | None = None) -> Dict[str, str]:
    mgr = _get_camera_manager()
    ok = mgr.start(camera_id, recognition_enabled=(req.recognition_enabled if req else None))
    if not ok:
        raise HTTPException(status_code=404, detail="No se pudo iniciar la cámara o no existe")
    return {"message": "Cámara iniciada"}


@camera_router.post("/cameras/{camera_id}/stop", response_model=Dict[str, str])
async def stop_camera(camera_id: str) -> Dict[str, str]:
    mgr = _get_camera_manager()
    ok = mgr.stop(camera_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    return {"message": "Cámara detenida"}


# Reconocimiento siempre habilitado por defecto en "door"; no exponemos toggle en API


@camera_router.get("/cameras/{camera_id}/stream")
async def stream_camera(camera_id: str):
    mgr = _get_camera_manager()
    gen = mgr.mjpeg_stream(camera_id)
    return StreamingResponse(gen, media_type="multipart/x-mixed-replace; boundary=frame")


@camera_router.post("/cameras/{camera_id}/snapshot-recognize", response_model=SnapshotRecognizeResponse)
async def snapshot_and_recognize(camera_id: str) -> SnapshotRecognizeResponse:
    mgr = _get_camera_manager()
    jpg_bytes = mgr.get_snapshot(camera_id)
    if not jpg_bytes:
        raise HTTPException(status_code=500, detail="No se pudo capturar imagen de la cámara")

    if not utils._face_recognition_module:
        raise HTTPException(status_code=503, detail="El módulo de reconocimiento facial está fuera de línea")

    with tempfile.NamedTemporaryFile(delete=True, suffix=".jpg") as tmp:
        tmp.write(jpg_bytes)
        tmp.flush()
        result = await utils._face_recognition_module.recognize_face(source=tmp.name)

    if not result.get("success", False):
        return SnapshotRecognizeResponse(success=False, message=result.get("message"))

    return SnapshotRecognizeResponse(
        success=True,
        message=result.get("message"),
        recognized_users=result.get("recognized_users"),
        user_id=result.get("user_id"),
        auth=result.get("auth"),
    )


# Endpoints auxiliares eliminados para simplificar API


# Stream se mantiene sólo en versión autenticada por header
@camera_router.get("/cameras/{camera_id}/stream-public")
async def stream_camera_public(camera_id: str, token: str):
    try:
        payload = verify_token(token)
        user_id = int(payload.get("sub"))
        async with get_db() as db:
            result = await db.execute(select(User).filter(User.id == user_id))
            if not result.scalar_one_or_none():
                raise HTTPException(status_code=401, detail="Token inválido")
    except HTTPException:
        raise
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {e}")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    mgr = _get_camera_manager()
    gen = mgr.mjpeg_stream(camera_id)
    return StreamingResponse(gen, media_type="multipart/x-mixed-replace; boundary=frame")
