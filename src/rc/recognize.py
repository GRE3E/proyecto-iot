import cv2
import face_recognition
import numpy as np
import logging
from sqlalchemy import select
from src.db.database import get_db
from src.db.models import User, Face
from datetime import datetime

logger = logging.getLogger("FaceRecognizer")

class FaceRecognizer:
    """
    Clase responsable del reconocimiento facial en tiempo real.
    Compara rostros detectados contra los encodings almacenados.
    """
    
    def __init__(self):
        """
        Inicializa el reconocedor facial.
        """
        self.model = "hog"  # Usar 'cnn' si hay GPU disponible
        self.tolerance = 0.6
        self.min_face_size = 30
        self.known_face_encodings = []
        self.known_face_users = []
        
    async def load_known_faces(self):
        """
        Carga los encodings faciales conocidos desde la base de datos.
        """
        self.known_face_encodings = []
        self.known_face_users = []
        
        async with get_db() as db:
            result = await db.execute(select(User).filter(User.face_encoding != None))
            users = result.scalars().all()
            
            for user in users:
                encoding = np.frombuffer(user.face_encoding, dtype=np.float64)
                self.known_face_encodings.append(encoding)
                self.known_face_users.append(user)
                
        logger.info(f"Encodings cargados: {len(self.known_face_encodings)}")
        
    def recognize_faces(self, frame: np.ndarray) -> list:
        """
        Detecta y reconoce rostros en un frame de video.
        
        Args:
            frame (np.ndarray): Frame de video a procesar
            
        Returns:
            list: Lista de tuplas (usuario, ubicación) para cada rostro reconocido
        """
        # Convertir BGR a RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Detectar rostros
        face_locations = face_recognition.face_locations(rgb_frame, model=self.model)
        if not face_locations:
            return []
            
        # Obtener encodings
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        results = []
        for face_encoding, face_location in zip(face_encodings, face_locations):
            # Verificar tamaño mínimo del rostro
            top, right, bottom, left = face_location
            face_height = bottom - top
            face_width = right - left
            
            if min(face_height, face_width) < self.min_face_size:
                continue
                
            # Comparar con rostros conocidos
            matches = face_recognition.compare_faces(
                self.known_face_encodings, 
                face_encoding,
                tolerance=self.tolerance
            )
            
            if True in matches:
                # Encontrar el mejor match
                face_distances = face_recognition.face_distance(
                    self.known_face_encodings,
                    face_encoding
                )
                best_match_index = np.argmin(face_distances)
                
                if matches[best_match_index]:
                    user = self.known_face_users[best_match_index]
                    results.append((user, face_location))
                    
        return results
