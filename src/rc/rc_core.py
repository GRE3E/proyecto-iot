import logging
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

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
        """
        Inicializa el sistema de reconocimiento facial.
        """
        self.capture = FaceCapture()
        self.encoder = FaceEncoder()
        self.recognizer = FaceRecognizer()
        
    async def register_user(self, user_name: str, num_photos: int = 5) -> Dict[str, Any]:
        """
        Registra un nuevo usuario tomando fotos y generando su encoding.
        
        Args:
            user_name (str): Nombre del usuario a registrar
            num_photos (int): Número de fotos a tomar
            
        Returns:
            Dict[str, Any]: Resultado del registro
        """
        try:
            # Verificar si el usuario ya existe
            async with get_db() as db:
                result = await db.execute(select(User).filter(User.nombre == user_name))
                existing_user = result.scalars().first()
                
                if existing_user:
                    return {
                        "success": False,
                        "message": f"El usuario {user_name} ya existe"
                    }
            
            # Capturar fotos del usuario
            capture_result = await self.capture.capture_user(user_name, num_photos)
            if not capture_result["success"]:
                return capture_result
            
            # Generar encodings
            total_encodings, _ = await self.encoder.generate_encodings()
            
            if total_encodings > 0:
                return {
                    "success": True,
                    "message": f"Usuario {user_name} registrado exitosamente"
                }
            else:
                return {
                    "success": False,
                    "message": "No se pudieron generar encodings válidos"
                }
                
        except Exception as e:
            logger.error(f"Error en registro de usuario: {e}")
            return {
                "success": False,
                "message": f"Error en registro: {str(e)}"
            }
            
    async def delete_user(self, user_name: str) -> Dict[str, Any]:
        """
        Elimina un usuario y sus datos asociados.
        
        Args:
            user_name (str): Nombre del usuario a eliminar
            
        Returns:
            Dict[str, Any]: Resultado de la eliminación
        """
        try:
            async with get_db() as db:
                # Eliminar usuario de la base de datos
                result = await db.execute(
                    delete(User).where(User.nombre == user_name)
                )
                await db.commit()
                
                if result.rowcount == 0:
                    return {
                        "success": False,
                        "message": f"No se encontró el usuario {user_name}"
                    }
                
                # Eliminar directorio de fotos si existe
                user_dir = os.path.join(
                    Path(__file__).parent.parent.parent,
                    "data",
                    "dataset",
                    user_name
                )
                if os.path.exists(user_dir):
                    for file in os.listdir(user_dir):
                        os.remove(os.path.join(user_dir, file))
                    os.rmdir(user_dir)
                
                return {
                    "success": True,
                    "message": f"Usuario {user_name} eliminado correctamente"
                }
                
        except Exception as e:
            logger.error(f"Error eliminando usuario: {e}")
            return {
                "success": False,
                "message": f"Error en eliminación: {str(e)}"
            }
            
    async def recognize_face(self, source: str = "camera") -> Dict[str, Any]:
        """
        Realiza reconocimiento facial desde cámara o archivo.
        
        Args:
            source (str): "camera" o ruta a imagen
            
        Returns:
            Dict[str, Any]: Resultado del reconocimiento
        """
        try:
            await self.recognizer.load_known_faces()
            
            if source == "camera":
                result = await self.recognizer.recognize_from_cam()
            else:
                result = await self.recognizer.recognize_from_file(source)
            
            return {
                "success": True,
                "recognized_users": result
            }
            
        except Exception as e:
            logger.error(f"Error en reconocimiento facial: {e}")
            return {
                "success": False,
                "message": f"Error en reconocimiento: {str(e)}"
            }
            
    async def list_users(self) -> List[Dict[str, Any]]:
        """
        Lista todos los usuarios registrados.
        
        Returns:
            List[Dict[str, Any]]: Lista de usuarios con sus datos
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
    