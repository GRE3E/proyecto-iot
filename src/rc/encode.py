import os
import sys
import cv2
import face_recognition
import logging
from typing import Tuple, List
from sqlalchemy import select
from src.db.database import get_db
from src.db.models import User
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

logger = logging.getLogger("FaceEncoder")

class FaceEncoder:
    """
    Clase responsable de generar y gestionar los encodings faciales.
    Procesa imágenes del dataset y almacena los encodings en la base de datos.
    """

    def __init__(self):
        """
        Inicializa el codificador facial.
        """
        self.dataset_dir = os.path.join(PROJECT_ROOT, "data", "dataset")
        self.model = "hog"  # Usar 'cnn' si hay GPU disponible
        self.encoding_batch_size = 32
        self.min_quality_score = 0.7

    def _calculate_face_quality(self, image: np.ndarray, face_location: tuple) -> float:
        """
        Calcula un puntaje de calidad para una imagen facial.
        """
        try:
            top, right, bottom, left = face_location
            face_height = bottom - top
            face_width = right - left
            
            min_size = min(face_height, face_width)
            if min_size < 100:
                return 0.0
            
            aspect_ratio = face_width / face_height
            if not (0.7 <= aspect_ratio <= 1.3):
                return 0.0
            
            frame_height, frame_width = image.shape[:2]
            face_center_x = (left + right) / 2
            face_center_y = (top + bottom) / 2
            
            center_score = 1.0 - (
                abs(face_center_x - frame_width/2) / frame_width + 
                abs(face_center_y - frame_height/2) / frame_height
            ) / 2
            
            face_roi = image[top:bottom, left:right]
            brightness = np.mean(face_roi)
            brightness_score = 1.0 - abs(128 - brightness) / 128
            
            gray_roi = cv2.cvtColor(face_roi, cv2.COLOR_RGB2GRAY)
            laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
            sharpness_score = min(laplacian_var / 500.0, 1.0)
            
            quality_score = (center_score + brightness_score + sharpness_score) / 3
            return quality_score
            
        except Exception as e:
            logger.error(f"Error al calcular calidad facial: {e}")
            return 0.0

    async def _process_user_images(self, user_path: str) -> List[np.ndarray]:
        """
        Procesa las imágenes de un usuario y genera sus encodings.
        """
        encodings = []
        for fname in sorted(os.listdir(user_path)):
            try:
                fpath = os.path.join(user_path, fname)
                img = cv2.imread(fpath)
                if img is None:
                    logger.warning(f"No se pudo cargar la imagen: {fpath}")
                    continue
                    
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                face_locations = face_recognition.face_locations(rgb, model=self.model)
                
                if not face_locations:
                    logger.warning(f"No se detectaron rostros en: {fpath}")
                    continue
                
                best_quality = -1
                best_encoding = None
                
                for face_location in face_locations:
                    quality = self._calculate_face_quality(rgb, face_location)
                    if quality > best_quality and quality >= self.min_quality_score:
                        face_encoding = face_recognition.face_encodings(rgb, [face_location])[0]
                        best_quality = quality
                        best_encoding = face_encoding
                
                if best_encoding is not None:
                    encodings.append(best_encoding)
                    
            except Exception as e:
                logger.error(f"Error procesando {fname}: {e}")
                continue
                
        return encodings

    async def generate_encodings(self) -> Tuple[int, int]:
        """
        Genera encodings faciales para todos los usuarios en el dataset.
        """
        if not os.path.exists(self.dataset_dir):
            raise FileNotFoundError(f"No existe el directorio del dataset: {self.dataset_dir}")

        total_encodings = 0
        users_processed = 0

        async with get_db() as db:
            for user_name in sorted(os.listdir(self.dataset_dir)):
                user_path = os.path.join(self.dataset_dir, user_name)
                if not os.path.isdir(user_path):
                    continue

                try:
                    user_encodings = await self._process_user_images(user_path)
                    
                    if not user_encodings:
                        logger.warning(f"No se generaron encodings válidos para: {user_name}")
                        continue
                    
                    result = await db.execute(select(User).filter(User.nombre == user_name))
                    user = result.scalars().first()
                    
                    if not user:
                        user = User(nombre=user_name)
                        db.add(user)
                        await db.flush()
                    
                    avg_encoding = np.mean(user_encodings, axis=0)
                    #  Aquí se cambia face_encoding por embedding
                    user.embedding = avg_encoding.tobytes()
                    
                    total_encodings += len(user_encodings)
                    users_processed += 1
                    
                    logger.info(f"Encodings generados para {user_name}: {len(user_encodings)}")
                    
                except Exception as e:
                    logger.error(f"Error procesando usuario {user_name}: {e}")
                    continue

            await db.commit()
            
        logger.info(f"Proceso completado. Encodings: {total_encodings}, Usuarios: {users_processed}")
        return total_encodings, users_processed

    async def get_user_encoding(self, user_id: int) -> np.ndarray:
        """
        Obtiene el encoding facial de un usuario específico.
        """
        async with get_db() as db:
            result = await db.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
            
            #  Cambiar face_encoding por embedding
            if not user or not user.embedding:
                raise ValueError(f"No se encontró encoding facial para el usuario {user_id}")
                
            return np.frombuffer(user.embedding, dtype=np.float64)
