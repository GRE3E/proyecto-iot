import pytest
from src.rc.rc_core import FaceRecognitionCore

def test_recognize_face_from_cam():
    """
    Test para reconocer un rostro usando la cámara activa.
    Valida que cualquier usuario registrado en la BD/dataset sea reconocido
    e imprime su nombre.
    """
    core = FaceRecognitionCore()

    print("\n🔹 Iniciando test de reconocimiento facial por cámara...")
    print("Por favor, posiciona tu rostro frente a la cámara y espera a que se reconozca.")

    
    recognized_name = core.recognize_faces_from_cam()

    
    if recognized_name:
        print(f"✅ Rostro reconocido correctamente: {recognized_name}")
    else:
        print("❌ No se reconoció ningún rostro")

   
    assert recognized_name is not None and recognized_name != "" and recognized_name != "Desconocido", \
        "❌ No se reconoció ningún rostro registrado"
    


#Comando de ejecucion    python -m pytest -s src/test/test_face_recognition.py