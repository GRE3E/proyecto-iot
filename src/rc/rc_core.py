import sys
import os
import cv2
import face_recognition
import pickle
import numpy as np
from sqlalchemy.orm import Session
from contextlib import contextmanager
import logging

# ----------------------------- PATHS -----------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from src.db.database import SessionLocal
from src.db.models import User, Face

# Carpetas consistentes con tu proyecto
DATASET_DIR = os.path.join(PROJECT_ROOT, "data", "dataset")
ENCODINGS_DIR = os.path.join(PROJECT_ROOT, "src", "rc", "encodings")
ENCODINGS_PATH = os.path.join(ENCODINGS_DIR, "encodings.pickle")

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(ENCODINGS_DIR, exist_ok=True)

# ----------------------------- LOGGING -----------------------------
logger = logging.getLogger("FaceRecognitionCore")
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
ch.setFormatter(formatter)
logger.addHandler(ch)

# ----------------------------- CORE CLASS -----------------------------
class FaceRecognitionCore:
    def __init__(self):
        logger.info("FaceRecognitionCore inicializado.")

    @contextmanager
    def _get_db(self):
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    # ------------------------ CAPTURE ------------------------
    def capture_faces(self, name: str, cam_id: int = 0, max_imgs: int = 5):
        logger.info(f"Iniciando captura de rostros para: {name}")
        person_dir = os.path.join(DATASET_DIR, name)
        os.makedirs(person_dir, exist_ok=True)

        cap = cv2.VideoCapture(cam_id)
        count = 0

        with self._get_db() as db:
            user = db.query(User).filter(User.nombre == name).first()
            if not user:
                user = User(nombre=name, embedding="[]", is_owner=False)
                db.add(user)
                db.commit()
                db.refresh(user)
                logger.info(f"Usuario '{name}' agregado a la base de datos con ID {user.id}")

            print("Presiona 's' para guardar imagen, 'q' para salir.")
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                cv2.imshow("capture", frame)
                k = cv2.waitKey(1) & 0xFF

                if k == ord('s'):
                    path = os.path.join(person_dir, f"{count+1}.jpg")
                    cv2.imwrite(path, frame)
                    logger.info(f"Imagen guardada: {path}")

                    _, buffer = cv2.imencode(".jpg", frame)
                    image_bytes = buffer.tobytes()

                    new_face = Face(user_id=user.id, image_data=image_bytes)
                    db.add(new_face)
                    db.commit()
                    logger.info(f"Imagen {count+1} almacenada en la base de datos.")

                    count += 1
                    if count >= max_imgs:
                        break

                elif k == ord('q'):
                    break

        cap.release()
        cv2.destroyAllWindows()
        logger.info("Captura finalizada y datos guardados correctamente.")

    # ------------------------ ENCODE ------------------------
    def encode_faces(self):
        logger.info("Iniciando codificación de rostros desde la base de datos.")

        known_encodings = []
        known_names = []

        with self._get_db() as db:
            faces = db.query(Face).all()
            logger.info(f"Se encontraron {len(faces)} registros en la tabla 'Face'.")

            for face in faces:
                user = db.query(User).filter(User.id == face.user_id).first()
                name = user.nombre if user else "Desconocido"

                nparr = np.frombuffer(face.image_data, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if image is None:
                    logger.warning(f"Error decodificando imagen del usuario {name}.")
                    continue

                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                boxes = face_recognition.face_locations(rgb, model="hog")
                encs = face_recognition.face_encodings(rgb, boxes)

                for e in encs:
                    known_encodings.append(e.tolist())
                    known_names.append(name)

        with open(ENCODINGS_PATH, "wb") as f:
            pickle.dump({"encodings": known_encodings, "names": known_names}, f)

        logger.info(f"Encodings creados y guardados en: {ENCODINGS_PATH}")
        logger.info(f"Total de rostros codificados: {len(known_encodings)}")

    # ------------------------ RECOGNIZE ------------------------
    def recognize_faces(self, cam_id: int = 0):
        logger.info("Iniciando reconocimiento facial.")

        if not os.path.exists(ENCODINGS_PATH):
            raise FileNotFoundError(
                f"No se encontró el archivo de encodings: {ENCODINGS_PATH}. Por favor, ejecute encode_faces primero."
            )

        with open(ENCODINGS_PATH, "rb") as f:
            data = pickle.load(f)

        cap = cv2.VideoCapture(cam_id)
        acceso = False
        recognized_name = "Desconocido"

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            boxes = face_recognition.face_locations(rgb)
            encs = face_recognition.face_encodings(rgb, boxes)

            for enc in encs:
                matches = face_recognition.compare_faces(data["encodings"], enc)
                recognized_name = "Desconocido"

                if True in matches:
                    matched_idxs = [i for i, m in enumerate(matches) if m]
                    counts = {}
                    for i in matched_idxs:
                        n = data["names"][i]
                        counts[n] = counts.get(n, 0) + 1
                    recognized_name = max(counts, key=counts.get)
                    acceso = True

                logger.info(f"Rostro detectado: {recognized_name}")

            cv2.imshow("Acceso", frame)

            if cv2.waitKey(1) & 0xFF == ord('q') or acceso:
                break

        cap.release()
        cv2.destroyAllWindows()

        if acceso:
            logger.info(f"Acceso concedido a: {recognized_name}")
            return recognized_name
        else:
            logger.info("Acceso denegado")
            return None

# ----------------------------- EJEMPLO DE USO -----------------------------
if __name__ == "__main__":
    face_core = FaceRecognitionCore()

    # Descomentar según necesites:
    # name_to_capture = input("Nombre de la persona a capturar: ").strip()
    # face_core.capture_faces(name_to_capture)
    # face_core.encode_faces()
    # recognized_name = face_core.recognize_faces()
    # print(f"¡Bienvenido, {recognized_name}!" if recognized_name else "No se reconoció a nadie.")
