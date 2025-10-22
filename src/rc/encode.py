# src/rc/encode.py
import os
import sys
import pickle
import cv2
import face_recognition
import numpy as np
from typing import Tuple

# -----------------------------
# Rutas: Project root y src dir
# -----------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

# Importar modelos/DB solo si necesitas (NO obligatorio para este encoder que lee de disco)
from db.database import SessionLocal  # no modificado, solo para mantener compatibilidad si lo usas
from db.models import Face, User  # opcional

class FaceEncoder:
    """
    Lee imágenes desde: PROYECTO-IOT/data/dataset/<user>/*.jpg
    Genera encodings y guarda pickle en: PROYECTO-IOT/src/rc/encodings/encodings.pickle
    """

    def __init__(self):
        self.dataset_dir = os.path.join(PROJECT_ROOT, "data", "dataset")
        self.encodings_dir = os.path.join(os.path.dirname(__file__), "encodings")
        os.makedirs(self.encodings_dir, exist_ok=True)
        self.encodings_path = os.path.join(self.encodings_dir, "encodings.pickle")

    def generate_encodings(self, model: str = "hog") -> Tuple[int, int]:
        """
        Recorre data/dataset, genera encodings y guarda pickle.
        Retorna (encodings_count, users_processed).
        """
        if not os.path.exists(self.dataset_dir):
            raise FileNotFoundError(f"No existe dataset en: {self.dataset_dir}")

        known_encodings = []
        known_names = []
        users_processed = 0

        for user_name in sorted(os.listdir(self.dataset_dir)):
            user_path = os.path.join(self.dataset_dir, user_name)
            if not os.path.isdir(user_path):
                continue
            users_processed += 1
            for fname in sorted(os.listdir(user_path)):
                fpath = os.path.join(user_path, fname)
                img = cv2.imread(fpath)
                if img is None:
                    continue
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                boxes = face_recognition.face_locations(rgb, model=model)
                if not boxes:
                    continue
                encs = face_recognition.face_encodings(rgb, boxes)
                for e in encs:
                    known_encodings.append(e.tolist())
                    known_names.append(user_name)

        # Guardar en src/rc/encodings/encodings.pickle (exactamente como pediste)
        with open(self.encodings_path, "wb") as f:
            pickle.dump({"encodings": known_encodings, "names": known_names}, f)

        return len(known_encodings), users_processed


# Ejecución opcional
if __name__ == "__main__":
    count, users = FaceEncoder().generate_encodings()
    print(f"Encodings: {count}, Usuarios: {users}")
    print("Guardado en:", os.path.join(os.path.dirname(__file__), "encodings", "encodings.pickle"))
