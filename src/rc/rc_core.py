import logging
from pathlib import Path
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.db.models import User
from src.rc.capture import FaceCapture
from src.rc.encode import FaceEncoder
from src.rc.recognize import FaceRecognizer

logger = logging.getLogger("FaceRecognitionCore")

class FaceRecognitionCore:
    """
    Clase principal que coordina las operaciones de reconocimiento facial.
    Integra captura, codificación y reconocimiento.
    """

    def __init__(self):
        self.capture = FaceCapture()
        self.encoder = FaceEncoder()
        self.recognizer = FaceRecognizer()

    async def register_user(self, user_name: str, num_photos: int = 5) -> Dict[str, Any]:
        """
        Registra un nuevo usuario tomando fotos y generando su encoding.
        """
        try:
            # Verificar si el usuario ya existe
            async with get_db() as db:
                result = await db.execute(select(User).filter(User.nombre == user_name))
                existing_user = result.scalars().first()
                if existing_user:
                    return {"success": False, "message": f"El usuario {user_name} ya existe"}

            # Capturar fotos
            capture_result = await self.capture.capture_user(user_name, num_photos)
            if not capture_result["success"]:
                return capture_result

            # Generar encodings
            total_encodings, _ = await self.encoder.generate_encodings()
            if total_encodings > 0:
                return {"success": True, "message": f"Usuario {user_name} registrado exitosamente"}
            else:
                return {"success": False, "message": "No se pudieron generar encodings válidos"}

        except Exception as e:
            logger.error(f"Error en registro de usuario: {e}")
            return {"success": False, "message": f"Error en registro: {str(e)}"}

    async def delete_user(self, user_name: str) -> Dict[str, Any]:
        """
        Elimina un usuario y sus fotos utilizando FaceCapture.
        """
        try:
            # Usar método de FaceCapture
            result = await self.capture.delete_user_photos(user_name)
            return result
        except Exception as e:
            logger.error(f"Error eliminando usuario: {e}")
            return {"success": False, "message": f"Error en eliminación: {str(e)}"}

    async def recognize_face(self, source: str = "camera") -> Dict[str, Any]:
        """
        Realiza reconocimiento facial desde cámara o imagen.
        """
        try:
            await self.recognizer.load_known_faces()

            if source == "camera":
                result = await self.recognizer.recognize_from_cam()
            else:
                result = await self.recognizer.recognize_from_file(source)

            return {"success": True, "recognized_users": result}

        except Exception as e:
            logger.error(f"Error en reconocimiento facial: {e}")
            return {"success": False, "message": f"Error en reconocimiento: {str(e)}"}

    async def list_users(self) -> List[Dict[str, Any]]:
        """
        Lista todos los usuarios registrados.
        """
        try:
            async with get_db() as db:
                result = await db.execute(select(User))
                users = result.scalars().all()
                return [
                    {
                        "id": user.id,
                        "nombre": user.nombre,
                        "fecha_registro": user.fecha_registro.isoformat(),
                        "tiene_encoding": user.face_encoding is not None
                    }
                    for user in users
                ]
        except Exception as e:
            logger.error(f"Error listando usuarios: {e}")
            return []

    def is_online(self) -> bool:
        """
        Verifica si el módulo de reconocimiento facial está en línea.
        """
        return all([self.capture, self.encoder, self.recognizer])
