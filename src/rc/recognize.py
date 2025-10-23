import cv2
import face_recognition
import pickle
import os

class FaceRecognizer:
    def __init__(self):
        # BASE_DIR = src/rc
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.encodings_path = os.path.join(self.base_dir, "encodings", "encodings.pickle")

        # Si no existe el archivo de encodings, inicializamos vacío para que no rompa el servidor
        if os.path.exists(self.encodings_path):
            with open(self.encodings_path, "rb") as f:
                self.data = pickle.load(f)
        else:
            self.data = {"encodings": [], "names": []}

    def recognize(self):
        print("Iniciando reconocimiento facial...")
        cap = cv2.VideoCapture(0)
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

                print("Rostro detectado:", name)

            cv2.imshow("Acceso", frame)

            if cv2.waitKey(1) & 0xFF == ord('q') or acceso:
                break

        cap.release()
        cv2.destroyAllWindows()

        if acceso:
            print(f"✅ Acceso concedido a: {name}")
        else:
            print("❌ Acceso denegado")

    def recognize_from_file(self, image_path: str) -> str:
        """
        Reconoce un rostro desde un archivo de imagen (sin usar la cámara).
        Devuelve el nombre reconocido o 'Desconocido'.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"No se encontró la imagen: {image_path}")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("No se pudo leer la imagen.")

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
