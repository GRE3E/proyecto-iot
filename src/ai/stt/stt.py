import whisper
import os
import numpy as np
import soundfile as sf
import subprocess
import resampy

class STTModule:
    def __init__(self):
        self._model = None
        self._online = False
        self._load_model()

    def _check_ffmpeg(self):
        """
        Verifica si FFmpeg está instalado y accesible en la variable de entorno PATH.
        Whisper utiliza FFmpeg internamente para procesar archivos de audio.
        """
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def _load_model(self):
        if not self._check_ffmpeg():
            print("Error: FFmpeg is not installed or not in PATH. Please install FFmpeg to enable audio transcription.")
            self._online = False
            return

        try:
            # Cargar el modelo Whisper en español
            self._model = whisper.load_model("medium") #tiny", "base", "small", "medium"
            self._online = True
            print("Whisper model loaded successfully.")
        except Exception as e:
            print(f"Error loading Whisper model: {e}")
            self._online = False

    def is_online(self) -> bool:
        return self._online

    def transcribe_audio(self, audio_path: str) -> str:
        if not self.is_online():
            return "STT module is offline."
        
        try:
            # Cargar el audio usando soundfile y resamplear si es necesario
            audio, sr = sf.read(audio_path)
            if sr != whisper.audio.SAMPLE_RATE:
                print(f"Warning: Audio sample rate is {sr} Hz, expected {whisper.audio.SAMPLE_RATE} Hz. Resampling audio.")
                audio = resampy.resample(audio, sr, whisper.audio.SAMPLE_RATE)
                sr = whisper.audio.SAMPLE_RATE # Update sample rate after resampling
            if audio.ndim > 1:
                audio = audio.mean(axis=1) # Convertir a mono
            audio = audio.astype(np.float32) # Convertir a float32 para compatibilidad con Whisper
            audio = whisper.pad_or_trim(audio)
            
            mel = whisper.log_mel_spectrogram(audio).to(self._model.device)
            
            options = whisper.DecodingOptions(language="es", fp16=True) # fp16=False para CPU
            result = whisper.decode(self._model, mel, options)
            
            return result.text
        except Exception as e:
            print(f"Error during transcription: {e}")
            return "Error during transcription."