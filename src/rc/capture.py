# src/rc/capture.py
import os
import sys
import cv2
from sqlalchemy.orm import Session

# -----------------------------
# Rutas: Project root y src dir
# -----------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

# Import DB desde paquete 'db' (resuelto con src en sys.path)
from db.database import SessionLocal
from db.models import User, Face

# -----------------------------
# Dataset absoluto en /data/dataset
# -----------------------------
DATASET_DIR = os.path.join(PROJECT_ROOT, "data", "dataset")
os.makedirs(DATASET_DIR, exist_ok=True)


class FaceCapture:
    """
    Captura imágenes y las guarda en:
      PROYECTO-IOT/data/dataset/<username>/*.jpg
    Además guarda la imagen (bytes) en la tabla Face de la BD.
    """

    def __init__(self, dataset_dir: str = None):
        self.dataset_dir = dataset_dir or DATASET_DIR
        os.makedirs(self.dataset_dir, exist_ok=True)

    def capture(self, name: str, cam_id: int = 0, max_imgs: int = 5) -> int:
        """
        Captura 'max_imgs' fotos del usuario 'name'.
        Devuelve la cantidad de imágenes almacenadas.
        """
        if not name:
            raise ValueError("El parámetro 'name' es obligatorio.")

        person_dir = os.path.join(self.dataset_dir, name)
        os.makedirs(person_dir, exist_ok=True)

        cap = cv2.VideoCapture(cam_id)
        if not cap.isOpened():
            raise RuntimeError("No se pudo abrir la cámara.")

        db: Session = SessionLocal()
        user = db.query(User).filter(User.nombre == name).first()
        if not user:
            user = User(nombre=name, embedding="[]", is_owner=False)
            db.add(user)
            db.commit()
            db.refresh(user)

        count = 0
        try:
            while count < max_imgs:
                ret, frame = cap.read()
                if not ret:
                    break

                # Mostrar (opcional) y guardar con tecla 's'
                cv2.imshow("Captura - presiona 's' para guardar / 'q' para salir", frame)
                key = cv2.waitKey(1) & 0xFF

                if key == ord("s"):
                    count += 1
                    img_name = f"{count}.jpg"
                    img_path = os.path.join(person_dir, img_name)
                    cv2.imwrite(img_path, frame)

                    # Guardar bytes en BD
                    _, buf = cv2.imencode(".jpg", frame)
                    image_bytes = buf.tobytes()
                    face = Face(user_id=user.id, image_data=image_bytes)
                    db.add(face)
                    db.commit()

                elif key == ord("q"):
                    break
        finally:
            cap.release()
            cv2.destroyAllWindows()
            db.close()

        return count


# Para compatibilidad manual (no obligatorio para tests)
if __name__ == "__main__":
    name = input("Nombre de la persona: ").strip()
    cnt = FaceCapture().capture(name=name, max_imgs=5)
    print(f"Imágenes guardadas: {cnt}")
