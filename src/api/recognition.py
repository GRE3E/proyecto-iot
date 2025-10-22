import sys
import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

# -------------------- PATHS --------------------
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Importar tus clases de lógica
from rc.capture import FaceCapture
from rc.encode import FaceEncoder
from rc.recognize import FaceRecognizer

# Rutas consistentes según tu proyecto
DATASET_DIR = os.path.join(BASE_DIR, "..", "data", "dataset")
ENCODINGS_DIR = os.path.join(BASE_DIR, "rc", "encodings")
ENCODINGS_PATH = os.path.join(ENCODINGS_DIR, "encodings.pickle")
os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(ENCODINGS_DIR, exist_ok=True)

# -------------------- FLASK --------------------
app = Flask(__name__)
CORS(app)

# Inicializar encodings
encoder = FaceEncoder()
data = encoder.load_encodings()  # Carga inicial si existe

# -------------------- ENDPOINTS --------------------

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Servidor Flask funcionando"}), 200

@app.route("/faces", methods=["POST"])
def add_face():
    name = request.form.get("name")
    file = request.files.get("image")

    if not name or not file:
        return jsonify({"error": "Falta nombre o imagen"}), 400

    # Capturar y guardar imagen usando FaceCapture
    capture = FaceCapture(dataset_dir=DATASET_DIR)
    capture.capture_from_file(name=name, file=file)  # Método modificado para aceptar file

    # Actualizar encodings
    global data
    data = encoder.generate_encodings(dataset_dir=DATASET_DIR, encodings_path=ENCODINGS_PATH)

    return jsonify({"message": f"Foto guardada y encodings actualizados para {name}"}), 200

@app.route("/faces", methods=["GET"])
def list_faces():
    capture = FaceCapture(dataset_dir=DATASET_DIR)
    people = capture.list_registered_users()
    return jsonify({"people": people})

@app.route("/faces/<name>", methods=["PUT"])
def update_face(name):
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "Falta imagen"}), 400

    capture = FaceCapture(dataset_dir=DATASET_DIR)
    success = capture.update_user_image(name=name, file=file)
    if not success:
        return jsonify({"error": f"No existe la persona {name}"}), 404

    # Regenerar encodings
    global data
    data = encoder.generate_encodings(dataset_dir=DATASET_DIR, encodings_path=ENCODINGS_PATH)

    return jsonify({"message": f"Imagen actualizada y encodings regenerados para {name}"}), 200

@app.route("/faces/<name>", methods=["DELETE"])
def delete_face(name):
    capture = FaceCapture(dataset_dir=DATASET_DIR)
    deleted = capture.delete_user(name=name)
    if not deleted:
        return jsonify({"error": f"No existe la persona {name}"}), 404

    # Regenerar encodings
    global data
    data = encoder.generate_encodings(dataset_dir=DATASET_DIR, encodings_path=ENCODINGS_PATH)

    return jsonify({"message": f"{name} eliminado y encodings actualizados"}), 200

@app.route("/recognize", methods=["POST"])
def recognize_face():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "No se envió imagen"}), 400

    temp_path = f"temp_{uuid.uuid4().hex}.jpg"
    file.save(temp_path)

    recognizer = FaceRecognizer(encodings_path=ENCODINGS_PATH)
    recognized_name = recognizer.recognize_from_file(temp_path)  # Método modificado para aceptar archivo
    os.remove(temp_path)

    return jsonify({"recognized": recognized_name != "Desconocido", "name": recognized_name})

# -------------------- INICIO DEL SERVIDOR --------------------
if __name__ == "__main__":
    app.run(debug=True)
