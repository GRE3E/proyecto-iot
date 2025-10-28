import os
import sys
import cv2
import asyncio
import numpy as np

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from rc.capture import FaceCapture
from rc.encode import FaceEncoder
from rc.recognize import FaceRecognizer

async def main():
    print("=== 🧠 Sistema de Reconocimiento Facial ===\n")

    # Pedir nombre del usuario
    name = input(" Ingresa el nombre del usuario a registrar: ").strip()
    if not name:
        print(" No se ingresó un nombre. Abortando.")
        return

    # Capturar fotos automáticamente
    print(f"\n Capturando imágenes para: {name}")
    capture_result = await FaceCapture().capture_user(user_name=name, num_photos=5)
    if not capture_result["success"]:
        print(f" Error en la captura: {capture_result['message']}")
        return
    print(f" {capture_result['message']}")

    # Generar encodings
    print("\n🔍 Generando encodings...")
    encoder = FaceEncoder()
    await encoder.generate_encodings()
    print(" Encodings generados.")

    # Reconocimiento facial desde cámara
    print("\n Iniciando reconocimiento facial...")
    recognizer = FaceRecognizer()
    await recognizer.load_known_faces()

    cap = cv2.VideoCapture(1)  # cámara principal
    if not cap.isOpened():
        print(" No se pudo abrir la cámara")
        return

    print("Presiona 'q' para salir del reconocimiento.\n")
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Reconocer usando el nuevo método
        results = await recognizer.recognize_frame(frame)

        for name, (top, right, bottom, left) in results:
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.putText(frame, name, (left, top - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.imshow("Reconocimiento Facial", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("\n Flujo completado con éxito.")

if __name__ == "__main__":
    asyncio.run(main())
