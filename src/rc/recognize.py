import cv2
import face_recognition
import logging
from typing import List, Optional, Dict, Tuple
from sqlalchemy import select
from src.db.database import get_async_db_session
from src.db.models import User
import numpy as np

class FaceRecognizer:
    """
    Clase responsable del reconocimiento facial en tiempo real y desde archivos.
    Implementa métodos avanzados de detección y comparación facial.
    """

    def __init__(self):
        """
        Inicializa el reconocedor facial con configuraciones optimizadas.
        """
        self.known_face_encodings = []
        self.known_face_names = []
        self.logger = logging.getLogger(self.__class__.__name__)
        self.model = "hog"  # Usar 'cnn' si hay GPU disponible
        self.tolerance = 0.6  # Umbral de similitud (menor = más estricto)
        self.min_face_size = 30  # Tamaño mínimo de rostro en píxeles
        self.frame_skip = 2  # Procesar 1 de cada N frames para mejor rendimiento

    async def _load_encodings_from_db(self):
        """
        Carga los encodings faciales desde la base de datos.
        """
        self.known_face_encodings = []
        self.known_face_names = []
        
        async with get_async_db_session() as db:
            users = await db.execute(
                select(User).filter(User.face_encoding.isnot(None))
            )
            users = users.scalars().all()
            
            for user in users:
                try:
                    encoding = np.frombuffer(user.face_encoding, dtype=np.float64)
                    self.known_face_encodings.append(encoding)
                    self.known_face_names.append(user.nombre)
                except Exception as e:
                    self.logger.error(f"Error cargando encoding de {user.nombre}: {e}")
                    
        self.logger.info(f"Encodings cargados: {len(self.known_face_names)}")

    def _process_frame(self, frame: np.ndarray, scale: float = 0.25) -> Tuple[List[str], List[tuple]]:
        """
        Procesa un frame para detectar y reconocer rostros.
        
        Args:
            frame (np.ndarray): Frame a procesar
            scale (float): Factor de escala para redimensionar (menor = más rápido)
            
        Returns:
            Tuple[List[str], List[tuple]]: Nombres y ubicaciones de rostros detectados
        """
        # Redimensionar frame para procesamiento más rápido
        small_frame = cv2.resize(frame, (0, 0), fx=scale, fy=scale)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Detectar rostros
        face_locations = face_recognition.face_locations(
            rgb_small_frame,
            model=self.model,
            number_of_times_to_upsample=1
        )
        
        if not face_locations:
            return [], []
            
        # Obtener encodings
        face_encodings = face_recognition.face_encodings(
            rgb_small_frame,
            face_locations,
            num_jitters=1
        )
        
        face_names = []
        scaled_locations = []
        
        for face_encoding, face_location in zip(face_encodings, face_locations):
            # Comparar con encodings conocidos
            matches = face_recognition.compare_faces(
                self.known_face_encodings,
                face_encoding,
                tolerance=self.tolerance
            )
            name = "Desconocido"
            
            if True in matches:
                # Calcular distancias faciales para mejor precisión
                face_distances = face_recognition.face_distance(
                    self.known_face_encodings,
                    face_encoding
                )
                best_match_index = np.argmin(face_distances)
                
                if matches[best_match_index]:
                    confidence = 1 - face_distances[best_match_index]
                    if confidence >= 0.5:  # Umbral de confianza
                        name = self.known_face_names[best_match_index]
            
            face_names.append(name)
            
            # Escalar ubicaciones de vuelta al tamaño original
            top, right, bottom, left = face_location
            scaled_locations.append((
                int(top / scale),
                int(right / scale),
                int(bottom / scale),
                int(left / scale)
            ))
            
        return face_names, scaled_locations

    def _draw_results(self, frame: np.ndarray, face_locations: List[tuple], face_names: List[str]):
        """
        Dibuja los resultados del reconocimiento en el frame.
        
        Args:
            frame (np.ndarray): Frame a modificar
            face_locations (List[tuple]): Ubicaciones de los rostros
            face_names (List[str]): Nombres reconocidos
        """
        for (top, right, bottom, left), name in zip(face_locations, face_names):
            # Dibujar rectángulo alrededor del rostro
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            
            # Dibujar etiqueta con el nombre
            cv2.rectangle(frame, (left, bottom - 35),
                        (right, bottom), (0, 255, 0), cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6),
                       font, 0.6, (255, 255, 255), 1)

    async def recognize_from_cam(self, cam_id: int = 0) -> Optional[str]:
        """
        Realiza reconocimiento facial en tiempo real desde la cámara.
        
        Args:
            cam_id (int): ID de la cámara a usar
            
        Returns:
            Optional[str]: Nombre de la persona reconocida o None si hay error
        """
        await self._load_encodings_from_db()
        
        video_capture = cv2.VideoCapture(cam_id)
        if not video_capture.isOpened():
            self.logger.error("No se pudo acceder a la cámara")
            return None
            
        frame_count = 0
        recognized_name = None
        
        try:
            while True:
                ret, frame = video_capture.read()
                if not ret:
                    break
                    
                frame_count += 1
                if frame_count % self.frame_skip != 0:
                    continue
                    
                face_names, face_locations = self._process_frame(frame)
                
                if face_names:
                    # Tomar el primer rostro reconocido que no sea "Desconocido"
                    for name in face_names:
                        if name != "Desconocido":
                            recognized_name = name
                            break
                    if recognized_name:
                        break
                
                self._draw_results(frame, face_locations, face_names)
                cv2.imshow('Reconocimiento Facial', frame)
                
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        finally:
            video_capture.release()
            cv2.destroyAllWindows()
            
        return recognized_name or "Desconocido"

    async def recognize_from_file(self, image_path: str) -> List[str]:
        """
        Realiza reconocimiento facial en una imagen.
        
        Args:
            image_path (str): Ruta a la imagen
            
        Returns:
            List[str]: Lista de nombres reconocidos
        """
        await self._load_encodings_from_db()
        
        try:
            frame = cv2.imread(image_path)
            if frame is None:
                raise ValueError("No se pudo cargar la imagen")
                
            face_names, _ = self._process_frame(frame, scale=1.0)
            return face_names if face_names else ["No se detectaron rostros"]
            
        except Exception as e:
            self.logger.error(f"Error en reconocimiento desde archivo: {e}")
            return [f"Error: {str(e)}"]
