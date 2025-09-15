import numpy as np
import os
import json
from pathlib import Path
from resemblyzer import VoiceEncoder, preprocess_wav
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.db.models import User

class SpeakerRecognitionModule:
    def __init__(self):
        self._encoder = VoiceEncoder()
        self._online = True # Asumimos que está en línea por ahora, resemblyzer es local
        self._load_registered_users()

    def _get_db(self):
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def _load_registered_users(self):
        db = next(self._get_db())
        self._registered_users = db.query(User).all()
        print(f"\033[92mINFO\033[0m:     Cargados {len(self._registered_users)} usuarios registrados.")

    def is_online(self) -> bool:
        return self._online

    def register_speaker(self, name: str, audio_path: str) -> bool:
        try:
            wav = preprocess_wav(audio_path)
            embedding = self._encoder.embed_utterance(wav)
            
            db = next(self._get_db())
            existing_user = db.query(User).filter(User.nombre == name).first()
            if existing_user:
                print(f"El usuario {name} ya existe. Actualizando embedding.")
                existing_user.embedding = json.dumps(embedding.tolist())
            else:
                new_user = User(nombre=name, embedding=json.dumps(embedding.tolist()))
                db.add(new_user)
            db.commit()
            self._load_registered_users() # Recargar usuarios después del registro
            return True
        except Exception as e:
            print(f"Error al registrar hablante: {e}")
            return False

    def identify_speaker(self, audio_path: str) -> str:
        if not self.is_online():
            return "El módulo de reconocimiento de hablante está fuera de línea."
        
        if not self._registered_users:
            return "No se encontraron usuarios registrados."

        try:
            wav = preprocess_wav(audio_path)
            new_embedding = self._encoder.embed_utterance(wav)

            min_dist = float('inf')
            identified_speaker = "Desconocido"

            for user in self._registered_users:
                registered_embedding = np.array(json.loads(user.embedding))
                # Similitud coseno para comparación
                similarity = np.dot(new_embedding, registered_embedding) / \
                             (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
                
                # Convertir similitud a distancia (menor distancia es mejor)
                distance = 1 - similarity

                if distance < min_dist:
                    min_dist = distance
                    identified_speaker = user.nombre
            
            # Es posible que desee establecer un umbral para la identificación
            if min_dist < 0.5: # Umbral de ejemplo, ajustar según sea necesario
                return identified_speaker
            else:
                return "Hablante Desconocido"

        except Exception as e:
            print(f"Error al identificar hablante: {e}")
            return "Error durante la identificación del hablante."