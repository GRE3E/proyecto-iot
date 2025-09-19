from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.api.hotword_schemas import HotwordAudioProcessResponse
import logging
from pathlib import Path
import tempfile
from src.db.models import User # Importar el modelo User

# Importar módulos globales desde utils
from src.api import utils

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

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
        logging.error("El módulo STT está fuera de línea")
        raise HTTPException(status_code=503, detail="El módulo STT está fuera de línea")
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        logging.error("El módulo de hablante está fuera de línea")
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    if utils._nlp_module is None or not utils._nlp_module.is_online():
        logging.error("El módulo NLP está fuera de línea")
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
            logging.info(f"Archivo de audio temporal guardado en: {file_location}")

            # 1. Transcripción de voz a texto
            transcribed_text = utils._stt_module.transcribe_audio(str(file_location))
            if transcribed_text is None:
                logging.error("No se pudo transcribir el audio después de la hotword")
                raise HTTPException(status_code=500, detail="No se pudo transcribir el audio después de la hotword")
            logging.info(f"Texto transcribido: {transcribed_text}")

            # 2. Identificación de hablante
            identified_user_from_speaker = utils._speaker_module.identify_speaker(str(file_location))
            identified_speaker_name = "Unknown"
            # Buscar el objeto User en la base de datos
            identified_user_obj = None
            user_name_for_nlp = None
            is_owner_for_nlp = False

            if identified_user_from_speaker:
                identified_speaker_name = identified_user_from_speaker.nombre
                identified_user_obj = identified_user_from_speaker
                user_name_for_nlp = identified_user_obj.nombre
                is_owner_for_nlp = identified_user_obj.is_owner
            else:
                # Si no se identifica al hablante, intentamos buscar por nombre si es necesario (aunque identify_speaker ya debería devolver el objeto)
                # Esto es un fallback, pero la lógica principal debería ser usar identified_user_from_speaker
                identified_user_obj = db.query(User).filter(User.nombre == identified_speaker_name).first()
                if identified_user_obj:
                    user_name_for_nlp = identified_user_obj.nombre
                    is_owner_for_nlp = identified_user_obj.is_owner


            # 3. Procesamiento NLP
            nlp_response = await utils._nlp_module.generate_response(transcribed_text, user_name=user_name_for_nlp, is_owner=is_owner_for_nlp)
            if nlp_response is None:
                logging.error("No se pudo generar la respuesta NLP después de la hotword")
                raise HTTPException(status_code=500, detail="No se pudo generar la respuesta NLP después de la hotword")
            logging.info(f"Respuesta NLP: {nlp_response}")

        response_data = HotwordAudioProcessResponse(
            transcribed_text=transcribed_text,
            identified_speaker=identified_speaker_name,
            nlp_response=nlp_response
        )
        utils._save_api_log("/hotword/process_audio", {"filename": audio_file.filename}, response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error en procesamiento de hotword: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el audio después de hotword")