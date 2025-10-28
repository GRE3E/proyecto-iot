import cv2
import face_recognition
import numpy as np
import logging
from sqlalchemy import select
from src.db.database import get_db
from src.db.models import User, Face

logger = logging.getLogger("FaceRecognizer")

class FaceRecognizer:
    """
    Clase responsable del reconocimiento facial en tiempo real.
    Compara rostros detectados contra los encodings almacenados.
    """

    def __init__(self):
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
            result = await db.execute(select(Face))
            faces = result.scalars().all()

            for face_record in faces:
                # Convertir la imagen binaria a numpy array y luego a encoding
                nparr = np.frombuffer(face_record.image_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                encodings = face_recognition.face_encodings(img)
                if encodings:
                    self.known_face_encodings.append(encodings[0])
                    # Guardar el nombre directamente como string
                    self.known_face_users.append(face_record.user.nombre)

        logger.info(f"Encodings cargados: {len(self.known_face_encodings)}")

    def recognize_faces(self, frame: np.ndarray) -> list:
        """
        Detecta y reconoce rostros en un frame de video.
        Devuelve lista de tuplas (nombre_usuario, ubicación)
        """
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame, model=self.model)
        if not face_locations:
            return []

        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        results = []

        for face_encoding, face_location in zip(face_encodings, face_locations):
            top, right, bottom, left = face_location
            face_height = bottom - top
            face_width = right - left

            if min(face_height, face_width) < self.min_face_size:
                continue

            matches = face_recognition.compare_faces(
                self.known_face_encodings,
                face_encoding,
                tolerance=self.tolerance
            )

            if True in matches:
                face_distances = face_recognition.face_distance(
                    self.known_face_encodings,
                    face_encoding
                )
                best_idx = np.argmin(face_distances)
                if matches[best_idx]:
                    user_name = self.known_face_users[best_idx]
                else:
                    user_name = "Desconocido"
            else:
                user_name = "Desconocido"

            results.append((user_name, face_location))

        return results
