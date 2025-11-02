import torch
from TTS.api import TTS
import os
import logging
from concurrent.futures import ThreadPoolExecutor
import asyncio
from pathlib import Path
import uuid
from src.ai.tts.text_splitter import _split_text_into_sentences

BUFFER_SIZE = 2
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
SPEAKER = "Sofia Hellen"

logger = logging.getLogger("TTSModule")

AUDIO_OUTPUT_DIR = Path("src/ai/tts/generated_audio")
AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

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
        self._executor = ThreadPoolExecutor(max_workers=2)
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

    def _generate_speech_sync(self, text: str, file_path: str) -> str | None:
        """
        Lógica síncrona para generar un archivo de audio a partir de un texto dado.

        Args:
            text (str): El texto a convertir en voz.
            file_path (str): La ruta donde se guardará el archivo de audio generado.

        Returns:
            str | None: La ruta del archivo si la generación de voz fue exitosa, None en caso contrario.
        """
        try:
            self.tts.tts_to_file(
                text=text,
                speaker=self.speaker,
                file_path=file_path,
                language="es",
            )
            return file_path
        except Exception as e:
            logger.error(f"Error al generar voz: {e}")
            return None

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
            future = self._executor.submit(lambda: None)
            return future
        
        return self._executor.submit(self._generate_speech_sync, text, file_path)

    async def generate_audio_files_from_text(self, text: str) -> list[Path]:
        """
        Genera múltiples archivos de audio a partir de un texto largo, dividiéndolo en frases.
        La generación es secuencial para garantizar el orden correcto y la calidad.

        Args:
            text (str): El texto completo a convertir en voz.

        Returns:
            list[Path]: Una lista de rutas a los archivos de audio generados.
        """
        if not self.is_online():
            logger.warning("El módulo TTS está fuera de línea. No se pueden generar archivos de audio.")
            return []

        os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
        sentences = _split_text_into_sentences(text)
        
        generated_file_paths = []
        for i, sentence in enumerate(sentences):
            if not sentence:
                logger.warning(f"Frase {i+1} vacía, saltando...")
                continue
            
            try:
                current_tts_audio_output_path = AUDIO_OUTPUT_DIR / f"tts_audio_{uuid.uuid4()}_{i}.wav"
                logger.info(f"Generando audio {i+1}/{len(sentences)}: '{sentence[:50]}...'")
                
                # Generar audio de forma secuencial
                future = self.generate_speech(sentence, str(current_tts_audio_output_path))
                result = await asyncio.to_thread(future.result)
                
                if result and os.path.exists(result):
                    generated_file_paths.append(Path(result))
                    logger.info(f"Audio {i+1} generado exitosamente: {result}")
                else:
                    logger.error(f"Error: Audio {i+1} no generado correctamente")
                    
                # Pequeña pausa entre generaciones para estabilidad
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error al generar audio {i+1}: {str(e)}")
                # Continuar con la siguiente frase en caso de error
                continue
        
        if not generated_file_paths:
            logger.warning("No se generó ningún archivo de audio")
            return []
            
        logger.info(f"Generados {len(generated_file_paths)}/{len(sentences)} archivos de audio")
        return generated_file_paths

    async def generate_audio_stream(self, text: str):
        """
        Genera archivos de audio a partir de un texto largo, dividiéndolo en frases,
        y devuelve cada archivo de audio tan pronto como está disponible (streaming).

        Args:
            text (str): El texto completo a convertir en voz.

        Yields:
            Path: La ruta a un archivo de audio generado.
        """
        if not self.is_online():
            logger.warning("El módulo TTS está fuera de línea. No se puede generar voz en streaming.")
            return

        os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
        sentences = _split_text_into_sentences(text)

        for i, sentence in enumerate(sentences):
            if not sentence:
                logger.warning(f"Frase {i+1} vacía, saltando...")
                continue

            try:
                current_tts_audio_output_path = AUDIO_OUTPUT_DIR / f"tts_stream_audio_{uuid.uuid4()}_{i}.wav"
                logger.info(f"GENERATED: Generando audio {i+1}/{len(sentences)}: '{sentence[:50]}...' en {current_tts_audio_output_path}")

                future = self.generate_speech(sentence, str(current_tts_audio_output_path))
                result = await asyncio.to_thread(future.result)

                if result and os.path.exists(result):
                    yield Path(result)
                    logger.info(f"GENERATED: Audio {i+1} generado y enviado: {result}")
                else:
                    logger.error(f"Error: Audio {i+1} no generado correctamente para la frase: '{sentence[:50]}...'")

            except Exception as e:
                logger.error(f"Error al generar audio {i+1} para la frase '{sentence[:50]}...': {str(e)}")
                # Continuar con la siguiente frase en caso de error
                continue
