import sys
import os
import face_recognition
import pickle
import numpy as np
import cv2

# -------------------------------------------------
# 🔹 Configurar rutas correctamente
# -------------------------------------------------
# BASE_DIR → raíz del proyecto (fuera de src)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Agregar carpeta src al path para poder importar db
SRC_DIR = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

# -------------------------------------------------
# 🔹 Importar módulos de la base de datos
# -------------------------------------------------
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.models import User, Face

# -------------------------------------------------
# 🔹 Definir rutas
# -------------------------------------------------
ENCODINGS_DIR = os.path.join(BASE_DIR, "src", "rc", "encodings")
ENCODINGS_PATH = os.path.join(ENCODINGS_DIR, "encodings.pickle")

# Crear carpeta si no existe
os.makedirs(ENCODINGS_DIR, exist_ok=True)
print(f"Los encodings se guardarán en: {ENCODINGS_PATH}")

# Verificar ubicación de la base de datos
db_path = os.path.join(BASE_DIR, "data", "casa_inteligente.db")
if not os.path.exists(db_path):
    print(f"[ERROR] No se encontró la base de datos en: {db_path}")
else:
    print(f"Base de datos en: {db_path}")

# -------------------------------------------------
# 🔹 Conexión a la base de datos
# -------------------------------------------------
db: Session = SessionLocal()

known_encodings = []
known_names = []

# -------------------------------------------------
# 🔹 Leer las imágenes guardadas en la BD
# -------------------------------------------------
faces = db.query(Face).all()
print(f"Se encontraron {len(faces)} registros en la tabla 'Face'.")

for face in faces:
    user = db.query(User).filter(User.id == face.user_id).first()
    name = user.nombre if user else "Desconocido"

    # Convertir bytes a imagen
    nparr = np.frombuffer(face.image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        print(f"[ERROR] No se pudo decodificar imagen de {name}.")
        continue

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    boxes = face_recognition.face_locations(rgb, model="hog")

    if len(boxes) == 0:
        print(f"[WARN] No se detectaron rostros en la imagen de {name}.")
        continue

    encs = face_recognition.face_encodings(rgb, boxes)

    for e in encs:
        known_encodings.append(e.tolist())
        known_names.append(name)

# -------------------------------------------------
# 🔹 Guardar encodings
# -------------------------------------------------
with open(ENCODINGS_PATH, "wb") as f:
    pickle.dump({"encodings": known_encodings, "names": known_names}, f)

print("------------------------------------")
print("Encodings creados y guardados correctamente en:")
print(f"  {ENCODINGS_PATH}")
print(f"Total de rostros codificados: {len(known_encodings)}")
print("------------------------------------")

db.close()
