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
        self._online = True # Assume online for now, resemblyzer is local
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
        print(f"Loaded {len(self._registered_users)} registered users.")

    def is_online(self) -> bool:
        return self._online

    def register_speaker(self, name: str, audio_path: str) -> bool:
        try:
            wav = preprocess_wav(audio_path)
            embedding = self._encoder.embed_utterance(wav)
            
            db = next(self._get_db())
            existing_user = db.query(User).filter(User.nombre == name).first()
            if existing_user:
                print(f"User {name} already exists. Updating embedding.")
                existing_user.embedding = json.dumps(embedding.tolist())
            else:
                new_user = User(nombre=name, embedding=json.dumps(embedding.tolist()))
                db.add(new_user)
            db.commit()
            self._load_registered_users() # Reload users after registration
            return True
        except Exception as e:
            print(f"Error registering speaker: {e}")
            return False

    def identify_speaker(self, audio_path: str) -> str:
        if not self.is_online():
            return "Speaker recognition module is offline."
        
        if not self._registered_users:
            return "No registered users found."

        try:
            wav = preprocess_wav(audio_path)
            new_embedding = self._encoder.embed_utterance(wav)

            min_dist = float('inf')
            identified_speaker = "Unknown"

            for user in self._registered_users:
                registered_embedding = np.array(json.loads(user.embedding))
                # Cosine similarity for comparison
                similarity = np.dot(new_embedding, registered_embedding) / \
                             (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
                
                # Convert similarity to distance (lower distance is better)
                distance = 1 - similarity

                if distance < min_dist:
                    min_dist = distance
                    identified_speaker = user.nombre
            
            # You might want to set a threshold for identification
            if min_dist < 0.5: # Example threshold, adjust as needed
                return identified_speaker
            else:
                return "Unknown Speaker"

        except Exception as e:
            print(f"Error identifying speaker: {e}")
            return "Error during speaker identification."