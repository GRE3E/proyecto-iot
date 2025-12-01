import os
import cv2
import time
from src.cameras.camera_manager import CameraManager

# Asegúrate de que las variables de entorno estén cargadas si es necesario
# Por ejemplo, si usas python-dotenv, podrías hacer:
# from dotenv import load_dotenv
# load_dotenv()

def test_camera():
    print("Iniciando prueba de cámara...")
    manager = CameraManager()

    camera_id = "living"
    print(f"Intentando iniciar la cámara '{camera_id}'...")
    if not manager.start(camera_id, recognition_enabled=True):
        print(f"ERROR: No se pudo iniciar la cámara '{camera_id}'. Verifica la fuente en .env y si la cámara está disponible.")
        return

    print(f"Cámara '{camera_id}' iniciada. Presiona 'q' para salir de la ventana de video.")

    try:
        while True:
            state = manager._cameras.get(camera_id)
            if not state or not state.capture or not state.capture.isOpened():
                print(f"ERROR: La cámara '{camera_id}' no está activa o no se pudo abrir.")
                break

            ret, frame = state.capture.read()
            if not ret:
                print(f"ERROR: No se pudo leer un fotograma de la cámara '{camera_id}'.")
                time.sleep(0.1) # Esperar un poco antes de reintentar
                continue

            cv2.imshow(f"Cámara {camera_id}", frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    except KeyboardInterrupt:
        print("Prueba de cámara interrumpida por el usuario.")
    finally:
        print(f"Deteniendo la cámara '{camera_id}'...")
        manager.stop(camera_id)
        cv2.destroyAllWindows()
        print("Prueba de cámara finalizada.")

if __name__ == "__main__":
    test_camera()
