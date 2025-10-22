import cv2
import face_recognition
import pickle
import os

# --- Rutas dinámicas relativas a este archivo ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Esto apunta a /src/rc
ENCODINGS_PATH = os.path.join(BASE_DIR, "encodings", "encodings.pickle")


# Verificar existencia del archivo
if not os.path.exists(ENCODINGS_PATH):
    raise FileNotFoundError(f"No se encontró el archivo de encodings: {ENCODINGS_PATH}")

# Cargar datos
with open(ENCODINGS_PATH, "rb") as f:
    data = pickle.load(f)

# Iniciar cámara
cap = cv2.VideoCapture(0)
acceso = False
name = "Desconocido"

print("Iniciando reconocimiento facial...")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    boxes = face_recognition.face_locations(rgb)
    encs = face_recognition.face_encodings(rgb, boxes)

    for enc in encs:
        matches = face_recognition.compare_faces(data["encodings"], enc)
        name = "Desconocido"

        if True in matches:
            matched_idxs = [i for i, m in enumerate(matches) if m]
            counts = {}
            for i in matched_idxs:
                n = data["names"][i]
                counts[n] = counts.get(n, 0) + 1
            name = max(counts, key=counts.get)
            acceso = True

        print("Rostro detectado:", name)

    cv2.imshow("Acceso", frame)

    # Presiona 'q' para salir o se rompe si se reconoce
    if cv2.waitKey(1) & 0xFF == ord('q') or acceso:
        break

cap.release()
cv2.destroyAllWindows()

if acceso:
    print(" Acceso concedido a:", name)
else:
    print(" Acceso denegado")
