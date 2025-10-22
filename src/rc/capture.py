import sys
import os
import cv2
from sqlalchemy.orm import Session

# 🔹 Forzar path al root del proyecto para usar la misma base de datos que el servidor
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from src.db.database import SessionLocal  # Import correcto
from src.db.models import User, Face

# -------------------------------
# Ruta base para guardar imágenes
# -------------------------------
DATASET_DIR = os.path.join(PROJECT_ROOT, "data", "dataset")
os.makedirs(DATASET_DIR, exist_ok=True)
print(f"Las capturas se guardarán en: {DATASET_DIR}")


def capture(name, save_dir=DATASET_DIR, cam_id=0, max_imgs=5):
    """
    Captura imágenes del rostro y las guarda tanto en el disco como en la base de datos.
    """
    os.makedirs(save_dir, exist_ok=True)
    person_dir = os.path.join(save_dir, name)
    os.makedirs(person_dir, exist_ok=True)

    cap = cv2.VideoCapture(cam_id)
    count = 0
    print("Presiona 's' para guardar imagen, 'q' para salir.")

    db: Session = SessionLocal()

    # Crear usuario si no existe
    user = db.query(User).filter(User.nombre == name).first()
    if not user:
        user = User(nombre=name, embedding="[]", is_owner=False)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Usuario '{name}' agregado a la base de datos con ID {user.id}")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("No se pudo leer la cámara.")
            break
        cv2.imshow("capture", frame)
        k = cv2.waitKey(1) & 0xFF

        if k == ord('s'):
            # Guardar imagen en disco
            path = os.path.join(person_dir, f"{count+1}.jpg")
            cv2.imwrite(path, frame)
            print("Imagen guardada en disco:", path)

            # Guardar imagen en la base de datos
            _, buffer = cv2.imencode(".jpg", frame)
            image_bytes = buffer.tobytes()

            new_face = Face(user_id=user.id, image_data=image_bytes)
            db.add(new_face)
            db.commit()
            print(f"Imagen {count+1} almacenada en la base de datos con id {new_face.id}.")

            count += 1
            if count >= max_imgs:
                break

        elif k == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    db.close()
    print("Captura finalizada y datos guardados correctamente.")


if __name__ == "__main__":
    name = input("Nombre de la persona: ").strip()
    capture(name)
