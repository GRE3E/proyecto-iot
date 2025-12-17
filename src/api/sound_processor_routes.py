from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
import logging
from pathlib import Path
import tempfile
from src.api.sound_processor_schemas import AudioProcessResponse
from src.ai.sound_processor.noise_suppressor import suppress_noise
from src.auth.auth_service import get_current_user

logger = logging.getLogger("SoundProcessorRoutes")

sound_processor_router = APIRouter()

@sound_processor_router.post("/process_audio", response_model=AudioProcessResponse)
async def process_audio(audio_file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """Procesa un archivo de audio aplicando supresión de ruido y devuelve la ruta al archivo procesado."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_file_location = Path(tmpdir) / audio_file.filename
            with open(input_file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            processed_audio_path = suppress_noise(str(input_file_location))

            if processed_audio_path is None:
                raise HTTPException(status_code=500, detail="Error al procesar el audio.")
            
            # En un entorno de producción, deberías mover processed_audio_path a un almacenamiento persistente
            # y devolver una URL accesible. Para este ejemplo, devolvemos la ruta temporal.
            # Asegúrate de que el cliente pueda acceder a este archivo temporal si es necesario.
            logger.info(f"Audio procesado y guardado en: {processed_audio_path}")
            return AudioProcessResponse(processed_audio_path=processed_audio_path)

    except Exception as e:
        logger.error(f"Error al procesar audio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor al procesar audio.")