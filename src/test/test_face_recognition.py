import asyncio
import cv2
from src.rc.recognize import FaceRecognizer


async def main():
    print("===  Prueba de Reconocimiento Facial ===\n")
    print("Cargando encodings conocidos...\n")

    recognizer = FaceRecognizer()
    await recognizer.load_known_faces()

    if not recognizer.known_face_encodings:
        print(" No hay rostros registrados en la base de datos.")
        return

    print(" Encodings cargados correctamente.")
    print("Iniciando cámara...\n")
    print("Presiona 'q' para salir.\n")

    cap = cv2.VideoCapture(1)

    if not cap.isOpened():
        print(" No se pudo acceder a la cámara.")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Reconocer en este frame
        recognized = await recognizer.recognize_frame(frame)

        # Dibujar los nombres en el frame
        for name, (top, right, bottom, left) in recognized:
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.putText(frame, name, (left, top - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.imshow("Reconocimiento Facial (solo prueba)", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("\n Prueba finalizada.")


if __name__ == "__main__":
    asyncio.run(main())
