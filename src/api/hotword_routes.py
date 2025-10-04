import os
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, FastAPI, Request
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.api.hotword_schemas import HotwordAudioProcessResponse
import logging
from pathlib import Path
import tempfile
from src.db.models import User # Importar el modelo User
import asyncio
import uuid

import httpx
from datetime import datetime

# Importar módulos globales desde utils
from src.api import utils
from src.api.tts_routes import AUDIO_OUTPUT_DIR, play_audio

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
            transcribed_text = utils._stt_module.transcribe_audio(str(file_location)).result()
            if transcribed_text is None:
                logging.error("No se pudo transcribir el audio después de la hotword")
                raise HTTPException(status_code=500, detail="No se pudo transcribir el audio después de la hotword")
            logging.info(f"Texto transcribido: {transcribed_text}")

            # 2. Identificación de hablante
            future_identified_speaker = utils._speaker_module.identify_speaker(str(file_location))
            identified_user_from_speaker, speaker_embedding = future_identified_speaker.result()
            
            if identified_user_from_speaker:
                # Obtener el usuario de la sesión actual para asegurar que sea persistente
                identified_user_from_speaker = db.query(User).filter(User.id == identified_user_from_speaker.id).first()
                if identified_user_from_speaker:
                    db.expire(identified_user_from_speaker) # Expire the object to ensure fresh data is loaded
                    db.refresh(identified_user_from_speaker)
                    identified_speaker_name = identified_user_from_speaker.nombre
                identified_user_obj = identified_user_from_speaker
                user_name_for_nlp = identified_user_obj.nombre
                is_owner_for_nlp = identified_user_obj.is_owner
                logging.info(f"Identified user {user_name_for_nlp} with is_owner: {is_owner_for_nlp}")
            else: # Si no se identificó pero se obtuvo un embedding
                # Registrar al usuario como desconocido
                next_unknown_id = db.query(User).filter(User.nombre.like("Desconocido %")).count() + 1
                new_unknown_name = f"Desconocido {next_unknown_id}"
                
                # Registrar el nuevo usuario con el embedding
                future_register_speaker = utils._speaker_module.register_speaker(new_unknown_name, str(file_location), is_owner=False)
                future_register_speaker.result() # Esperar a que el registro se complete
                
                # Obtener el usuario recién registrado de la base de datos
                identified_user_obj = db.query(User).filter(User.nombre == new_unknown_name).first()
                if identified_user_obj:
                    identified_speaker_name = new_unknown_name
                    user_name_for_nlp = new_unknown_name
                    is_owner_for_nlp = False
                logging.info(f"Nuevo hablante desconocido registrado como: {new_unknown_name}")
            
            # 3. Procesamiento NLP
            nlp_response_data = await utils._nlp_module.generate_response(
                transcribed_text,
                user_name=user_name_for_nlp,
                is_owner=is_owner_for_nlp
            )
            if nlp_response_data is None:
                logging.error("No se pudo generar la respuesta NLP después de la hotword")
                raise HTTPException(status_code=500, detail="No se pudo generar la respuesta NLP después de la hotword")
            logging.info(f"Respuesta NLP: {nlp_response_data['response']}")

            tts_audio_file_path = None
            if utils._tts_module is None or not utils._tts_module.is_online():
                logging.warning("El módulo TTS está fuera de línea. No se generará audio para la respuesta NLP.")
            else:
                try:
                    audio_filename = f"tts_audio_{uuid.uuid4()}.wav"
                    file_location = AUDIO_OUTPUT_DIR / audio_filename
                    future_audio_generated = utils._tts_module.generate_speech(nlp_response_data['response'], str(file_location))
                    audio_generated = future_audio_generated.result()
                    if audio_generated:
                        tts_audio_file_path = str(file_location)
                        logging.info(f"Audio de respuesta NLP generado en: {tts_audio_file_path}")
                        # Reproducir el audio automáticamente
                        play_audio(tts_audio_file_path)
                        # Eliminar el archivo de audio después de la reproducción
                        os.remove(tts_audio_file_path)
                        logging.info(f"Audio temporal {tts_audio_file_path} eliminado.")
                    else:
                        logging.error("No se pudo generar el audio para la respuesta NLP.")
                except Exception as tts_e:
                    logging.error(f"Error al generar audio TTS para la respuesta NLP: {tts_e}")

        response_data = HotwordAudioProcessResponse(
            transcribed_text=transcribed_text,
            identified_speaker=nlp_response_data["identified_speaker"],
            nlp_response=nlp_response_data["response"],
            serial_command_identified=nlp_response_data.get("serial_command"),
            tts_audio_file_path=tts_audio_file_path
        )
        utils._save_api_log("/hotword/process_audio", {"filename": audio_file.filename}, response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error en procesamiento de hotword: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el audio después de hotword")
