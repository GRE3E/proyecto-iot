from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.database import get_db
from src.api.tts_schemas import TTSTextRequest, TTSAudioResponse
import logging
from pathlib import Path
from src.api import utils
from src.auth.device_auth import get_device_api_key

logger = logging.getLogger("APIRoutes")

tts_router = APIRouter()

AUDIO_OUTPUT_DIR = Path("src/ai/tts/generated_audio")
AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

@tts_router.post("/tts/generate_audio", response_model=TTSAudioResponse)
async def generate_audio(request: TTSTextRequest, db: AsyncSession = Depends(get_db), device_api_key: str = Depends(get_device_api_key)):
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
        audio_file_paths = await utils._tts_module.generate_audio_files_from_text(request.text)

        if not audio_file_paths:
            raise HTTPException(status_code=500, detail="No se pudo generar el audio")
        
        response_obj = TTSAudioResponse(audio_file_paths=[str(p) for p in audio_file_paths])
        logger.info(f"Audio TTS generado exitosamente para /tts/generate_audio: {audio_file_paths}")
        async with get_db() as db:
            await utils._save_api_log("/tts/generate_audio", request.dict(), response_obj.dict(), db)
        return response_obj
        
    except Exception as e:
        logger.error(f"Error en generación de audio TTS para /tts/generate_audio: {e}")
        raise HTTPException(status_code=500, detail="Error al generar el audio")
