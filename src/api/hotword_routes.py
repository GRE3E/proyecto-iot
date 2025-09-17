from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.api.hotword_schemas import HotwordAudioProcessResponse
import logging
from pathlib import Path
import tempfile

# Importar módulos globales desde utils
from src.api import utils

hotword_router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@hotword_router.post("/hotword/process_audio", response_model=HotwordAudioProcessResponse)
async def process_hotword_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Procesa el audio después de la detección de hotword: STT, identificación de hablante y NLP."""
    if utils._stt_module is None or not utils._stt_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo STT está fuera de línea")
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    if utils._nlp_module is None or not utils._nlp_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")

    transcribed_text = ""
    identified_speaker = "Unknown"
    nlp_response = ""

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)

            # 1. Transcripción de voz a texto
            transcribed_text = utils._stt_module.transcribe_audio(str(file_location))
            if transcribed_text is None:
                raise HTTPException(status_code=500, detail="No se pudo transcribir el audio después de la hotword")

            # 2. Identificación de hablante
            identified_speaker = utils._speaker_module.identify_speaker(str(file_location))
            if identified_speaker is None:
                identified_speaker = "Unknown"

            # 3. Procesamiento NLP
            nlp_response = await utils._nlp_module.generate_response(transcribed_text)
            if nlp_response is None:
                raise HTTPException(status_code=500, detail="No se pudo generar la respuesta NLP después de la hotword")

        response_data = HotwordAudioProcessResponse(
            transcribed_text=transcribed_text,
            identified_speaker=identified_speaker,
            nlp_response=nlp_response
        )
        utils._save_api_log("/hotword/process_audio", {"filename": audio_file.filename}, response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error en procesamiento de hotword: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el audio después de hotword")