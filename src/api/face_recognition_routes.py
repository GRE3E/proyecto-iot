from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import uuid
from typing import List
from src.rc.rc_core import FaceRecognitionCore


face_recognition_router = APIRouter(tags=["rc"])
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
core = FaceRecognitionCore()



@face_recognition_router.get("/status", status_code=200)
def get_status():
    """
    Devuelve el estado actual del módulo de reconocimiento facial.
    """
    try:
        status = core.get_status()
        return {"status": "ok", "module": "rc", "info": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estado: {str(e)}")


@face_recognition_router.post("/capture", status_code=200)
def capture_faces(name: str = Form(...)):
    """
    Captura rostros en vivo desde la cámara (usa el FaceCapture del core).
    """
    try:
        count = core.capture_faces(name=name)
        return {"message": f"Se capturaron {count} imágenes de {name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al capturar rostros: {str(e)}")


@face_recognition_router.post("/add", status_code=200)
async def add_faces(name: str = Form(...), files: List[UploadFile] = File(...)):
    """
    Agrega imágenes al dataset desde archivos subidos.
    """
    temp_paths = []
    try:
        for file in files:
            temp_path = os.path.join(BASE_DIR, f"temp_{uuid.uuid4().hex}.jpg")
            with open(temp_path, "wb") as f:
                f.write(await file.read())
            temp_paths.append(temp_path)

        count = core.add_faces_from_files(name=name, file_paths=temp_paths)
        return {"message": f"Se agregaron {count} imágenes para '{name}'"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al agregar rostros: {str(e)}")

    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)


@face_recognition_router.get("/list", status_code=200)
def list_faces():
    """
    Devuelve la lista de usuarios registrados (dataset).
    """
    try:
        status = core.get_status()
        return {
            "count": status["registered_users_count"],
            "users": status["user_list"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar rostros: {str(e)}")


@face_recognition_router.post("/encode", status_code=200)
def encode_faces():
    """
    Genera los encodings faciales a partir del dataset.
    """
    try:
        enc_count, users = core.encode_faces()
        return {"message": f"Encodings generados: {enc_count} | Usuarios procesados: {users}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar encodings: {str(e)}")


@face_recognition_router.post("/recognize", status_code=200)
async def recognize_face(file: UploadFile = File(...)):
    """
    Reconoce un rostro desde una imagen subida (sin cámara).
    """
    temp_path = os.path.join(BASE_DIR, f"temp_{uuid.uuid4().hex}.jpg")
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        recognized_name = core.recognize_face_from_file(temp_path)
        return {
            "recognized": recognized_name != "Desconocido",
            "name": recognized_name
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al reconocer rostro: {str(e)}")

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@face_recognition_router.get("/recognize/cam", status_code=200)
def recognize_from_cam():
    """
    Reconoce un rostro usando la cámara activa en tiempo real.
    """
    try:
        recognized_name = core.recognize_faces_from_cam()
        return {
            "recognized": recognized_name != "Desconocido",
            "name": recognized_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reconocimiento por cámara: {str(e)}")
