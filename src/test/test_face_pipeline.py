import os
import sys

# 🔹 Aseguramos que el path incluya src
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

# 🔹 Importar las clases corregidas
from rc.capture import FaceCapture
from rc.encode import FaceEncoder
from rc.recognize import FaceRecognizer

def main():
    print("=== 🧠 Sistema de Reconocimiento Facial ===")

    # 🔹 Solicitar nombre del usuario antes de capturar
    name = input("🔹 Ingresa el nombre del usuario a registrar: ").strip()
    if not name:
        print("❌ No se ingresó un nombre. Abortando.")
        return

    # 1️⃣ Captura de rostros
    print(f"\n📸 Capturando imágenes para: {name}")
    FaceCapture().capture(name=name)

    # 2️⃣ Generación de encodings
    print("\n🔍 Generando encodings...")
    FaceEncoder().generate_encodings()

    # 3️⃣ Reconocimiento facial
    print("\n🕵️‍♂️ Iniciando reconocimiento facial...")
    FaceRecognizer().recognize()

    print("\n✅ Flujo completado con éxito.")

if __name__ == "__main__":
    main()
