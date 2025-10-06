import torch
from TTS.api import TTS
import os
import logging
from concurrent.futures import ThreadPoolExecutor
import asyncio
from pathlib import Path
import uuid
import re

BUFFER_SIZE = 2 # Generate at least 2 audio files before starting playback

from src.api.tts_routes import AUDIO_OUTPUT_DIR, play_audio
from src.ai.tts.text_splitter import _split_text_into_sentences

# Configuración básica de logging
logger = logging.getLogger("TTSModule")

MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
SPEAKER = "Sofia Hellen"

class TTSModule:
    """
    Módulo para la síntesis de voz a texto (TTS) utilizando el modelo XTTSv2.

    Permite cargar un modelo TTS, verificar su estado en línea y generar archivos de audio
    a partir de texto de forma concurrente.
    """
    def __init__(self, model_name: str = "tts_models/multilingual/multi-dataset/xtts_v2", speaker: str = "Sofia Hellen"):
        """
        Inicializa el módulo TTS.

        Args:
            model_name (str): Nombre del modelo TTS a cargar.
            speaker (str): Nombre del hablante a utilizar para la síntesis de voz.
        """
        self.tts = None
        self.is_online_status: bool = False
        self.model_name: str = model_name
        self.speaker: str = speaker
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        self._executor = ThreadPoolExecutor(max_workers=2) # Inicializar ThreadPoolExecutor
        self._load_model()

    def _load_model(self) -> None:
        """
        Carga el modelo TTS especificado.
        """
        try:
            logger.info(f"Cargando modelo TTS: {self.model_name} en {self.device}")
            self.tts = TTS(model_name=self.model_name, gpu=self.device == "cuda")
            self.is_online_status = True
            logger.info("Modelo TTS cargado exitosamente.")
        except Exception as e:
            logger.error(f"Type of error: {type(e)}")
            logger.error(f"Error loading TTS model: {e}")
            self.is_online_status = False

    def is_online(self) -> bool:
        """
        Verifica si el módulo TTS está en línea y listo para generar voz.

        Returns:
            bool: True si el módulo está en línea, False en caso contrario.
        """
        return self.is_online_status

    def shutdown(self) -> None:
        """
        Cierra el ThreadPoolExecutor.
        """
        if self._executor:
            self._executor.shutdown(wait=True)
            logger.info("ThreadPoolExecutor del módulo TTS cerrado.")

    def _generate_speech_sync(self, text: str, file_path: str) -> bool:
        """
        Lógica síncrona para generar un archivo de audio a partir de un texto dado.

        Args:
            text (str): El texto a convertir en voz.
            file_path (str): La ruta donde se guardará el archivo de audio generado.

        Returns:
            bool: True si la generación de voz fue exitosa, False en caso contrario.
        """
        try:
            self.tts.tts_to_file(
                text=text,
                speaker=self.speaker,
                file_path=file_path,
                language="es",
            )
            return True
        except Exception as e:
            logger.error(f"Error al generar voz: {e}")
            return False

    def generate_speech(self, text: str, file_path: str):
        """
        Genera un archivo de audio a partir de un texto dado de manera asíncrona.

        Args:
            text (str): El texto a convertir en voz.
            file_path (str): La ruta donde se guardará el archivo de audio generado.

        Returns:
            concurrent.futures.Future: Un objeto Future que representa el resultado de la operación.
        """
        if not self.is_online():
            logger.warning("El módulo TTS está fuera de línea. No se puede generar voz.")
            future = self._executor.submit(lambda: False)
            future.set_result(False)
            return future
        
        return self._executor.submit(self._generate_speech_sync, text, file_path)



async def handle_tts_generation_and_playback(
    tts_module_instance: 'TTSModule',
    nlp_response_text: str,
    tts_audio_output_path: Path
):
    """
    Maneja la generación y reproducción de audio TTS en segundo plano,
    implementando un sistema de streaming para mayor velocidad.
    """
    if not tts_module_instance.is_online():
        logger.warning("El módulo TTS está fuera de línea. No se generará audio.")
        return

    try:
        os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
        sentences = _split_text_into_sentences(nlp_response_text)
        
        # Cola para almacenar las rutas de los archivos de audio generados
        audio_queue = asyncio.Queue()
        
        async def generate_audio_task():
            """Tarea para generar audio para cada frase y ponerlo en la cola."""
            for i, sentence in enumerate(sentences):
                if not sentence:
                    continue
                
                current_tts_audio_output_path = AUDIO_OUTPUT_DIR / f"tts_audio_{uuid.uuid4()}_{i}.wav"
                
                tts_future = tts_module_instance.generate_speech(
                    sentence, str(current_tts_audio_output_path)
                )
                audio_generated = await asyncio.to_thread(tts_future.result)
                
                if audio_generated:
                    logger.info(f"Audio TTS generado para frase: {current_tts_audio_output_path}. Cola actual: {audio_queue.qsize()}")
                    await audio_queue.put(current_tts_audio_output_path)
                else:
                    logger.error(f"No se pudo generar el audio TTS para la frase: {sentence}")
            await audio_queue.put(None) # Señal para indicar que no hay más audios
            logger.info("Tarea de generación de audio finalizada.")
            
        async def playback_audio_task():
            """Tarea para reproducir audio de la cola y limpiar archivos."""
            logger.info("Tarea de reproducción de audio iniciada.")
            while True:
                audio_path = await audio_queue.get()
                if audio_path is None: # Señal de fin
                    logger.info("Señal de fin de reproducción recibida. Finalizando tarea de reproducción.")
                    break
                
                logger.info(f"Reproduciendo audio: {audio_path}. Cola actual: {audio_queue.qsize()}")
                await asyncio.to_thread(play_audio, str(audio_path))
                os.remove(audio_path)
                logger.info(f"Audio temporal {audio_path} eliminado.")
                
        # Start generation task
        generation_task = asyncio.create_task(generate_audio_task())
        logger.info("Tarea de generación de audio iniciada.")

        # Wait until a buffer is filled or generation is complete
        logger.info(f"Esperando a llenar el búfer ({BUFFER_SIZE} audios). Cola actual: {audio_queue.qsize()}")
        while audio_queue.qsize() < BUFFER_SIZE and not generation_task.done():
            await asyncio.sleep(0.1) # Small delay to allow generation to proceed
        
        if audio_queue.qsize() >= BUFFER_SIZE:
            logger.info(f"Búfer lleno ({audio_queue.qsize()} audios). Iniciando reproducción.")
        elif generation_task.done():
            logger.info("Generación de audio finalizada antes de llenar el búfer. Iniciando reproducción.")

        # Now start playback task concurrently with the ongoing generation task
        await asyncio.gather(generation_task, playback_audio_task())

    except Exception as tts_e:
        logger.error(f"Error al generar o reproducir audio TTS: {tts_e}", exc_info=True)