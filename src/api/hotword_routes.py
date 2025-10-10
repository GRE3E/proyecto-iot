import os
import logging
import asyncio
import tempfile
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session

from src.db.database import SessionLocal
from src.db.models import User
from src.api.hotword_schemas import HotwordAudioProcessResponse
from src.api import utils
from src.api.tts_routes import AUDIO_OUTPUT_DIR, play_audio
from src.ai.tts.tts_module import handle_tts_generation_and_playback

logger = logging.getLogger("APIRoutes")

hotword_router = APIRouter()

# ====================== Dependencia de BD ======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====================== Endpoint principal ======================
@hotword_router.post("/hotword/process_audio", response_model=HotwordAudioProcessResponse)
async def process_hotword_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Procesa el audio tras la detección de hotword:
    - STT (voz a texto)
    - Identificación de hablante
    - Procesamiento NLP y comando IoT
    - Generación TTS (si está disponible)
    """
    # === Verificar disponibilidad de módulos ===
    if utils._stt_module is None or not utils._stt_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo STT está fuera de línea")
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    if utils._nlp_module is None or not utils._nlp_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")

    transcribed_text = ""
    identified_speaker_name = "Desconocido"
    nlp_response = {}
    file_location = None
    tts_audio_file_path = None

    try:
        # === 1. Guardar el archivo temporalmente ===
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio_file:
            file_location = Path(temp_audio_file.name)
            content = await audio_file.read()
            temp_audio_file.write(content)
        logger.info(f"Archivo de audio temporal guardado en: {file_location}")

        # === 2. Ejecutar STT y Speaker ID en paralelo ===
        stt_task = asyncio.to_thread(
            lambda: utils._stt_module.transcribe_audio(str(file_location)).result()
        )
        speaker_task = asyncio.to_thread(
            lambda: utils._speaker_module.identify_speaker(str(file_location)).result()
        )

        transcribed_text, (identified_user_from_speaker, speaker_embedding) = await asyncio.gather(
            stt_task, speaker_task
        )

        if not transcribed_text:
            raise HTTPException(status_code=500, detail="Error en transcripción STT")

        logger.info(f"Texto transcrito: {transcribed_text}")

        # === 3. Identificación o registro del hablante ===
        if identified_user_from_speaker:
            identified_user_from_speaker = await asyncio.to_thread(
                lambda: db.query(User).filter(User.id == identified_user_from_speaker.id).first()
            )
            if identified_user_from_speaker:
                db.expire(identified_user_from_speaker)
                db.refresh(identified_user_from_speaker)
                identified_speaker_name = identified_user_from_speaker.nombre
                is_owner_for_nlp = identified_user_from_speaker.is_owner
                logger.info(f"Hablante identificado: {identified_speaker_name}")
            else:
                is_owner_for_nlp = False
        else:
            next_unknown_id = await asyncio.to_thread(
                lambda: db.query(User).filter(User.nombre.like("Desconocido %")).count() + 1
            )
            new_unknown_name = f"Desconocido {next_unknown_id}"

            register_future = utils._speaker_module.register_speaker(
                new_unknown_name, str(file_location), is_owner=False
            )
            await asyncio.to_thread(register_future.result)

            identified_user_obj = await asyncio.to_thread(
                lambda: db.query(User).filter(User.nombre == new_unknown_name).first()
            )
            if identified_user_obj:
                identified_speaker_name = new_unknown_name
                is_owner_for_nlp = False
                logger.info(f"Nuevo hablante desconocido registrado: {new_unknown_name}")
            else:
                raise HTTPException(status_code=500, detail="No se pudo registrar hablante desconocido")

        # === 4. Procesamiento NLP ===
        nlp_response = await utils._nlp_module.generate_response(
            transcribed_text,
            user_name=identified_speaker_name,
            is_owner=is_owner_for_nlp
        )

        if nlp_response is None or "response" not in nlp_response:
            raise HTTPException(status_code=500, detail="Error al generar la respuesta NLP")

        logger.info(f"Respuesta NLP: {nlp_response['response']}")

        # === 5. Generación TTS (opcional) ===
        if utils._tts_module and utils._tts_module.is_online():
            tts_audio_output_path = AUDIO_OUTPUT_DIR / f"tts_audio_{uuid.uuid4()}.wav"
            # Ejecutar la generación y reproducción de TTS en segundo plano
            asyncio.create_task(
                handle_tts_generation_and_playback(
                    utils._tts_module, # Pasar la instancia de TTSModule
                    nlp_response['response'], tts_audio_output_path
                )
            )
            # tts_audio_file_path = str(tts_audio_output_path) # Ya no es necesario asignar aquí
        else:
            logger.warning("El módulo TTS está fuera de línea. No se generará audio.")

        # === 6. Preparar respuesta final ===
        response_data = HotwordAudioProcessResponse(
            transcribed_text=transcribed_text,
            identified_speaker=identified_speaker_name,
            nlp_response=nlp_response["response"],


        )

        utils._save_api_log("/hotword/process_audio", {"filename": audio_file.filename}, response_data.dict(), db)
        return response_data

    except Exception as e:
        logger.error(f"Error en procesamiento de hotword: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al procesar el audio después de hotword")

    finally:
        # Limpieza del archivo temporal
        if file_location and file_location.exists():
            try:
                os.remove(file_location)
                logger.info(f"Archivo temporal {file_location} eliminado.")
            except Exception as cleanup_e:
                logger.warning(f"No se pudo eliminar el archivo temporal {file_location}: {cleanup_e}")
