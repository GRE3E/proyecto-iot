import numpy as np
import os
import json
from pathlib import Path
from resemblyzer import VoiceEncoder, preprocess_wav
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.db.models import User
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
        logging.info(f"Cargados {len(self._registered_users)} usuarios registrados.")

    def is_online(self) -> bool:
        return self._online

    def register_speaker(self, name: str, audio_path: str, is_owner: bool = False) -> bool:
        try:
            wav = preprocess_wav(audio_path)
            embedding = self._encoder.embed_utterance(wav)
            
            db = next(self._get_db())
            existing_user = db.query(User).filter(User.nombre == name).first()
            if existing_user:
                logging.info(f"El usuario {name} ya existe. Actualizando embedding.")
                existing_user.embedding = json.dumps(embedding.tolist())
                existing_user.is_owner = is_owner # Actualizar también el estado de propietario
            else:
                new_user = User(nombre=name, embedding=json.dumps(embedding.tolist()), is_owner=is_owner)
                db.add(new_user)
            db.commit()
            self._load_registered_users() # Recargar usuarios después del registro
            return True
        except Exception as e:
            logging.error(f"Error al registrar hablante: {e}")
            return False

    def identify_speaker(self, audio_path: str) -> User | None:
        if not self.is_online():
            logging.warning("El módulo de reconocimiento de hablante está fuera de línea.")
            return None
        
        if not self._registered_users:
            logging.info("No se encontraron usuarios registrados.")
            # If no registered users, we still want to generate an embedding for potential registration
            try:
                wav = preprocess_wav(audio_path)
                new_embedding = self._encoder.embed_utterance(wav)
                return None, new_embedding # Return embedding even if no users to compare against
            except Exception as e:
                logging.error(f"Error al generar embedding para hablante no registrado: {e}")
                return None, None # If embedding generation fails, return None, None

        try:
            wav = preprocess_wav(audio_path)
            new_embedding = self._encoder.embed_utterance(wav)

            min_dist = float('inf')
            identified_user = None

            for user in self._registered_users:
                registered_embedding = np.array(json.loads(user.embedding))
                # Similitud coseno para comparación
                similarity = np.dot(new_embedding, registered_embedding) / \
                             (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
                
                # Convertir similitud a distancia (menor distancia es mejor)
                distance = 1 - similarity

                if distance < min_dist:
                    min_dist = distance
                    identified_user = user
            
            # Es posible que desee establecer un umbral para la identificación
            if identified_user and min_dist < 0.5: # Umbral de ejemplo, ajustar según sea necesario
                logging.info(f"Hablante identificado: {identified_user.nombre}")
                return identified_user, new_embedding # Return the identified user and their embedding
            else:
                logging.info("Hablante Desconocido")
                return None, new_embedding # Return the embedding even if no user is identified

        except Exception as e:
            logging.error(f"Error al identificar hablante: {e}")
            return None, None # Return None for both user and embedding on error