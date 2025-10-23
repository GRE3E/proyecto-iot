import os
import sys


SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)


from rc.capture import FaceCapture
from rc.encode import FaceEncoder
from rc.recognize import FaceRecognizer

def main():
    print("=== 🧠 Sistema de Reconocimiento Facial ===")

  
    name = input("🔹 Ingresa el nombre del usuario a registrar: ").strip()
    if not name:
        print("❌ No se ingresó un nombre. Abortando.")
        return

    
    print(f"\n📸 Capturando imágenes para: {name}")
    FaceCapture().capture(name=name)

    
    print("\n🔍 Generando encodings...")
    FaceEncoder().generate_encodings()

   
    print("\n🕵️‍♂️ Iniciando reconocimiento facial...")
    FaceRecognizer().recognize_from_cam()

    print("\n✅ Flujo completado con éxito.")

if __name__ == "__main__":
    main()
