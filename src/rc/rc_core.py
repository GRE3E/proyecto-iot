import logging
from pathlib import Path
from typing import List, Dict, Any
from sqlalchemy import select, delete
from src.db.database import get_db
from src.db.models import User, Face
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
        try:
            async with get_db() as db:
                result = await db.execute(select(User).filter(User.nombre == user_name))
                existing_user = result.scalars().first()
                if existing_user:
                    return {"success": False, "message": f"El usuario {user_name} ya existe"}

            capture_result = await self.capture.capture_user(user_name, num_photos)
            if not capture_result["success"]:
                return capture_result

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
        Elimina un usuario tanto del dataset como de la base de datos.
        Primero elimina las caras asociadas, luego el usuario.
        """
        try:
            async with get_db() as db:
                result = await db.execute(select(User).filter(User.nombre == user_name))
                user = result.scalars().first()
                if not user:
                    return {"success": False, "message": f"Usuario {user_name} no encontrado"}

                await db.execute(delete(Face).where(Face.user_id == user.id))

                await db.delete(user)
                await db.commit()
                logger.info(f"Usuario {user_name} eliminado de la base de datos.")

            result = await self.capture.delete_user_photos(user_name)
            return {"success": True, "message": f"Usuario {user_name} eliminado correctamente."}

        except Exception as e:
            logger.error(f"Error eliminando usuario: {e}")
            return {"success": False, "message": f"Error en eliminación: {str(e)}"}

    async def recognize_face(self, source: str = "camera") -> Dict[str, Any]:
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
        try:
            users_list = []
            async with get_db() as db:
                result = await db.execute(select(User))
                users_db = result.scalars().all()
                for user in users_db:
                    users_list.append({
                        "id": user.id,
                        "nombre": user.nombre,
                        "tiene_encoding": user.embedding is not None
                    })

            dataset_path = Path("dataset")
            if dataset_path.exists():
                for folder in dataset_path.iterdir():
                    if folder.is_dir() and folder.name not in [u["nombre"] for u in users_list]:
                        users_list.append({
                            "id": None,
                            "nombre": folder.name,
                            "tiene_encoding": False
                        })

            return users_list
        except Exception as e:
            logger.error(f"Error listando usuarios: {e}")
            return []

    def is_online(self) -> bool:
        return all([self.capture, self.encoder, self.recognizer])

    async def shutdown(self):
        """
        Realiza un apagado limpio de los recursos de FaceRecognitionCore.
        """
        logger.info("Apagando recursos de FaceRecognitionCore.")
