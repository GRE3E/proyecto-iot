import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from src.rc.capture import FaceCapture
from rc.encode import FaceEncoder
from rc.recognize import FaceRecognizer
from src.api.face_recognition_schemas import (
    HealthCheckResponse,
    AddFaceResponse,
    ListFacesResponse,
    RecognizeFaceResponse
)

# === ROUTER SIN PREFIX INTERNOS ===
face_recognition_router = APIRouter(tags=["rc"])

# === PATHS CONSISTENTES CON EL CORE ===
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATASET_DIR = os.path.join(BASE_DIR, "data", "dataset")
ENCODINGS_DIR = os.path.join(BASE_DIR, "src", "rc", "encodings")
ENCODINGS_PATH = os.path.join(ENCODINGS_DIR, "encodings.pickle")

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(ENCODINGS_DIR, exist_ok=True)

# === INSTANCIAS PRINCIPALES ===
encoder = FaceEncoder()
recognizer = FaceRecognizer()

# === ENDPOINTS ===

@face_recognition_router.get("/", response_model=HealthCheckResponse, status_code=status.HTTP_200_OK)
def health_check():
    """Verifica que la API de reconocimiento facial esté activa."""
    return {"status": "ok", "message": "API de reconocimiento facial funcionando correctamente."}


@face_recognition_router.post("/add", response_model=AddFaceResponse, status_code=status.HTTP_200_OK)
async def add_face(name: str = Form(...), file: UploadFile = File(...)):
    """Agrega una nueva cara al dataset y actualiza los encodings."""
    try:
        capture = FaceCapture(dataset_dir=DATASET_DIR)

        # Guardar imagen temporal
        temp_path = os.path.join(BASE_DIR, f"temp_{uuid.uuid4().hex}.jpg")
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        # Registrar la imagen y actualizar encodings
        capture.capture_from_file(name=name, file_path=temp_path)
        encoder.generate_encodings()

        os.remove(temp_path)
        return {"message": f"✅ Imagen registrada y encodings actualizados para '{name}'"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al agregar rostro: {str(e)}")


@face_recognition_router.get("/list", response_model=ListFacesResponse, status_code=status.HTTP_200_OK)
def list_faces():
    """Lista todas las personas registradas en el dataset."""
    try:
        capture = FaceCapture(dataset_dir=DATASET_DIR)
        people = capture.list_registered_users()
        return {"people": people}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar rostros: {str(e)}")


@face_recognition_router.post("/recognize", response_model=RecognizeFaceResponse, status_code=status.HTTP_200_OK)
async def recognize_face(file: UploadFile = File(...)):
    """Reconoce una cara desde una imagen enviada."""
    try:
        temp_path = os.path.join(BASE_DIR, f"temp_{uuid.uuid4().hex}.jpg")
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        recognized_name = recognizer.recognize_from_file(temp_path)
        os.remove(temp_path)

        return {
            "recognized": recognized_name != "Desconocido",
            "name": recognized_name
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al reconocer rostro: {str(e)}")
