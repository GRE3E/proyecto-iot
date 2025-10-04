import torch
from TTS.api import TTS
import os

MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
SPEAKER = "Sofia Hellen"

class TTSModule:
    def __init__(self, model_name: str = "tts_models/multilingual/multi-dataset/xtts_v2", speaker: str = "Sofia Hellen"):
        self.tts = None
        self.is_online_status = False
        self.model_name = model_name
        self.speaker = speaker
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._load_model()

    def _load_model(self):
        try:
            print(f"Cargando modelo TTS: {self.model_name} en {self.device}")
            self.tts = TTS(model_name=self.model_name, gpu=self.device == "cuda")
            self.is_online_status = True
            print("\033[92mINFO\033[0m:     Modelo TTS cargado exitosamente.")
        except Exception as e:
            print(f"Type of error: {type(e)}")
            print(f"Error loading TTS model: {e}")
            self.is_online_status = False

    def is_online(self) -> bool:
        return self.is_online_status

    def generate_speech(self, text: str, file_path: str) -> bool:
        if not self.is_online():
            print("TTS module is not online. Cannot generate speech.")
            return False
        try:
            self.tts.tts_to_file(
                text=text,
                speaker=self.speaker,
                file_path=file_path,
                language="es",
            )
            return True
        except Exception as e:
            print(f"Error generating speech: {e}")
            return False