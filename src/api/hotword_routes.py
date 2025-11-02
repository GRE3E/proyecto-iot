import asyncio
import logging
import os
import httpx
import tempfile
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from src.db.database import get_db
from src.db.models import User
from src.api.hotword_schemas import HotwordAudioProcessResponse
from src.api import utils
from src.auth.device_auth import get_device_api_key
from src.auth.jwt_manager import verify_token
from sqlalchemy import select, func
import pyaudio
import wave

logger = logging.getLogger("APIRoutes")

hotword_router = APIRouter()

def play_audio(file_path: str) -> bool:
    """
    Reproduce un archivo de audio WAV de forma segura y controlada.
    
    Args:
        file_path (str): Ruta al archivo de audio WAV a reproducir.
        
    Returns:
        bool: True si la reproducción fue exitosa, False en caso contrario.
    """
    if not os.path.exists(file_path):
        logger.error(f"Archivo de audio no encontrado: {file_path}")
        return False
        
    p = None
    stream = None
    wf = None
    
    try:
        wf = wave.open(file_path, 'rb')
        p = pyaudio.PyAudio()
        
        if wf.getsampwidth() not in [1, 2, 4]:
            logger.error(f"Formato de audio inválido en {file_path}")
            return False
            
        stream = p.open(format=p.get_format_from_width(wf.getsampwidth()),
                       channels=wf.getnchannels(),
                       rate=wf.getframerate(),
                       output=True)
        
        chunk_size = 1024
        data = wf.readframes(chunk_size)
        
        while len(data) > 0:
            stream.write(data)
            data = wf.readframes(chunk_size)
            
        logger.info(f"Audio reproducido exitosamente: {file_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error al reproducir audio {file_path}: {e}")
        return False
        
    finally:
        if stream is not None:
            try:
                stream.stop_stream()
                stream.close()
            except Exception as e:
                logger.error(f"Error al cerrar stream de audio: {e}")
                
        if p is not None:
            try:
                p.terminate()
            except Exception as e:
                logger.error(f"Error al terminar PyAudio: {e}")
                
        if wf is not None:
            try:
                wf.close()
            except Exception as e:
                logger.error(f"Error al cerrar archivo WAV: {e}")

@hotword_router.post("/hotword/process_audio", response_model=HotwordAudioProcessResponse)
async def process_hotword_audio(
    audio_file: UploadFile = File(...),
    device_api_key: str = Depends(get_device_api_key),
):
    """
    Procesa el audio tras la detección de hotword:
    - STT (voz a texto)
    - Identificación de hablante
    - Procesamiento NLP y comando IoT
    - Generación TTS (si está disponible)
    """
    timeout = httpx.Timeout(30.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with get_db() as db:
            logger.info("Iniciando procesamiento de audio de hotword.")

            if utils._stt_module is None or not utils._stt_module.is_online():
                raise HTTPException(status_code=503, detail="El módulo STT está fuera de línea")
            if utils._speaker_module is None or not utils._speaker_module.is_online():
                raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
            if utils._nlp_module is None or not utils._nlp_module.is_online():
                raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")

            transcribed_text = ""
            identified_speaker_name = "Desconocido"
            nlp_response_text = ""
            file_location = None
            user_id_for_nlp = None
            user_access_token = None

            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio_file:
                    file_location = Path(temp_audio_file.name)
                    content = await audio_file.read()
                    temp_audio_file.write(content)
                logger.info(f"Archivo de audio temporal guardado en: {file_location}")

                DEVICE_API_KEY = os.getenv("DEVICE_API_KEY")
                if not DEVICE_API_KEY:
                    logger.error("DEVICE_API_KEY no está configurada en las variables de entorno.")
                    raise HTTPException(status_code=500, detail="DEVICE_API_KEY no configurada")
                logger.info(f"DEVICE_API_KEY validada: {bool(DEVICE_API_KEY)}")
            
                user_access_token = None
                transcribed_text = ""
            
                stt_task = client.post(
                    "http://localhost:8000/stt/stt/transcribe",
                    files={"audio_file": (audio_file.filename, content, audio_file.content_type)},
                    headers={"X-Device-API-Key": DEVICE_API_KEY}
                )
                logger.info("Tarea de STT preparada.")
            
                speaker_task = client.post(
                    "http://localhost:8000/speaker/speaker/identify",
                    files={"audio_file": (audio_file.filename, content, audio_file.content_type)},
                    headers={"X-Device-API-Key": DEVICE_API_KEY}
                )
                logger.info("Tarea de identificación de hablante preparada.")
            
                stt_response, speaker_response = await asyncio.gather(
                    stt_task,
                    speaker_task
                )
                logger.info("Tareas de STT y Speaker Identification completadas concurrentemente.")
            
                stt_response.raise_for_status()
                if not stt_response.content:
                    logger.error("STT service returned an empty response.")
                    raise HTTPException(status_code=500, detail="STT service returned an empty response.")
                    
                logger.info(f"Respuesta STT recibida con status {stt_response.status_code}. Contenido: {stt_response.text[:200]}...")
                
                stt_result = stt_response.json()
                transcribed_text = stt_result.get("text", "")
                logger.info(f"Texto transcrito (vía HTTP): {transcribed_text}")
            
                try:
                    speaker_response.raise_for_status()
                    speaker_result = speaker_response.json()
                    user_access_token = speaker_result.get("access_token")
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404 and ("No hay usuarios registrados" in e.response.text or "Usuario no identificado" in e.response.text):
                        logger.info("Usuario no identificado o no hay usuarios registrados. Procediendo a registrar como desconocido.")
                        user_access_token = None
                    else:
                        raise e

                if user_access_token:
                    decoded_token = verify_token(user_access_token)
                    user_id_for_nlp = decoded_token.get("sub")
                    
                    identified_user_from_speaker_result = await db.execute(
                        select(User).filter(User.id == user_id_for_nlp)
                    )
                    identified_user_from_speaker = identified_user_from_speaker_result.scalar_one_or_none()
                    if identified_user_from_speaker:
                        await db.refresh(identified_user_from_speaker)
                        identified_speaker_name = identified_user_from_speaker.nombre
                        logger.info(f"Hablante identificado: {identified_speaker_name} (ID: {user_id_for_nlp})")
                    else:
                        logger.error(f"Usuario con ID {user_id_for_nlp} no encontrado en la base de datos después de la identificación del hablante.")
                        raise HTTPException(status_code=500, detail="Usuario identificado no encontrado.")
                else:
                    logger.info("Hablante no identificado. Registrando como desconocido a través del endpoint /speaker/register.")
                    count_result = await db.execute(
                        select(func.count()).where(User.nombre.like("Desconocido %"))
                    )
                    current_unknown_count = count_result.scalar_one()
                    next_unknown_id = current_unknown_count + 1
                    new_unknown_name = f"Desconocido {next_unknown_id}"
            
                    try:
                        register_response = await client.post(
                            "http://localhost:8000/speaker/speaker/register",
                            files={
                                "audio_file": (audio_file.filename, content, audio_file.content_type)
                            },
                            data={
                                "name": new_unknown_name,
                                "is_owner": False
                            }
                        )
                        register_response.raise_for_status()
                        register_result = register_response.json()
                        user_access_token = register_result.get("access_token")
                        logger.info(f"Nuevo hablante desconocido registrado a través del endpoint: {new_unknown_name}")
            
                        result = await db.execute(
                            select(User).filter(User.nombre == new_unknown_name)
                        )
                        identified_user_obj = result.scalar_one_or_none()
                        if identified_user_obj:
                            identified_speaker_name = new_unknown_name
                            user_id_for_nlp = identified_user_obj.id
                            logger.info(f"Nuevo hablante desconocido registrado: {new_unknown_name} (ID: {user_id_for_nlp})")
                        else:
                            logger.error("Fallo al recuperar el usuario recién registrado de la base de datos.")
                            raise HTTPException(status_code=500, detail="No se pudo recuperar el usuario recién registrado")
            
                    except httpx.HTTPStatusError as e:
                        logger.error(f"Error HTTP al registrar hablante desconocido: {e.response.status_code} - {e.response.text}")
                        raise HTTPException(status_code=500, detail=f"Error al registrar hablante desconocido: {e.response.text}")
                    except Exception as e:
                        logger.error(f"Error inesperado al registrar hablante desconocido: {e}", exc_info=True)
                        raise HTTPException(status_code=500, detail=f"Error inesperado al registrar hablante desconocido: {str(e)}")
            
                if not transcribed_text:
                    logger.error("Texto transcrito vacío después de STT.")
                    raise HTTPException(status_code=500, detail="Error en transcripción STT")
            
                logger.info(f"Texto transcrito final: '{transcribed_text}'")
                logger.info(f"Hablante identificado final: '{identified_speaker_name}'")
                logger.info(f"ID de usuario para NLP: {user_id_for_nlp}")
                logger.info(f"Token de acceso de usuario disponible: {bool(user_access_token)}")

                if user_id_for_nlp and user_access_token:
                    logger.info("Iniciando procesamiento NLP a través del endpoint /nlp/query.")
                    try:
                        nlp_api_response = await client.post(
                            "http://localhost:8000/nlp/nlp/query",
                            json={"prompt": transcribed_text},
                            headers={"Authorization": f"Bearer {user_access_token}"}
                        )
                        nlp_api_response.raise_for_status()
                        nlp_response = nlp_api_response.json()
                        nlp_response_text = nlp_response.get("response", "")
                        logger.info(f"Respuesta NLP recibida del endpoint: {nlp_response_text}")
                    except httpx.TimeoutException:
                        logger.error("Timeout al llamar al servicio NLP")
                        nlp_response_text = "El procesamiento tardó demasiado tiempo. Intenta de nuevo."
                    except httpx.HTTPStatusError as e:
                        logger.error(f"Error HTTP al llamar al servicio NLP: {e.response.status_code} - {e.response.text}")
                        nlp_response_text = f"Error al procesar NLP: {e.response.text}"
                    except Exception as e:
                        logger.error(f"Error inesperado al llamar al servicio NLP: {e}", exc_info=True)
                        nlp_response_text = f"Error inesperado al procesar NLP: {str(e)}"
                else:
                    logger.warning("No se puede realizar el procesamiento NLP: user_id o user_access_token no disponibles.")
                    nlp_response_text = "No se pudo procesar el comando sin identificación de usuario."

                tts_audio_paths = []
                if nlp_response_text and not nlp_response_text.startswith("Error"):
                    logger.info("Iniciando generación TTS a través del endpoint /tts/generate_audio.")
                    try:
                        async for audio_path in utils._tts_module.generate_audio_stream(nlp_response_text):
                            try:
                                logger.info(f"PLAYED: Reproduciendo audio: {audio_path}")
                                success = await asyncio.to_thread(play_audio, str(audio_path))

                                if success:
                                    logger.info(f"PLAYED: Audio reproducido exitosamente: {audio_path}")
                                else:
                                    logger.error(f"Error al reproducir audio: {audio_path}")

                            except Exception as e:
                                logger.error(f"Error al procesar audio {audio_path}: {e}")

                            finally:
                                try:
                                    if audio_path.exists():
                                        audio_path.unlink(missing_ok=True)
                                        logger.info(f"DELETED: Audio temporal eliminado: {audio_path}")
                                except Exception as e:
                                    logger.error(f"Error al eliminar archivo temporal {audio_path}: {e}")

                        tts_audio_paths = []

                    except httpx.TimeoutException:
                        logger.error("Timeout al llamar al servicio TTS")
                    except httpx.HTTPStatusError as e:
                        logger.error(f"Error HTTP al llamar al servicio TTS: {e.response.status_code} - {e.response.text}")
                    except Exception as e:
                        logger.error(f"Error inesperado al llamar al servicio TTS: {e}", exc_info=True)
                else:
                    logger.info("No hay respuesta NLP válida para generar TTS.")

                return HotwordAudioProcessResponse(
                    transcribed_text=transcribed_text,
                    identified_speaker=identified_speaker_name,
                    nlp_response=nlp_response_text,
                    tts_audio_paths=tts_audio_paths
                )

            except httpx.TimeoutException:
                logger.error("Timeout en procesamiento de hotword")
                raise HTTPException(status_code=504, detail="El procesamiento tardó demasiado tiempo")
            except httpx.HTTPStatusError as e:
                if e.request.url == "http://localhost:8000/speaker/speaker/identify" and e.response.status_code == 404:
                    if "No hay usuarios registrados" in e.response.text or "Usuario no identificado" in e.response.text:
                        logger.info("Excepción de identificación capturada. Procediendo con el registro de usuario desconocido.")
                    else:
                        logger.error(f"Error HTTP al llamar a servicios: {e.response.status_code} - {e.response.text}")
                        raise HTTPException(status_code=e.response.status_code, detail=f"Error en servicio externo: {e.response.text}")
                else:
                    logger.error(f"Error HTTP al llamar a servicios: {e.response.status_code} - {e.response.text}")
                    raise HTTPException(status_code=e.response.status_code, detail=f"Error en servicio externo: {e.response.text}")
            except HTTPException as e:
                logger.error(f"Error en procesamiento de hotword: {e.detail}")
                raise e
            except Exception as e:
                logger.error(f"Error inesperado en procesamiento de hotword: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")
            finally:
                if file_location and file_location.exists():
                    os.remove(file_location)
                    logger.info(f"Archivo temporal eliminado: {file_location}")
