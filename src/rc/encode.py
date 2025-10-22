import face_recognition
import pickle
import sys
import os
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.models import User, Face
import numpy as np
import cv2

# Aseguramos que Python pueda encontrar el paquete db
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# -------------------------------
# 🔹 Definición de rutas consistentes
# -------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # C:\Users\Usuario\Desktop\Facial\src
ENCODINGS_DIR = os.path.join(BASE_DIR, "encodings")
ENCODINGS_PATH = os.path.join(ENCODINGS_DIR, "encodings.pickle")

# -------------------------------
# 🔹 Conexión a la base de datos
# -------------------------------
db: Session = SessionLocal()

known_encodings = []
known_names = []

# -------------------------------
# 🔹 Obtener todas las caras de la BD
# -------------------------------
faces = db.query(Face).all()
print(f"🧠 Se encontraron {len(faces)} registros en la tabla 'Face'.")

for face in faces:
    user = db.query(User).filter(User.id == face.user_id).first()
    name = user.nombre if user else "Desconocido"

    # Convertir bytes de imagen a array
    nparr = np.frombuffer(face.image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        print(f"⚠️ Error decodificando imagen del usuario {name}.")
        continue

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Obtener encodings faciales
    boxes = face_recognition.face_locations(rgb, model="hog")
    encs = face_recognition.face_encodings(rgb, boxes)

    for e in encs:
        # Convertimos el array a lista para evitar errores al usar pickle
        known_encodings.append(e.tolist())
        known_names.append(name)

# -------------------------------
# 🔹 Guardar encodings
# -------------------------------
os.makedirs(ENCODINGS_DIR, exist_ok=True)
with open(ENCODINGS_PATH, "wb") as f:
    pickle.dump({"encodings": known_encodings, "names": known_names}, f)

print("✅ Encodings creados y guardados en:", ENCODINGS_PATH)
print(f"Total de rostros codificados: {len(known_encodings)}")

db.close()
