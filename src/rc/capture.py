import os
import sys
import cv2
import logging
import face_recognition
import numpy as np
from typing import List, Optional, Tuple
from sqlalchemy import select
from src.db.database import get_db as get_async_db_session
from src.db.models import User, Face

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

logger = logging.getLogger("FaceCapture")

DATASET_DIR = os.path.join(PROJECT_ROOT, "data", "dataset")
os.makedirs(DATASET_DIR, exist_ok=True)

class FaceCapture:
    """
    Clase responsable de la captura de rostros y su almacenamiento.
    Implementa métodos para captura automática y desde archivos.
    """

    def __init__(self, dataset_dir: str = None):
        """
        Inicializa el capturador de rostros.
        
        Args:
            dataset_dir (str, optional): Directorio para almacenar el dataset. 
                                       Por defecto usa DATASET_DIR.
        """
        self.dataset_dir = dataset_dir or DATASET_DIR
        os.makedirs(self.dataset_dir, exist_ok=True)
        self.min_detection_confidence = 0.5
        self.min_face_quality = 0.7

    async def _ensure_user_exists(self, db, name: str) -> User:
        """
        Asegura que existe un usuario con el nombre dado, si no existe lo crea.
        
        Args:
            db: Sesión de base de datos
            name (str): Nombre del usuario
            
        Returns:
            User: Instancia del usuario
        """
        result = await db.execute(select(User).filter(User.nombre == name))
        user = result.scalars().first()
        if not user:
            user = User(nombre=name, is_owner=False)
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    async def _save_face_image(self, db, user: User, frame: np.ndarray) -> bool:
        """
        Guarda una imagen facial en el sistema de archivos y base de datos.
        
        Args:
            db: Sesión de base de datos
            user (User): Usuario al que pertenece el rostro
            frame (np.ndarray): Imagen capturada
            
        Returns:
            bool: True si se guardó correctamente
        """
        try:
            person_dir = os.path.join(self.dataset_dir, user.nombre)
            os.makedirs(person_dir, exist_ok=True)
            
            img_count = len(os.listdir(person_dir)) + 1
            img_name = f"{img_count}.jpg"
            img_path = os.path.join(person_dir, img_name)
            
            cv2.imwrite(img_path, frame)
            
            _, buf = cv2.imencode(".jpg", frame)
            image_bytes = buf.tobytes()
            face = Face(user_id=user.id, image_data=image_bytes)
            db.add(face)
            await db.commit()
            
            return True
        except Exception as e:
            logger.error(f"Error al guardar imagen facial: {e}")
            return False

    def _assess_face_quality(self, frame: np.ndarray, face_location: tuple) -> float:
        """
        Evalúa la calidad de la imagen facial capturada.
        
        Args:
            frame (np.ndarray): Imagen capturada
            face_location (tuple): Ubicación del rostro en la imagen
            
        Returns:
            float: Puntuación de calidad entre 0 y 1
        """
        try:
            top, right, bottom, left = face_location
            face_height = bottom - top
            face_width = right - left
            
            # Verificar tamaño mínimo
            min_size = min(face_height, face_width)
            if min_size < 100:
                return 0.0
            
            # Verificar centrado
            frame_height, frame_width = frame.shape[:2]
            face_center_x = (left + right) / 2
            face_center_y = (top + bottom) / 2
            
            center_score = 1.0 - (abs(face_center_x - frame_width/2) / frame_width + 
                                abs(face_center_y - frame_height/2) / frame_height) / 2
            
            # Verificar iluminación
            face_roi = frame[top:bottom, left:right]
            brightness = np.mean(face_roi)
            brightness_score = 1.0 - abs(128 - brightness) / 128
            
            return (center_score + brightness_score) / 2
        except Exception as e:
            logger.error(f"Error al evaluar calidad facial: {e}")
            return 0.0

    async def auto_capture(self, name: str, cam_id: int = 0, max_imgs: int = 5, min_faces: int = 1) -> int:
        """
        Captura automáticamente rostros cuando detecta una cara de calidad aceptable.
        
        Args:
            name (str): Nombre de la persona
            cam_id (int): ID de la cámara a usar
            max_imgs (int): Máximo número de imágenes a capturar
            min_faces (int): Mínimo número de rostros requeridos por imagen
            
        Returns:
            int: Número de imágenes capturadas exitosamente
        """
        if not name:
            raise ValueError("El nombre es obligatorio")

        cap = cv2.VideoCapture(cam_id)
        if not cap.isOpened():
            raise RuntimeError("No se pudo acceder a la cámara")

        async with get_async_db_session() as db:
            user = await self._ensure_user_exists(db, name)
            count = 0
            consecutive_detections = 0
            
            try:
                while count < max_imgs:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    face_locations = face_recognition.face_locations(rgb_frame)

                    if len(face_locations) >= min_faces:
                        consecutive_detections += 1
                        
                        # Evaluar calidad del rostro
                        quality_scores = [self._assess_face_quality(frame, loc) for loc in face_locations]
                        best_face_quality = max(quality_scores) if quality_scores else 0
                        
                        if (consecutive_detections >= 3 and 
                            best_face_quality >= self.min_face_quality):
                            
                            if await self._save_face_image(db, user, frame):
                                count += 1
                                logger.info(f"Imagen {count}/{max_imgs} capturada para {name}")
                                consecutive_detections = 0
                    else:
                        consecutive_detections = 0

                    # Mostrar feedback visual
                    for (top, right, bottom, left) in face_locations:
                        cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                    
                    cv2.putText(frame, f"Capturas: {count}/{max_imgs}", (10, 30),
                              cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
                    cv2.imshow("Captura Automática", frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break

            finally:
                cap.release()
                cv2.destroyAllWindows()

            return count

    async def add_face_to_user_by_id(self, user_id: int, cam_id: int = 0, max_imgs: int = 5) -> int:
        """
        Añade imágenes faciales a un usuario existente por ID.
        
        Args:
            user_id (int): ID del usuario
            cam_id (int): ID de la cámara
            max_imgs (int): Máximo número de imágenes a capturar
            
        Returns:
            int: Número de imágenes capturadas
        """
        async with get_async_db_session() as db:
            result = await db.execute(select(User).filter(User.id == user_id))
            user = result.scalars().first()
            if not user:
                raise ValueError(f"Usuario con ID {user_id} no encontrado")
            
            return await self.auto_capture(name=user.nombre, cam_id=cam_id, max_imgs=max_imgs)

    async def capture_from_file(self, name: str, file_path: str) -> bool:
        """
        Procesa y guarda una imagen facial desde archivo.
        
        Args:
            name (str): Nombre de la persona
            file_path (str): Ruta al archivo de imagen
            
        Returns:
            bool: True si se procesó correctamente
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Archivo no encontrado: {file_path}")

        frame = cv2.imread(file_path)
        if frame is None:
            raise ValueError("No se pudo cargar la imagen")

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        
        if not face_locations:
            raise ValueError("No se detectaron rostros en la imagen")

        quality_scores = [self._assess_face_quality(frame, loc) for loc in face_locations]
        if not any(score >= self.min_face_quality for score in quality_scores):
            raise ValueError("La calidad de la imagen no es suficiente")

        async with get_async_db_session() as db:
            user = await self._ensure_user_exists(db, name)
            return await self._save_face_image(db, user, frame)

    async def list_registered_users(self) -> List[str]:
        """
        Lista todos los usuarios registrados con reconocimiento facial.
        
        Returns:
            List[str]: Lista de nombres de usuarios
        """
        async with get_async_db_session() as db:
            result = await db.execute(select(User))
            users = result.scalars().all()
            return [user.nombre for user in users if os.path.exists(os.path.join(self.dataset_dir, user.nombre))]
