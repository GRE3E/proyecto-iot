import sys
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import pickle

# -------------------- PATHS --------------------
# Asegurarnos de que Python encuentre la carpeta db
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(BASE_DIR)

# Ahora se pueden importar los módulos de db
from db.database import SessionLocal, engine
from db.models import Base, User, Face  # Asegúrate de importar Face

# Carpetas para dataset y encodings
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
ENCODINGS_PATH = os.path.join(BASE_DIR, "encodings", "encodings.pickle")

# -------------------- FLASK --------------------
app = Flask(__name__)
CORS(app)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

# -------------------- FUNCIONES AUXILIARES --------------------
def load_encodings():
    """Carga encodings desde pickle"""
    if os.path.exists(ENCODINGS_PATH):
        with open(ENCODINGS_PATH, "rb") as f:
            return pickle.load(f)
    else:
        return {"encodings": [], "names": []}

def save_encodings(data):
    """Guarda encodings en pickle"""
    os.makedirs(os.path.dirname(ENCODINGS_PATH), exist_ok=True)
    with open(ENCODINGS_PATH, "wb") as f:
        pickle.dump(data, f)

def encode_faces(dataset_dir=DATASET_DIR, encodings_path=ENCODINGS_PATH):
    """Genera encodings a partir de todas las imágenes en dataset"""
    all_encodings = []
    all_names = []

    for person_name in os.listdir(dataset_dir):
        person_dir = os.path.join(dataset_dir, person_name)
        if not os.path.isdir(person_dir):
            continue
        for img_name in os.listdir(person_dir):
            img_path = os.path.join(person_dir, img_name)
            image = face_recognition.load_image_file(img_path)
            encs = face_recognition.face_encodings(image)
            if encs:
                all_encodings.append(encs[0])
                all_names.append(person_name)

    data = {"encodings": all_encodings, "names": all_names}
    save_encodings(data)
    return data

# Cargar encodings al iniciar
data = load_encodings()

# -------------------- ENDPOINTS --------------------

# Health check
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Servidor Flask funcionando"}), 200

# CREATE: agregar persona
@app.route("/faces", methods=["POST"])
def add_face():
    db = SessionLocal()
    name = request.form.get("name")
    file = request.files.get("image")
    
    if not name or not file:
        db.close()
        return jsonify({"error": "Falta nombre o imagen"}), 400

    # Guardar imagen
    person_dir = os.path.join(DATASET_DIR, name)
    os.makedirs(person_dir, exist_ok=True)
    filepath = os.path.join(person_dir, file.filename)
    file.save(filepath)

    # Agregar usuario a la DB
    user = db.query(User).filter(User.nombre == name).first()
    if not user:
        # Asigna un valor por defecto a embedding (ajusta según tu modelo)
        try:
            new_user = User(nombre=name, embedding="[]", is_owner=False)
            db.add(new_user)
            db.commit()
        except Exception as e:
            db.rollback()
            db.close()
            return jsonify({"error": f"Error al guardar usuario: {str(e)}"}), 500

    db.close()

    # Actualizar encodings automáticamente
    global data
    data = encode_faces()

    return jsonify({"message": f"Foto guardada y encodings actualizados para {name}"}), 200

# READ: obtener lista de personas desde la DB
@app.route("/faces", methods=["GET"])
def list_faces():
    db = SessionLocal()
    users = db.query(User).all()
    people = [u.nombre for u in users]
    db.close()
    return jsonify({"people": people})

# UPDATE: actualizar imagen de una persona
@app.route("/faces/<name>", methods=["PUT"])
def update_face(name):
    db = SessionLocal()
    file = request.files.get("image")
    if not file:
        db.close()
        return jsonify({"error": "Falta imagen"}), 400

    person_dir = os.path.join(DATASET_DIR, name)
    if not os.path.exists(person_dir):
        db.close()
        return jsonify({"error": "No existe la persona"}), 404

    # Eliminar imágenes anteriores
    for f in os.listdir(person_dir):
        os.remove(os.path.join(person_dir, f))

    # Guardar la nueva imagen
    filepath = os.path.join(person_dir, file.filename)
    file.save(filepath)
    db.close()

    # Actualizar encodings automáticamente
    global data
    data = encode_faces()

    return jsonify({"message": f"Imagen actualizada y encodings regenerados para {name}"}), 200

# DELETE: eliminar persona
@app.route("/faces/<name>", methods=["DELETE"])
def delete_face(name):
    db = SessionLocal()
    person_dir = os.path.join(DATASET_DIR, name)
    if os.path.exists(person_dir):
        # Borrar imágenes
        for f in os.listdir(person_dir):
            os.remove(os.path.join(person_dir, f))
        os.rmdir(person_dir)

    # Borrar usuario en DB
    user = db.query(User).filter(User.nombre == name).first()
    if user:
        try:
            # Borrar primero los registros de la tabla faces relacionados con el usuario
            db.query(Face).filter(Face.user_id == user.id).delete()
            db.delete(user)
            db.commit()
        except Exception as e:
            db.rollback()
            db.close()
            return jsonify({"error": f"Error al eliminar usuario: {str(e)}"}), 500
    db.close()

    # Actualizar encodings automáticamente
    global data
    data = encode_faces()

    return jsonify({"message": f"{name} eliminado y encodings actualizados"}), 200

# RECOGNITION: verificar rostro
@app.route("/recognize", methods=["POST"])
def recognize_face():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "No se envió imagen"}), 400

    temp_path = "temp.jpg"
    file.save(temp_path)

    image = face_recognition.load_image_file(temp_path)
    encs = face_recognition.face_encodings(image)
    
    if len(encs) == 0:
        os.remove(temp_path)
        return jsonify({"recognized": False, "name": None}), 200

    enc = encs[0]
    matches = face_recognition.compare_faces(data["encodings"], enc)
    name = "Desconocido"
    if True in matches:
        matched_idxs = [i for i, m in enumerate(matches) if m]
        counts = {}
        for i in matched_idxs:
            n = data["names"][i]
            counts[n] = counts.get(n, 0) + 1
        name = max(counts, key=counts.get)
    
    os.remove(temp_path)
    return jsonify({"recognized": name != "Desconocido", "name": name})

# -------------------- INICIO DEL SERVIDOR --------------------
if __name__ == "__main__":
    app.run(debug=True)
