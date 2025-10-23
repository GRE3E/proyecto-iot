import cv2
import face_recognition
import pickle
import os


class FaceRecognizer:
    """
    Clase encargada de realizar el reconocimiento facial, ya sea desde cámara o desde archivos.
    Usa los encodings generados por FaceEncoder y almacenados en:
    src/rc/encodings/encodings.pickle
    """

    def __init__(self, encodings_path: str = None):
        
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        default_encodings_path = os.path.join(self.base_dir, "encodings", "encodings.pickle")
        self.encodings_path = encodings_path or default_encodings_path

       
        if os.path.exists(self.encodings_path):
            with open(self.encodings_path, "rb") as f:
                self.data = pickle.load(f)
        else:
            self.data = {"encodings": [], "names": []}


    def recognize_from_cam(self, cam_id: int = 0) -> str:
        """
        Reconoce un rostro usando la cámara activa.
        Retorna el nombre reconocido o 'Desconocido'.
        """
        print("[INFO] Iniciando reconocimiento facial desde cámara...")
        cap = cv2.VideoCapture(cam_id)
        acceso = False
        name = "Desconocido"

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            boxes = face_recognition.face_locations(rgb)
            encs = face_recognition.face_encodings(rgb, boxes)

            for enc in encs:
                matches = face_recognition.compare_faces(self.data["encodings"], enc)
                name = "Desconocido"

                if True in matches:
                    matched_idxs = [i for i, m in enumerate(matches) if m]
                    counts = {}
                    for i in matched_idxs:
                        n = self.data["names"][i]
                        counts[n] = counts.get(n, 0) + 1
                    name = max(counts, key=counts.get)
                    acceso = True

                print(f"[INFO] Rostro detectado: {name}")

            cv2.imshow("Reconocimiento facial", frame)

            if cv2.waitKey(1) & 0xFF == ord('q') or acceso:
                break

        cap.release()
        cv2.destroyAllWindows()

        if acceso:
            print(f"✅ Acceso concedido a: {name}")
        else:
            print("❌ Acceso denegado")

        return name

    
    def recognize_from_file(self, image_path: str) -> str:
        """
        Reconoce un rostro desde un archivo de imagen.
        Devuelve el nombre reconocido o 'Desconocido'.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"No se encontró la imagen: {image_path}")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("No se pudo leer la imagen correctamente.")

        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        boxes = face_recognition.face_locations(rgb)
        encs = face_recognition.face_encodings(rgb, boxes)

        if not encs:
            return "Desconocido"

        for enc in encs:
            matches = face_recognition.compare_faces(self.data["encodings"], enc)
            name = "Desconocido"

            if True in matches:
                matched_idxs = [i for i, m in enumerate(matches) if m]
                counts = {}
                for i in matched_idxs:
                    n = self.data["names"][i]
                    counts[n] = counts.get(n, 0) + 1
                name = max(counts, key=counts.get)
                return name

        return "Desconocido"
