import os
import cv2
import logging
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy import select
from src.db.database import get_db
from src.db.models import User, Face

logger = logging.getLogger("FaceCapture")

class FaceCapture:
    """
    Clase responsable de la captura de imágenes faciales.
    Maneja la captura desde cámara y el almacenamiento de imágenes.
    """
    
    def __init__(self):
        """
        Inicializa el sistema de captura facial.
        """
        self.project_root = Path(__file__).parent.parent.parent
        self.dataset_dir = self.project_root / "data" / "dataset"
        self.dataset_dir.mkdir(parents=True, exist_ok=True)
        
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        self.min_face_size = (100, 100)
        self.frame_interval = 5
        self.quality_threshold = 0.7
        
    def _ensure_user_dir(self, user_name: str) -> Path:
        """
        Asegura que exista el directorio para las fotos del usuario.
        """
        user_dir = self.dataset_dir / user_name
        user_dir.mkdir(exist_ok=True)
        return user_dir
        
    def _calculate_image_quality(self, image: np.ndarray) -> float:
        """
        Calcula un puntaje de calidad para la imagen.
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness_score = min(laplacian_var / 500.0, 1.0)
            contrast = gray.std()
            contrast_score = min(contrast / 128.0, 1.0)
            brightness = np.mean(gray)
            brightness_score = 1.0 - abs(128 - brightness) / 128
            quality_score = (sharpness_score + contrast_score + brightness_score) / 3
            return quality_score
        except Exception as e:
            logger.error(f"Error calculando calidad de imagen: {e}")
            return 0.0
            
    async def capture_user(self, user_name: str, num_photos: int = 5) -> Dict[str, Any]:
        """
        Captura fotos de un usuario desde la cámara.
        """
        try:
            user_dir = self._ensure_user_dir(user_name)
            cap = cv2.VideoCapture(1)
            
            if not cap.isOpened():
                return {"success": False, "message": "No se pudo acceder a la cámara"}
                
            photos_taken = 0
            frame_count = 0
            
            async with get_db() as db:
                # Asegurarse de registrar usuario en DB
                result = await db.execute(select(User).filter(User.nombre == user_name))
                user = result.scalars().first()
                if not user:
                    user = User(nombre=user_name)
                    db.add(user)
                    await db.flush()

            while photos_taken < num_photos:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                frame_count += 1
                if frame_count % self.frame_interval != 0:
                    continue
                    
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=self.min_face_size
                )
                
                for (x, y, w, h) in faces:
                    face_img = frame[y:y+h, x:x+w]
                    quality = self._calculate_image_quality(face_img)
                    
                    if quality >= self.quality_threshold:
                        # Guardar el **frame completo** en vez de solo la cara
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        img_path = user_dir / f"{user_name}_{timestamp}.jpg"
                        cv2.imwrite(str(img_path), frame)  # <-- CAMBIO AQUÍ
                        photos_taken += 1
                        logger.info(f"Foto {photos_taken} capturada para {user_name}")

                        # Guardar la foto en la DB como bytes
                        async with get_db() as db:
                            with open(img_path, "rb") as f:
                                img_bytes = f.read()
                            face_record = Face(
                                user_id=user.id,
                                image_data=img_bytes
                            )
                            db.add(face_record)
                            await db.commit()

                        break
                    
                for (x, y, w, h) in faces:
                    cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                
                cv2.imshow('Captura Facial', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
            cap.release()
            cv2.destroyAllWindows()
            
            if photos_taken == 0:
                return {"success": False, "message": "No se pudieron capturar fotos de calidad suficiente"}
                
            return {"success": True, "message": f"Se capturaron {photos_taken} fotos para {user_name}"}
            
        except Exception as e:
            logger.error(f"Error en captura de fotos: {e}")
            return {"success": False, "message": f"Error en captura: {str(e)}"}
            
    async def delete_user_photos(self, user_name: str) -> Dict[str, Any]:
        """
        Elimina todas las fotos de un usuario.
        """
        try:
            user_dir = self.dataset_dir / user_name
            if not user_dir.exists():
                return {"success": False, "message": f"No se encontraron fotos para {user_name}"}
                
            for photo in user_dir.glob("*.jpg"):
                photo.unlink()
            user_dir.rmdir()
            
            async with get_db() as db:
                result = await db.execute(select(User).filter(User.nombre == user_name))
                user = result.scalars().first()
                if user:
                    # También eliminamos todas las faces asociadas
                    await db.execute(
                        select(Face).filter(Face.user_id == user.id).delete()
                    )
                    await db.delete(user)
                    await db.commit()
                    
            return {"success": True, "message": f"Fotos eliminadas para {user_name}"}
            
        except Exception as e:
            logger.error(f"Error eliminando fotos: {e}")
            return {"success": False, "message": f"Error en eliminación: {str(e)}"}
            
    async def list_users(self) -> List[Dict[str, Any]]:
        """
        Lista todos los usuarios con fotos registradas.
        """
        try:
            users = []
            async with get_db() as db:
                result = await db.execute(select(User))
                db_users = result.scalars().all()
                
                for user in db_users:
                    user_dir = self.dataset_dir / user.nombre
                    photo_count = len(list(user_dir.glob("*.jpg"))) if user_dir.exists() else 0
                    
                    users.append({
                        "id": user.id,
                        "nombre": user.nombre,
                        "fecha_registro": user.fecha_registro.isoformat(),
                        "num_fotos": photo_count
                    })
                    
            return users
            
        except Exception as e:
            logger.error(f"Error listando usuarios: {e}")
            return []
