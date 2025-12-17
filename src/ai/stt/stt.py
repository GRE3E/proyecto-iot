import whisper
import numpy as np
import soundfile as sf
import subprocess
import resampy
import torch
import warnings
import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
from src.ai.sound_processor.noise_suppressor import suppress_noise
import os

warnings.filterwarnings("ignore", message=".*flash attention.*")

logger = logging.getLogger("STTModule")

class STTModule:
    """
    Módulo para la transcripción de voz a texto (STT) utilizando el modelo Whisper.

    Permite cargar un modelo Whisper, verificar la disponibilidad de FFmpeg y transcribir
    archivos de audio a texto de forma concurrente.
    """
    def __init__(self, model_name: Optional[str] = None):
        """
        Inicializa el módulo STT.

        Args:
            model_name (str): Nombre del modelo Whisper a cargar (ej. "tiny", "base", "small", "medium").
                            Si no se proporciona, se carga desde la configuración.
        """
        # Cargar model_name desde config si no se proporciona
        if model_name is None:
            try:
                from pathlib import Path
                from src.ai.nlp.config.config_manager import ConfigManager
                
                project_root = Path(__file__).parent.parent.parent.parent
                config_path = project_root / "config" / "config.json"
                config_manager = ConfigManager(config_path)
                config = config_manager.get_config()
                model_name = config.get("stt_model", "base")
                logger.info(f"Modelo STT cargado desde configuración: {model_name}")
            except Exception as e:
                logger.warning(f"No se pudo cargar modelo STT desde config: {e}. Usando 'base' por defecto.")
                model_name = "base"
        
        self._model = None
        self._online: bool = False
        self.model_name: str = model_name
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        self._executor = ThreadPoolExecutor(max_workers=2)
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
            logger.error("FFmpeg no está instalado o no se encuentra en el PATH. Por favor, instala FFmpeg para habilitar la transcripción de audio.")
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
            self._model = whisper.load_model(self.model_name)
            self._online = True
            logger.info("Modelo Whisper cargado exitosamente.")
        except Exception as e:
            logger.error(f"Error al cargar el modelo Whisper: {e}")
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
            logger.info("ThreadPoolExecutor del módulo STT cerrado.")

    def _transcribe_audio_sync(self, audio_path: str) -> Optional[str]:
        """
        Lógica síncrona para transcribir un archivo de audio a texto.

        Args:
            audio_path (str): La ruta al archivo de audio a transcribir.

        Returns:
            Optional[str]: El texto transcrito si la operación fue exitosa, None en caso de error.
        """
        try:
            denoised_audio_path = suppress_noise(audio_path)
            if denoised_audio_path is None:
                logger.error(f"No se pudo suprimir el ruido del audio: {audio_path}")
                return None

            audio, sr = sf.read(denoised_audio_path)
            if sr != whisper.audio.SAMPLE_RATE:
                logger.warning(f"La frecuencia de muestreo del audio es {sr} Hz, se esperaba {whisper.audio.SAMPLE_RATE} Hz. Remuestreando audio.")
                audio = resampy.resample(audio, sr, whisper.audio.SAMPLE_RATE)
                sr = whisper.audio.SAMPLE_RATE
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            audio = audio.astype(np.float32)
            audio = whisper.pad_or_trim(audio)
            
            mel = whisper.log_mel_spectrogram(audio).to(self.device)
            
            options = whisper.DecodingOptions(language="es", fp16=self.device == "cuda")
            result = whisper.decode(self._model, mel, options)
            
            return result.text
        except Exception as e:
            logger.error(f"Error durante la transcripción del audio '{audio_path}': {e}")
            return None
        finally:
            if 'denoised_audio_path' in locals() and denoised_audio_path and os.path.exists(denoised_audio_path):
                os.remove(denoised_audio_path)
                logger.debug(f"Archivo temporal eliminado: {denoised_audio_path}")

    def transcribe_audio(self, audio_path: str):
        """
        Transcribe un archivo de audio a texto de manera asíncrona.

        Args:
            audio_path (str): La ruta al archivo de audio a transcribir.

        Returns:
            concurrent.futures.Future: Un objeto Future que representa el resultado de la operación.
        """
        if not self.is_online():
            logger.warning("El módulo STT está fuera de línea. No se puede transcribir el audio.")
            future = self._executor.submit(lambda: None)
            future.set_result(None)
            return future
        
        return self._executor.submit(self._transcribe_audio_sync, audio_path)