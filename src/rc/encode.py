import os
import sys
import pickle
import cv2
import face_recognition
import logging
from typing import Tuple

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

logger = logging.getLogger("FaceEncoder")

class FaceEncoder:
    """
    Lee imágenes desde: data/dataset/<usuario>/*.jpg
    Genera encodings y guarda el archivo: src/rc/encodings/encodings.pickle
    """

    def __init__(self, encodings_path: str = None):
        self.dataset_dir = os.path.join(PROJECT_ROOT, "data", "dataset")
        self.encodings_dir = os.path.join(os.path.dirname(__file__), "encodings")
        os.makedirs(self.encodings_dir, exist_ok=True)
        self.encodings_path = encodings_path or os.path.join(self.encodings_dir, "encodings.pickle")

    def generate_encodings(self, dataset_dir: str = None, model: str = "hog") -> Tuple[int, int]:
        """
        Recorre data/dataset, genera encodings y guarda el archivo pickle.
        Retorna una tupla: (cantidad_encodings, cantidad_usuarios_procesados)
        """
        dataset_dir = dataset_dir or self.dataset_dir

        if not os.path.exists(dataset_dir):
            raise FileNotFoundError(f"No existe el dataset en: {dataset_dir}")

        known_encodings = []
        known_names = []
        users_processed = 0

        for user_name in sorted(os.listdir(dataset_dir)):
            user_path = os.path.join(dataset_dir, user_name)
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

       
        with open(self.encodings_path, "wb") as f:
            pickle.dump({"encodings": known_encodings, "names": known_names}, f)
        logger.info(f"Encodings guardados en: {self.encodings_path}")
        return len(known_encodings), users_processed
