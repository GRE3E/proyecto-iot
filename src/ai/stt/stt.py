import whisper
import os
import numpy as np
import soundfile as sf
import subprocess
import resampy
import torch
import warnings
import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

warnings.filterwarnings("ignore", message=".*flash attention.*")

# Configuración básica de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class STTModule:
    """
    Módulo para la transcripción de voz a texto (STT) utilizando el modelo Whisper.

    Permite cargar un modelo Whisper, verificar la disponibilidad de FFmpeg y transcribir
    archivos de audio a texto de forma concurrente.
    """
    def __init__(self, model_name: str = "small"):
        """
        Inicializa el módulo STT.

        Args:
            model_name (str): Nombre del modelo Whisper a cargar (ej. "tiny", "base", "small", "medium").
        """
        self._model = None
        self._online: bool = False
        self.model_name: str = model_name
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        self._executor = ThreadPoolExecutor(max_workers=2)  # Initialize ThreadPoolExecutor
        self._load_model()

    def _check_ffmpeg(self) -> bool:
        """
        Verifica si FFmpeg está instalado y accesible en la variable de entorno PATH.
        Whisper utiliza FFmpeg internamente para procesar archivos de audio.

        Returns:
            bool: True si FFmpeg está disponible, False en caso contrario.
        """
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logging.error("FFmpeg no está instalado o no se encuentra en el PATH. Por favor, instala FFmpeg para habilitar la transcripción de audio.")
            return False

    def _load_model(self) -> None:
        """
        Carga el modelo Whisper especificado.
        Si FFmpeg no está disponible, el módulo se marca como fuera de línea.
        """
        if not self._check_ffmpeg():
            self._online = False
            return

        try:
            # Cargar el modelo Whisper en español
            self._model = whisper.load_model(self.model_name)
            self._online = True
            logging.info("Modelo Whisper cargado exitosamente.")
        except Exception as e:
            logging.error(f"Error al cargar el modelo Whisper: {e}")
            self._online = False

    def is_online(self) -> bool:
        """
        Verifica si el módulo STT está en línea y listo para transcribir.

        Returns:
            bool: True si el módulo está en línea, False en caso contrario.
        """
        return self._online

    def shutdown(self) -> None:
        """
        Cierra el ThreadPoolExecutor.
        """
        if self._executor:
            self._executor.shutdown(wait=True)
            logging.info("ThreadPoolExecutor del módulo STT cerrado.")

    def _transcribe_audio_sync(self, audio_path: str) -> Optional[str]:
        """
        Lógica síncrona para transcribir un archivo de audio a texto.

        Args:
            audio_path (str): La ruta al archivo de audio a transcribir.

        Returns:
            Optional[str]: El texto transcrito si la operación fue exitosa, None en caso de error.
        """
        try:
            # Cargar el audio usando soundfile y resamplear si es necesario
            audio, sr = sf.read(audio_path)
            if sr != whisper.audio.SAMPLE_RATE:
                logging.warning(f"La frecuencia de muestreo del audio es {sr} Hz, se esperaba {whisper.audio.SAMPLE_RATE} Hz. Remuestreando audio.")
                audio = resampy.resample(audio, sr, whisper.audio.SAMPLE_RATE)
                sr = whisper.audio.SAMPLE_RATE # Actualizar la frecuencia de muestreo después del remuestreo
            if audio.ndim > 1:
                audio = audio.mean(axis=1) # Convertir a mono
            audio = audio.astype(np.float32) # Convertir a float32 para compatibilidad con Whisper
            audio = whisper.pad_or_trim(audio)
            
            mel = whisper.log_mel_spectrogram(audio).to(self.device)
            
            options = whisper.DecodingOptions(language="es", fp16=self.device == "cuda")
            result = whisper.decode(self._model, mel, options)
            
            return result.text
        except Exception as e:
            logging.error(f"Error durante la transcripción del audio '{audio_path}': {e}")
            return None

    def transcribe_audio(self, audio_path: str):
        """
        Transcribe un archivo de audio a texto de manera asíncrona.

        Args:
            audio_path (str): La ruta al archivo de audio a transcribir.

        Returns:
            concurrent.futures.Future: Un objeto Future que representa el resultado de la operación.
        """
        if not self.is_online():
            logging.warning("El módulo STT está fuera de línea. No se puede transcribir el audio.")
            # Devolver un Future que ya está 'done' con un resultado None
            future = self._executor.submit(lambda: None)
            future.set_result(None)
            return future
        
        return self._executor.submit(self._transcribe_audio_sync, audio_path)