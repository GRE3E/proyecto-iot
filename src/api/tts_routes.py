from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.database import get_db
from src.api.tts_schemas import TTSTextRequest, TTSAudioResponse
import logging
from pathlib import Path
import uuid
import pyaudio
import wave
from src.api import utils

logger = logging.getLogger("APIRoutes")
tts_router = APIRouter()

AUDIO_OUTPUT_DIR = Path("src/ai/tts/generated_audio")
AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def play_audio(file_path: str):
    """
    Reproduce un archivo de audio WAV.
    """
    try:
        wf = wave.open(file_path, 'rb')
        p = pyaudio.PyAudio()
        stream = p.open(format=p.get_format_from_width(wf.getsampwidth()),
                        channels=wf.getnchannels(),
                        rate=wf.getframerate(),
                        output=True)
        data = wf.readframes(1024)
        while data:
            stream.write(data)
            data = wf.readframes(1024)
        stream.stop_stream()
        stream.close()
        p.terminate()
        logger.info(f"Audio reproducido exitosamente: {file_path}")
    except Exception as e:
        logger.error(f"Error al reproducir audio {file_path} en /tts/generate_audio: {e}")

@tts_router.post("/tts/generate_audio", response_model=TTSAudioResponse)
async def generate_audio(request: TTSTextRequest, db: AsyncSession = Depends(get_db)):
    """Genera un archivo de audio a partir de texto usando el módulo TTS.

    Args:
        request (TTSTextRequest): Objeto de solicitud que contiene el texto a convertir.
        db (Session, optional): Sesión de la base de datos. Defaults to Depends(get_db).

    Returns:
        TTSAudioResponse: Objeto de respuesta que contiene la ruta al archivo de audio generado.

    Raises:
        HTTPException: Si el módulo TTS está fuera de línea o si ocurre un error durante la generación de audio.
    """
    if utils._tts_module is None or not utils._tts_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo TTS está fuera de línea")
    
    try:
        audio_filename = f"tts_audio_{uuid.uuid4()}.wav"
        file_location = AUDIO_OUTPUT_DIR / audio_filename
        
        future_audio_generated = utils._tts_module.generate_speech(request.text, str(file_location))
        audio_generated = future_audio_generated.result()

        if not audio_generated:
            raise HTTPException(status_code=500, detail="No se pudo generar el audio")
        
        response_obj = TTSAudioResponse(audio_file_path=str(file_location))
        logger.info(f"Audio TTS generado exitosamente para /tts/generate_audio: {file_location}")
        utils._save_api_log("/tts/generate_audio", request.dict(), response_obj.dict(), db)
        return response_obj
        
    except Exception as e:
        logger.error(f"Error en generación de audio TTS para /tts/generate_audio: {e}")
        raise HTTPException(status_code=500, detail="Error al generar el audio")
        