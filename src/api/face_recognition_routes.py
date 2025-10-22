from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.rc.rc_core import FaceRecognitionCore
import logging

logger = logging.getLogger("FaceRecognitionRoutes")

face_recognition_router = APIRouter()

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@face_recognition_router.post("/capture/{name}")
async def capture_faces_route(name: str, request: Request, cam_id: int = 0, max_imgs: int = 5):
    """Captura imágenes del rostro para un usuario dado."""
    try:
        face_core: FaceRecognitionCore = request.app.state.face_recognition_core
        face_core.capture_faces(name, cam_id, max_imgs)
        return {"message": f"Captura de rostros para {name} completada.", "status": "success"}
    except Exception as e:
        logger.error(f"Error al capturar rostros para {name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al capturar rostros: {e}")

@face_recognition_router.post("/encode")
async def encode_faces_route(request: Request):
    """Codifica los rostros almacenados en la base de datos."""
    try:
        face_core: FaceRecognitionCore = request.app.state.face_recognition_core
        face_core.encode_faces()
        return {"message": "Codificación de rostros completada.", "status": "success"}
    except Exception as e:
        logger.error(f"Error al codificar rostros: {e}")
        raise HTTPException(status_code=500, detail=f"Error al codificar rostros: {e}")

@face_recognition_router.get("/recognize")
async def recognize_faces_route(request: Request, cam_id: int = 0):
    """Reconoce rostros usando la cámara en tiempo real."""
    try:
        face_core: FaceRecognitionCore = request.app.state.face_recognition_core
        recognized_name = face_core.recognize_faces(cam_id)
        if recognized_name:
            return {"message": f"Rostro reconocido: {recognized_name}", "name": recognized_name, "status": "success"}
        else:
            return {"message": "Rostro no reconocido.", "name": None, "status": "failed"}
    except FileNotFoundError as e:
        logger.error(f"Error de archivo al reconocer rostros: {e}")
        raise HTTPException(status_code=404, detail=f"Error: {e}. Por favor, codifique los rostros primero.")
    except Exception as e:
        logger.error(f"Error al reconocer rostros: {e}")
        raise HTTPException(status_code=500, detail=f"Error al reconocer rostros: {e}")