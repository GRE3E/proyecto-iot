import logging
from typing import List, Dict, Any
from sqlalchemy import select

from src.db.database import get_db
from src.db.models import User
from src.rc.capture import FaceCapture
from src.rc.encode import FaceEncoder
from src.rc.recognize import FaceRecognizer

logger = logging.getLogger("FaceRecognitionCore")


class FaceRecognitionCore:
    """
    Clase principal que coordina las operaciones de reconocimiento facial.
    Fusiona la captura, codificación y reconocimiento,
    utilizando las clases especializadas sin duplicar lógica.
    """

    def __init__(self):
        self.capture = FaceCapture()
        self.encoder = FaceEncoder()
        self.recognizer = FaceRecognizer()

    # ==========================================================
    # REGISTRO DE USUARIO
    # ==========================================================
    async def register_user(self, user_name: str, num_photos: int = 5) -> Dict[str, Any]:
        """
        Registra un nuevo usuario: captura fotos, genera encodings y guarda en BD.
        """
        try:
            # Verificar si el usuario ya existe
            async with get_db() as db:
                result = await db.execute(select(User).filter(User.nombre == user_name))
                existing_user = result.scalars().first()
                if existing_user:
                    return {"success": False, "message": f"El usuario '{user_name}' ya existe."}

            # Captura facial
            capture_result = await self.capture.capture_user(user_name, num_photos)
            if not capture_result["success"]:
                return capture_result

            # Generar encodings
            enc_result = await self.encoder.generate_encodings()
            if enc_result:
                return {"success": True, "message": f"Usuario '{user_name}' registrado exitosamente."}
            else:
                return {"success": False, "message": "No se pudieron generar encodings válidos."}

        except Exception as e:
            logger.error(f"Error registrando usuario: {e}")
            return {"success": False, "message": f"Error al registrar usuario: {str(e)}"}

    # ==========================================================
    # ELIMINAR USUARIO
    # ==========================================================
    async def delete_user(self, user_name: str) -> Dict[str, Any]:
        """
        Elimina un usuario y sus imágenes.
        """
        try:
            result = await self.capture.delete_user_photos(user_name)
            return result
        except Exception as e:
            logger.error(f"Error eliminando usuario '{user_name}': {e}")
            return {"success": False, "message": f"Error eliminando usuario: {str(e)}"}

    # ==========================================================
    # RECONOCIMIENTO FACIAL
    # ==========================================================
    async def recognize_face(self, source: str = "camera") -> Dict[str, Any]:
        """
        Realiza reconocimiento facial desde cámara o desde una imagen específica.
        """
        try:
            await self.recognizer.load_known_faces()

            if source == "camera":
                recognized = await self.recognizer.recognize_from_cam()
            else:
                recognized = await self.recognizer.recognize_from_file(source)

            return {"success": True, "recognized_users": recognized}

        except Exception as e:
            logger.error(f"Error durante el reconocimiento facial: {e}")
            return {"success": False, "message": f"Error en reconocimiento: {str(e)}"}

    # ==========================================================
    # LISTAR USUARIOS
    # ==========================================================
    async def list_users(self) -> List[Dict[str, Any]]:
        """
        Lista todos los usuarios registrados con información básica.
        """
        try:
            async with get_db() as db:
                result = await db.execute(select(User))
                users = result.scalars().all()

                return [
                    {
                        "id": user.id,
                        "nombre": user.nombre,
                        "fecha_registro": user.fecha_registro.isoformat() if user.fecha_registro else None,
                    }
                    for user in users
                ]
        except Exception as e:
            logger.error(f"Error listando usuarios: {e}")
            return []

    # ==========================================================
    # VERIFICAR ESTADO DEL MÓDULO
    # ==========================================================
    def is_online(self) -> bool:
        """
        Verifica si todos los módulos están disponibles.
        """
        return all([self.capture, self.encoder, self.recognizer])
