import sounddevice as sd
import numpy as np
from datetime import datetime
from src.db.database import SessionLocal
from src.db.models import TTSLog
from TTS.api import TTS


class TTSCore:
    def __init__(self):
        """Inicializa el módulo TTS."""
        # Modelo XTTS-v2
        self._tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False, gpu=False)
        self._sample_rate = 22050  # Tasa de muestreo estándar para Coqui TTS

    def speak(self, text: str, save_log: bool = True) -> None:
        """
        Convierte texto a voz y lo reproduce inmediatamente.

        Args:
            text (str): Texto a convertir en voz.
            save_log (bool, optional): Si se debe guardar un log en la base de datos. Por defecto es True.
        """
        try:
            # Generar audio con Coqui TTS (XTTS-v2 requiere speaker_wav y language)
            wav = self._tts.tts(text=text, speaker_wav="C:/Users/artur/Downloads/test.wav", language="es")
            audio_data = np.array(wav, dtype=np.float32)

            # Reproducir el audio
            sd.play(audio_data, self._sample_rate)
            sd.wait()  # Esperar hasta que termine la reproducción

            # Guardar log si es necesario
            if save_log:
                with SessionLocal() as db:
                    log_entry = TTSLog(
                        timestamp=datetime.now(),
                        text=text
                    )
                    db.add(log_entry)
                    db.commit()
        except Exception as e:
            print(f"Error al reproducir voz: {str(e)}")
