from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.database import get_db
from src.api.stt_schemas import STTResponse
import logging
from pathlib import Path
import tempfile
from src.api import utils

logger = logging.getLogger("APIRoutes")

stt_router = APIRouter()

@stt_router.post("/stt/transcribe", response_model=STTResponse)
async def transcribe_audio(audio_file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Convierte voz a texto usando el módulo STT."""
    if utils._stt_module is None or not utils._stt_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo STT está fuera de línea")
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            transcribed_text = utils._stt_module.transcribe_audio(str(file_location)).result()

        if transcribed_text is None:
            raise HTTPException(status_code=500, detail="No se pudo transcribir el audio")
        
        response_obj = STTResponse(text=transcribed_text)
        utils._save_api_log("/stt/transcribe", {"filename": audio_file.filename}, response_obj.dict(), db)
        return response_obj
        
    except Exception as e:
        logger.error(f"Error en transcripción STT para /stt/transcribe: {e}")
        raise HTTPException(status_code=500, detail="Error al transcribir el audio")
        