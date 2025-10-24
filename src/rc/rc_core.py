import os
import sys
import logging
from contextlib import contextmanager
from sqlalchemy.orm import Session


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from src.db.database import SessionLocal
from src.db.models import User, Face
from src.rc.capture import FaceCapture
from src.rc.encode import FaceEncoder
from src.rc.recognize import FaceRecognizer


DATASET_DIR = os.path.join(PROJECT_ROOT, "data", "dataset")
ENCODINGS_DIR = os.path.join(PROJECT_ROOT, "src", "rc", "encodings")
ENCODINGS_PATH = os.path.join(ENCODINGS_DIR, "encodings.pickle")

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(ENCODINGS_DIR, exist_ok=True)

logger = logging.getLogger("FaceRecognitionCore")


class FaceRecognitionCore:
    """
    Clase que actúa como puente entre la API y los módulos internos (capture, encode, recognize).
    No implementa lógica de reconocimiento, solo orquesta las llamadas.
    """

    def __init__(self):
        logger.info("FaceRecognitionCore inicializado.")
        self.capture = FaceCapture(dataset_dir=DATASET_DIR)
        self.encoder = FaceEncoder()
        self.recognizer = FaceRecognizer()

    @contextmanager
    def _get_db(self):
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

  
    def capture_faces(self, name: str, cam_id: int = 0, max_imgs: int = 5):
        """Captura rostros en vivo desde cámara."""
        logger.info(f"Iniciando captura de rostros para: {name}")
        return self.capture.capture(name=name, cam_id=cam_id, max_imgs=max_imgs)

    def add_faces_from_files(self, name: str, file_paths: list[str]) -> int:
        """Agrega varias imágenes desde archivos al dataset."""
        count = 0
        for file_path in file_paths:
            if self.capture.capture_from_file(name=name, file_path=file_path):
                count += 1
        logger.info(f"Se agregaron {count} imágenes para '{name}' desde archivos.")
        return count

    def encode_faces(self):
        """Genera y guarda los encodings faciales."""
        count, users = self.encoder.generate_encodings()
        logger.info(f"Encodings generados: {count} rostros de {users} usuarios.")
        return count, users

    def recognize_face_from_file(self, image_path: str) -> str:
        """Reconoce un rostro en una imagen subida."""
        return self.recognizer.recognize_from_file(image_path)

    def recognize_faces_from_cam(self, cam_id: int = 0) -> str:
        """Reconoce un rostro en tiempo real usando cámara."""
        return self.recognizer.recognize()

    def get_status(self):
        """Devuelve información resumida del sistema."""
        users = self.capture.list_registered_users()
        return {
            "active": True,
            "registered_users_count": len(users),
            "user_list": users
        }
