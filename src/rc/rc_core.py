import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import numpy as np
import cv2
from sqlalchemy import select, delete
from src.db.database import get_db
from src.api.face_recognition_schemas import AuthResponse, ResponseModel
from src.db.models import User, Face
from src.rc.capture import FaceCapture
from src.rc.encode import FaceEncoder
from src.rc.recognize import FaceRecognizer
from src.auth.auth_service import AuthService

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

    async def register_user(self, user_name: str, num_photos: int = 5, password: str = None) -> ResponseModel:
        try:
            async with get_db() as db:
                auth_service = AuthService(db)
                
                exists_query = select(User.id).filter(User.nombre == user_name).exists()
                if await db.scalar(select(exists_query)):
                    return ResponseModel(success=False, message=f"El usuario {user_name} ya existe")

                await auth_service.register_user(
                    username=user_name,
                    password=password,
                    is_owner=False
                )

            capture_result = await self.capture.capture_user(user_name, num_photos)
            if not capture_result["success"]:
                return ResponseModel(**capture_result)

            encoding_generated = await self.encoder.generate_encodings(user_name)
            if encoding_generated:
                async with get_db() as db:
                    result = await db.execute(select(User).filter(User.nombre == user_name))
                    user = result.scalars().first()
                    if user:
                        auth_service = AuthService(db)
                        auth_tokens = await auth_service.authenticate_user_by_id(user.id)
                        return ResponseModel(success=True, message=f"Usuario {user_name} registrado exitosamente", auth=AuthResponse(**auth_tokens))
                    else:
                        return ResponseModel(success=False, message="Usuario registrado pero no encontrado para generar tokens.")
            else:
                return ResponseModel(success=False, message="No se pudieron generar encodings faciales válidos")

        except Exception as e:
            logger.error(f"Error en registro de usuario: {e}")
            return ResponseModel(success=False, message=f"Error en registro: {str(e)}")

    async def register_face_to_existing_user(self, user_id: int, num_photos: int = 5) -> ResponseModel:
        try:
            async with get_db() as db:
                result = await db.execute(select(User).filter(User.id == user_id))
                user = result.scalars().first()

                if not user:
                    return ResponseModel(success=False, message=f"Usuario con ID {user_id} no encontrado")

                user_name = user.nombre

            capture_result = await self.capture.capture_user(user_name, num_photos)
            if not capture_result["success"]:
                return ResponseModel(**capture_result)

            encoding_generated = await self.encoder.generate_encodings(user_name)
            if encoding_generated:
                return ResponseModel(success=True, message=f"Encodings faciales generados exitosamente para el usuario {user_name}")
            else:
                return ResponseModel(success=False, message="No se pudieron generar encodings faciales válidos")

        except Exception as e:
            logger.error(f"Error al registrar rostro para usuario existente: {e}")
            return ResponseModel(success=False, message=f"Error al registrar rostro: {str(e)}")

    async def register_face_from_uploads(self, user_id: int, uploads: List[Any]) -> ResponseModel:
        try:
            async with get_db() as db:
                result = await db.execute(select(User).filter(User.id == user_id))
                user = result.scalars().first()
                if not user:
                    return ResponseModel(success=False, message=f"Usuario con ID {user_id} no encontrado")
                user_name = user.nombre

            user_dir = self.capture._ensure_user_dir(user_name)
            saved = 0
            for up in uploads:
                try:
                    content = await up.read()
                    data = np.frombuffer(content, np.uint8)
                    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
                    if img is None:
                        continue
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    img_path = user_dir / f"{user_name}_{timestamp}.jpg"
                    cv2.imwrite(str(img_path), img)
                    async with get_db() as db:
                        face_record = Face(user_id=user.id, image_data=content)
                        db.add(face_record)
                        await db.commit()
                    saved += 1
                except Exception as e:
                    logger.warning(f"Error guardando imagen subida: {e}")
                    continue

            if saved == 0:
                return ResponseModel(success=False, message="No se pudieron procesar las imágenes subidas")

            encoding_generated = await self.encoder.generate_encodings(user_name)
            if encoding_generated:
                return ResponseModel(success=True, message=f"Encodings faciales generados exitosamente para el usuario {user_name}")
            else:
                return ResponseModel(success=False, message="No se pudieron generar encodings faciales válidos")
        except Exception as e:
            logger.error(f"Error en registro de rostro desde uploads: {e}")
            return ResponseModel(success=False, message=f"Error al registrar rostro: {str(e)}")

    async def delete_user(self, user_name: str) -> Dict[str, Any]:
        """
        Elimina un usuario tanto del dataset como de la base de datos.
        Primero elimina las caras asociadas, luego el usuario.
        """
        try:
            async with get_db() as db:
                user_query = select(User).filter(User.nombre == user_name)
                user = await db.scalar(user_query)
                
                if not user:
                    return {"success": False, "message": f"Usuario {user_name} no encontrado"}

                await db.execute(delete(Face).where(Face.user_id == user.id))
                await db.delete(user)
                await db.commit()
                logger.info(f"Usuario {user_name} eliminado de la base de datos.")

            await self.capture.delete_user_photos(user_name)
            return {"success": True, "message": f"Usuario {user_name} eliminado correctamente."}

        except Exception as e:
            logger.error(f"Error eliminando usuario: {e}")  
            return {"success": False, "message": f"Error en eliminación: {str(e)}"}

    async def recognize_face(self, source: str = "camera") -> Dict[str, Any]:
        try:
            await self.recognizer.load_known_faces()
            if source == "camera":
                recognized_users = await self.recognizer.recognize_from_camera()
            else:
                recognized_users = await self.recognizer.recognize_from_image_file(source)
            
            if recognized_users:
                user_name = recognized_users[0]
                async with get_db() as db:
                    result = await db.execute(select(User).filter(User.nombre == user_name))
                    user = result.scalars().first()
                    if user:
                        auth_service = AuthService(db)
                        auth_tokens = await auth_service.authenticate_user_by_id(user.id)
                        return {"success": True, "recognized_users": recognized_users, "user_id": user.id, "auth": auth_tokens}
                    else:
                        return {"success": False, "message": "Usuario reconocido pero no encontrado en la base de datos.", "recognized_users": recognized_users}
            else:
                return {"success": True, "recognized_users": [], "message": "usuario desconocido"}
        except Exception as e:
            logger.error(f"Error en reconocimiento facial: {e}")
            return {"success": False, "message": f"Error en reconocimiento: {str(e)}"}

    async def list_users(self) -> List[Dict[str, Any]]:
        try:
            users_list = []
            async with get_db() as db:
                query = select(
                    User.id,
                    User.nombre,
                    User.speaker_embedding.isnot(None).label("tiene_speaker_encoding"),
                    User.face_embedding.isnot(None).label("tiene_face_encoding")
                )
                result = await db.execute(query)
                users_db = result.all()
                
                for user in users_db:
                    users_list.append({
                        "id": user.id,
                        "nombre": user.nombre,
                        "tiene_speaker_encoding": user.tiene_speaker_encoding,
                        "tiene_face_encoding": user.tiene_face_encoding
                    })

            dataset_path = Path("dataset")
            if dataset_path.exists():
                existing_names = {u["nombre"] for u in users_list}
                for folder in dataset_path.iterdir():
                    if folder.is_dir() and folder.name not in existing_names:
                        users_list.append({
                            "id": None,
                            "nombre": folder.name,
                            "tiene_speaker_encoding": False,
                            "tiene_face_encoding": False
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
