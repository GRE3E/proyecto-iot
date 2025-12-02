import cv2
import numpy as np
import face_recognition
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
from sqlalchemy import select
from collections import OrderedDict
import logging

from db.database import get_db
from db.models import User

logger = logging.getLogger("FaceRecognizer")

class EncodingCache:
    """
    Caché de encodings con TTL y límite de tamaño.
    """
    def __init__(self, max_size: int = 100, ttl_seconds: int = 300):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Tuple[np.ndarray, datetime]] = OrderedDict()

    def get(self, key: str) -> Optional[np.ndarray]:
        """
        Obtiene un encoding del caché si existe y no ha expirado.
        """
        if key not in self._cache:
            return None
        
        encoding, timestamp = self._cache[key]
        if datetime.now() - timestamp > timedelta(seconds=self.ttl_seconds):
            del self._cache[key]
            return None
            
        self._cache.move_to_end(key)
        return encoding

    def set(self, key: str, encoding: np.ndarray):
        """
        Almacena un encoding en el caché.
        """
        if len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)
        
        self._cache[key] = (encoding, datetime.now())
        self._cache.move_to_end(key)

    def clear(self):
        """
        Limpia el caché.
        """
        self._cache.clear()

class FaceRecognizer:
    def __init__(self, resize_dim: Tuple[int, int] = (640, 480)):
        self.known_face_encodings = []
        self.known_face_names = []
        self.resize_dim = resize_dim
        self.frame_skip = 2
        self.current_frame = 0
        self.encoding_cache = EncodingCache()
        logger.info("FaceRecognizer inicializado con dimensiones %s", resize_dim)

    async def load_known_faces(self):
        """
        Carga los encodings conocidos desde la base de datos.
        """
        try:
            async with get_db() as db:
                query = select(User).filter(User.face_embedding.isnot(None))
                result = await db.execute(query)
                users = result.scalars().all()

                self.known_face_encodings = []
                self.known_face_names = []

                for user in users:
                    cached_encoding = self.encoding_cache.get(user.nombre)
                    if cached_encoding is not None:
                        self.known_face_encodings.append(cached_encoding)
                        self.known_face_names.append(user.nombre)
                        logger.debug(f"Encoding cargado desde caché para: {user.nombre}")
                        continue

                    if user.face_embedding:
                        encoding = np.frombuffer(user.face_embedding, dtype=np.float64)
                        self.known_face_encodings.append(encoding)
                        self.known_face_names.append(user.nombre)
                        self.encoding_cache.set(user.nombre, encoding)
                        logger.debug(f"Encoding cargado desde DB para: {user.nombre}")

            logger.info(f" Encodings cargados: {len(self.known_face_names)} usuarios - {self.known_face_names}")
            return True
        except Exception as e:
            logger.error("Error cargando encodings conocidos: %s", e)
            return False

    async def recognize_from_cam(self) -> List[str]:
        """
        Realiza reconocimiento facial desde la cámara.
        """
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        cap.set(cv2.CAP_PROP_FPS, 30)

        recognized_users = set()
        frame_count = 0
        max_frames = 90

        try:
            while frame_count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_count += 1
                if frame_count % self.frame_skip != 0:
                    continue

                frame = cv2.resize(frame, self.resize_dim)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                face_locations = face_recognition.face_locations(rgb_frame, model="hog")
                if not face_locations:
                    continue

                face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                
                for face_encoding in face_encodings:
                    matches = face_recognition.compare_faces(
                        self.known_face_encodings, 
                        face_encoding,
                        tolerance=0.5
                    )
                    if True in matches:
                        first_match_index = matches.index(True)
                        name = self.known_face_names[first_match_index]
                        recognized_users.add(name)

                await asyncio.sleep(0.01)

        except Exception as e:
            logger.error("Error en reconocimiento desde cámara: %s", e)
        finally:
            cap.release()

        logger.info("Usuarios reconocidos: %s", list(recognized_users))
        return list(recognized_users)

    async def recognize_from_file(self, image_path: str) -> List[str]:
        """
        Realiza reconocimiento facial desde un archivo.
        """
        try:
            logger.info(f" Iniciando reconocimiento desde archivo: {image_path}")
            
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f" No se pudo cargar la imagen: {image_path}")
                return []

            logger.info(f" Imagen cargada correctamente. Tamaño original: {image.shape}")
            
            image = cv2.resize(image, self.resize_dim)
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            logger.info(f" Buscando caras en la imagen...")
            face_locations = face_recognition.face_locations(rgb_image, model="hog")
            
            if not face_locations:
                logger.warning(f" No se detectaron caras en la imagen")
                return []
            
            logger.info(f" Se detectaron {len(face_locations)} cara(s) en la imagen")

            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
            logger.info(f" Se extrajeron {len(face_encodings)} encoding(s)")
            
            recognized_users = set()

            for idx, face_encoding in enumerate(face_encodings):
                logger.info(f" Comparando cara #{idx+1} con {len(self.known_face_encodings)} usuarios conocidos...")
                
                # Calcular distancias para debugging
                face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                logger.info(f"Distancias: {dict(zip(self.known_face_names, face_distances))}")
                
                matches = face_recognition.compare_faces(
                    self.known_face_encodings, 
                    face_encoding,
                    tolerance=0.6
                )
                
                if True in matches:
                    first_match_index = matches.index(True)
                    name = self.known_face_names[first_match_index]
                    distance = face_distances[first_match_index]
                    logger.info(f" ¡MATCH! Usuario reconocido: {name} (distancia: {distance:.3f})")
                    recognized_users.add(name)
                else:
                    min_distance = min(face_distances) if len(face_distances) > 0 else None
                    logger.warning(f" No se encontró match. Distancia mínima: {min_distance:.3f if min_distance else 'N/A'}")

            logger.info(f" Resultado final: {list(recognized_users) if recognized_users else 'Ningún usuario reconocido'}")
            return list(recognized_users)

        except Exception as e:
            logger.error(f" Error en reconocimiento desde archivo: {e}", exc_info=True)
            return []

    def clear_cache(self):
        """
        Limpia el caché de encodings.
        """
        self.encoding_cache.clear()
        logger.info("Caché de encodings limpiado")
