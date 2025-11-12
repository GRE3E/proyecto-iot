import logging
from src.ai.speaker.speaker import SpeakerRecognitionModule
import asyncio
from src.db.database import get_db
from src.db.models import User
from passlib.context import CryptContext
from sqlalchemy import select
import tempfile
import os

crypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
speaker_recognition_module = SpeakerRecognitionModule()

logger = logging.getLogger("VoiceAuthRecovery")

async def voice_password_recovery(audio_content: bytes, new_password: str):
    logger.info(f"Iniciando recuperación de contraseña por voz.")

    temp_audio_file = None
    try:
        # Guardar el contenido de audio en un archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(audio_content)
            temp_audio_file = temp_file.name

        # Identificar al hablante usando la ruta del archivo temporal
        identified_user_future = speaker_recognition_module.identify_speaker(temp_audio_file)
        identified_user, _ = identified_user_future.result() # Obtener el resultado del Future

        if identified_user:
            logger.info(f"Hablante identificado: {identified_user.nombre}. Proceda con el restablecimiento de contraseña.")

            async with get_db() as db:
                user_to_update = await db.execute(select(User).filter(User.nombre == identified_user.nombre))
                user_to_update = user_to_update.scalar_one_or_none()

                if user_to_update:
                    hashed_password = crypt_context.hash(new_password)
                    user_to_update.hashed_password = hashed_password
                    await db.commit()
                    await db.refresh(user_to_update)
                    logger.info(f"Contraseña para {identified_user.nombre} actualizada exitosamente.")
                    return True
                else:
                    logger.warning(f"Usuario {identified_user.nombre} no encontrado en la base de datos.")
                    return False
        else:
            logger.warning("Hablante no identificado. Acceso denegado.")
            return False
    finally:
        # Eliminar el archivo temporal si existe
        if temp_audio_file and os.path.exists(temp_audio_file):
            os.remove(temp_audio_file)