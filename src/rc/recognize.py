import cv2
import face_recognition
import numpy as np
from pathlib import Path
from typing import List, Optional, Dict, Any
from src.db.database import get_db
from src.db.models import Face, User
from sqlalchemy import select
import logging
import asyncio

logger = logging.getLogger("FaceRecognizer")


class FaceRecognizer:
    """
    Clase responsable de reconocimiento facial.
    Maneja la carga de encodings y el reconocimiento desde cámara o archivo.
    """

    def __init__(self):
        self.known_face_encodings: List[np.ndarray] = []
        self.known_face_users: List[str] = []
        self.dataset_dir = Path(__file__).parent.parent.parent / "data" / "dataset"
        self.tolerance = 0.45  # distancia máxima para considerar match

    async def load_known_faces(self):
        """
        Carga los encodings de la base de datos.
        """
        self.known_face_encodings.clear()
        self.known_face_users.clear()

        try:
            async with get_db() as db:
                # Traemos las faces junto a su usuario de manera JOIN para evitar lazy-loading
                result = await db.execute(select(Face, User).join(User))
                faces_with_users = result.all()

                for face_record, user in faces_with_users:
                    nparr = np.frombuffer(face_record.image_data, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if img is None:
                        continue

                    encodings = face_recognition.face_encodings(img)
                    if encodings:
                        self.known_face_encodings.append(encodings[0])
                        self.known_face_users.append(user.nombre)

            logger.info("Encodings cargados correctamente.")

        except Exception as e:
            logger.error(f"Error cargando encodings: {e}")

    async def recognize_from_file(self, image_path: str) -> List[str]:
        """
        Reconoce rostros desde una imagen.
        """
        try:
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image)
            if not face_locations:
                return []

            face_encodings = face_recognition.face_encodings(image, face_locations)
            recognized_users = []

            for encoding in face_encodings:
                matches = face_recognition.compare_faces(
                    self.known_face_encodings, encoding, tolerance=self.tolerance
                )
                name = "Desconocido"
                if True in matches:
                    first_match_index = matches.index(True)
                    name = self.known_face_users[first_match_index]
                recognized_users.append(name)

            return recognized_users

        except Exception as e:
            logger.error(f"Error reconociendo desde archivo: {e}")
            return []

    async def recognize_from_cam(self) -> List[str]:
        """
        Reconoce rostros desde la cámara en tiempo real.
        """
        recognized_users = []
        cap = cv2.VideoCapture(0)

        if not cap.isOpened():
            logger.error("No se pudo abrir la cámara.")
            return []

        try:
            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                rgb_small_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                face_locations = face_recognition.face_locations(rgb_small_frame)
                face_encodings = face_recognition.face_encodings(
                    rgb_small_frame, face_locations
                )

                frame_recognized_users = []

                for encoding in face_encodings:
                    matches = face_recognition.compare_faces(
                        self.known_face_encodings, encoding, tolerance=self.tolerance
                    )
                    name = "Desconocido"
                    if True in matches:
                        first_match_index = matches.index(True)
                        name = self.known_face_users[first_match_index]
                    frame_recognized_users.append(name)

                # Mostrar resultados en el frame
                for (top, right, bottom, left), name in zip(
                    face_locations, frame_recognized_users
                ):
                    cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                    cv2.putText(
                        frame,
                        name,
                        (left, top - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8,
                        (0, 255, 0),
                        2,
                    )

                cv2.imshow("Reconocimiento Facial", frame)
                recognized_users.extend(frame_recognized_users)

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            cap.release()
            cv2.destroyAllWindows()

            return recognized_users

        except Exception as e:
            logger.error(f"Error en reconocimiento desde cámara: {e}")
            cap.release()
            cv2.destroyAllWindows()
            return recognized_users

    async def recognize_frame(self, frame):
        """
        Reconoce rostros en un solo frame (usado por test_face_pipeline.py)
        """
        if frame is None or frame.size == 0:
            return []

        # Convertir de BGR (OpenCV) a RGB (face_recognition)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Detectar rostros
        face_locations = face_recognition.face_locations(rgb_frame)
        if not face_locations:
            return []

        # Codificar los rostros detectados
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        recognized = []
        for (top, right, bottom, left), encoding in zip(face_locations, face_encodings):
            matches = face_recognition.compare_faces(
                self.known_face_encodings, encoding, tolerance=self.tolerance
            )
            name = "Desconocido"
            if True in matches:
                first_match_index = matches.index(True)
                name = self.known_face_users[first_match_index]
            recognized.append((name, (top, right, bottom, left)))

        return recognized
