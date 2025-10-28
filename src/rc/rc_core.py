import os
import sys
import logging
import asyncio
from typing import Dict, Any, List
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.db.database import get_async_db_session
from src.db.models import User
from src.rc.capture import FaceCapture
from src.rc.encode import FaceEncoder
from src.rc.recognize import FaceRecognizer

# ------------------------------------------------------------
# Configuración de paths del proyecto
# ------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

DATASET_DIR = os.path.join(PROJECT_ROOT, "data", "dataset")
ENCODINGS_DIR = os.path.join(PROJECT_ROOT, "src", "rc", "encodings")
ENCODINGS_PATH = os.path.join(ENCODINGS_DIR, "encodings.pickle")

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(ENCODINGS_DIR, exist_ok=True)

# ------------------------------------------------------------
# Logger global
# ------------------------------------------------------------
logger = logging.getLogger("FaceRecognitionCore")
logger.setLevel(logging.INFO)


# ============================================================
# Clase principal FaceRecognitionCore
# ============================================================
class FaceRecognitionCore:
    """
    Clase principal que integra y coordina los componentes del sistema de reconocimiento facial.
    Proporciona una interfaz unificada para todas las operaciones de reconocimiento facial.
    """

    def __init__(self):
        """Inicializa los componentes principales del sistema de reconocimiento facial."""
        self.face_capture = FaceCapture(dataset_dir=DATASET_DIR)
        self.face_encoder = FaceEncoder()
        self.face_recognizer = FaceRecognizer()
        self.logger = logging.getLogger(self.__class__.__name__)
        self.is_online_status: bool = True

    # --------------------------------------------------------
    # Gestión de base de datos asíncrona
    # --------------------------------------------------------
    @asynccontextmanager
    async def get_db(self) -> AsyncSession:
        async with get_async_db_session() as db:
            yield db

    # --------------------------------------------------------
    # Registro automático de usuario con cámara
    # --------------------------------------------------------
    async def register_user_auto(self, name: str, video_source: int = 0) -> Dict[str, Any]:
        """
        Registra automáticamente un nuevo usuario mediante captura de video.
        """
        try:
            async with get_async_db_session() as db:
                existing_user = await db.execute(select(User).filter(User.nombre == name))
                if existing_user.scalar_one_or_none():
                    return {"success": False, "message": f"Ya existe un usuario con el nombre {name}"}

            capture_result = await self.face_capture.auto_capture(name, video_source)
            if not capture_result["success"]:
                return capture_result

            encoding_result = await self.face_encoder.generate_encodings(name)
            if not encoding_result["success"]:
                return encoding_result

            return {"success": True, "message": f"Usuario {name} registrado exitosamente"}

        except Exception as e:
            self.logger.error(f"Error en registro automático: {e}")
            return {"success": False, "message": f"Error en registro: {str(e)}"}

    # --------------------------------------------------------
    # Identificación de usuario desde cámara
    # --------------------------------------------------------
    async def identify_user(self, video_source: int = 0) -> Dict[str, Any]:
        """
        Identifica al usuario frente a la cámara.
        """
        try:
            recognized_name = await self.face_recognizer.recognize_from_cam(video_source)
            if not recognized_name or recognized_name == "Desconocido":
                return {
                    "success": False,
                    "message": "No se pudo identificar al usuario",
                    "user": None
                }

            return {
                "success": True,
                "message": "Usuario identificado exitosamente",
                "user": recognized_name
            }

        except Exception as e:
            self.logger.error(f"Error en identificación: {e}")
            return {"success": False, "message": f"Error en identificación: {str(e)}", "user": None}

    # --------------------------------------------------------
    # Añadir reconocimiento facial a un usuario existente
    # --------------------------------------------------------
    async def add_face_to_user(self, user_id: int, video_source: int = 0) -> Dict[str, Any]:
        """
        Añade reconocimiento facial a un usuario existente.
        """
        try:
            async with get_async_db_session() as db:
                user = await db.execute(select(User).filter(User.id == user_id))
                user = user.scalar_one_or_none()

                if not user:
                    return {"success": False, "message": f"No se encontró usuario con ID {user_id}"}

            capture_result = await self.face_capture.add_face_to_user_by_id(user_id, video_source)
            if not capture_result["success"]:
                return capture_result

            encoding_result = await self.face_encoder.generate_encodings(user.nombre)
            if not encoding_result["success"]:
                return encoding_result

            return {"success": True, "message": f"Reconocimiento facial añadido exitosamente para {user.nombre}"}

        except Exception as e:
            self.logger.error(f"Error añadiendo reconocimiento facial: {e}")
            return {"success": False, "message": f"Error: {str(e)}"}

    # --------------------------------------------------------
    # Listar usuarios registrados
    # --------------------------------------------------------
    async def list_registered_users(self) -> Dict[str, Any]:
        """
        Lista todos los usuarios registrados con reconocimiento facial.
        """
        try:
            users = await self.face_capture.list_registered_users()
            return {"success": True, "message": "Usuarios recuperados exitosamente", "users": users}
        except Exception as e:
            self.logger.error(f"Error listando usuarios: {e}")
            return {"success": False, "message": f"Error: {str(e)}", "users": []}

    # --------------------------------------------------------
    # Verificar calidad de imagen facial
    # --------------------------------------------------------
    async def verify_face_quality(self, image_path: str) -> Dict[str, Any]:
        """
        Verifica la calidad de una imagen facial.
        """
        try:
            quality_result = await self.face_encoder._calculate_face_quality(image_path)
            return {
                "success": True,
                "quality_score": quality_result.get("quality_score", 0),
                "message": quality_result.get("message", "")
            }
        except Exception as e:
            self.logger.error(f"Error verificando calidad: {e}")
            return {"success": False, "message": f"Error: {str(e)}", "quality_score": 0}

    # --------------------------------------------------------
    # Estado del sistema
    # --------------------------------------------------------
    def get_status(self) -> bool:
        """
        Verifica si el módulo de reconocimiento facial está activo.
        """
        return self.is_online_status
    