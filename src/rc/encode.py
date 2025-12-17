import os
import sys
import cv2
import face_recognition
import logging
from typing import Tuple, List, Optional
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
        self.model = "cnn"  # Usar 'hog' para CPU, 'cnn' para GPU
        self.encoding_batch_size = 32
        self.min_quality_score = 0.40
        self.resize_dim = (640, 480)

    def _calculate_face_quality(self, image: np.ndarray, face_location: tuple) -> float:
        """
        Calcula un puntaje de calidad para una imagen facial de manera eficiente.
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
            
            if len(face_roi.shape) == 3:
                gray_roi = cv2.cvtColor(face_roi, cv2.COLOR_RGB2GRAY)
            else:
                gray_roi = face_roi
            laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
            sharpness_score = min(laplacian_var / 500.0, 1.0)
            
            quality_score = (center_score * 0.3 + brightness_score * 0.3 + sharpness_score * 0.4)
            return quality_score
            
        except Exception as e:
            logger.error(f"Error al calcular calidad facial: {e}")
            return 0.0

    async def _process_image_batch(self, image_paths: List[str]) -> List[np.ndarray]:
        """
        Procesa un lote de imágenes en paralelo.
        """
        encodings = []
        images = []
        valid_paths = []

        for fpath in image_paths:
            try:
                img = cv2.imread(fpath)
                if img is None:
                    logger.warning(f"No se pudo cargar la imagen: {fpath}")
                    continue
                
                img = cv2.resize(img, self.resize_dim)
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                images.append(rgb)
                valid_paths.append(fpath)
            except Exception as e:
                logger.error(f"Error cargando imagen {fpath}: {e}")
                continue

        if not images:
            return []

        try:
            batch_face_locations = face_recognition.batch_face_locations(images, 
                                                                       number_of_times_to_upsample=1,
                                                                       batch_size=self.encoding_batch_size)

            for img, locations, fpath in zip(images, batch_face_locations, valid_paths):
                if not locations:
                    logger.warning(f"No se detectaron rostros en: {fpath}")
                    continue

                best_quality = -1
                best_encoding = None

                for face_location in locations:
                    quality = self._calculate_face_quality(img, face_location)
                    logger.debug(f"Calidad calculada por FaceEncoder para {fpath}: {quality} (Umbral: {self.min_quality_score})")
                    if quality > best_quality and quality >= self.min_quality_score:
                        try:
                            face_encoding = face_recognition.face_encodings(img, [face_location])[0]
                            best_quality = quality
                            best_encoding = face_encoding
                            logger.debug(f"Encoding generado con éxito para {fpath} con calidad: {best_quality}")
                        except IndexError:
                            logger.warning(f"No se pudo generar encoding para {fpath} en la ubicación {face_location} a pesar de la calidad {quality}")
                            continue

                if best_encoding is not None:
                    logger.debug(f"Encoding generado para {fpath} con calidad: {best_quality}")
                    encodings.append(best_encoding)
                else:
                    logger.warning(f"No se generó encoding para {fpath} debido a baja calidad")

        except Exception as e:
            logger.error(f"Error procesando lote de imágenes: {e}")

        return encodings

    async def _process_user_images(self, user_path: str) -> Optional[np.ndarray]:
        """
        Procesa las imágenes de un usuario en lotes y devuelve el mejor encoding.
        """
        all_encodings = []
        current_batch = []
        
        for fname in sorted(os.listdir(user_path)):
            try:
                fpath = os.path.join(user_path, fname)
                if not os.path.isfile(fpath):
                    continue
                    
                current_batch.append(fpath)
                
                if len(current_batch) >= self.encoding_batch_size:
                    batch_encodings = await self._process_image_batch(current_batch)
                    all_encodings.extend(batch_encodings)
                    current_batch = []
                    
            except Exception as e:
                logger.error(f"Error procesando {fname}: {e}")
                continue
                
        if current_batch:
            batch_encodings = await self._process_image_batch(current_batch)
            all_encodings.extend(batch_encodings)
            
        if not all_encodings:
            return None

        return np.mean(all_encodings, axis=0)

    async def generate_encodings(self, user_name: str) -> bool:
        """
        Genera el encoding facial para un usuario específico y lo guarda en el modelo User.
        """
        user_path = os.path.join(self.dataset_dir, user_name)
        if not os.path.exists(user_path):
            logger.warning(f"No existe el directorio del usuario: {user_path}")
            return False

        async with get_db() as db:
            result = await db.execute(select(User).filter(User.nombre == user_name))
            user = result.scalars().first()

            if not user:
                logger.error(f"Usuario {user_name} no encontrado en la base de datos.")
                return False

            best_face_encoding = await self._process_user_images(user_path)
            
            if best_face_encoding is not None:
                user.face_embedding = best_face_encoding.tobytes()
                await db.commit()
                logger.info(f"Encoding facial guardado para el usuario {user_name}.")
                return True
            else:
                logger.warning(f"No se pudo generar un encoding facial válido para {user_name}.")
                return False

    async def get_user_encoding(self, user_id: int) -> np.ndarray:
        """
        Obtiene el encoding facial de un usuario específico.
        """
        async with get_db() as db:
            result = await db.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
            
            if not user or not user.face_embedding:
                raise ValueError(f"No se encontró encoding facial para el usuario {user_id}")
                
            return np.frombuffer(user.face_embedding, dtype=np.float64)

    async def generate_all_encodings(self) -> Tuple[int, int]:
        """
        Genera encodings para todos los usuarios en el dataset.
        Devuelve una tupla con (número de usuarios procesados, número de encodings generados)
        """
        total_users = 0
        total_encodings = 0

        for user_dir in os.listdir(self.dataset_dir):
            user_path = os.path.join(self.dataset_dir, user_dir)
            if not os.path.isdir(user_path):
                continue

            total_users += 1
            user_encodings = await self._process_user_images(user_path)
            if user_encodings is not None:
                total_encodings += 1

        return (total_users, total_encodings)
