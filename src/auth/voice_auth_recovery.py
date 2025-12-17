import logging
from src.db.database import get_db
from src.db.models import User
from passlib.context import CryptContext
from sqlalchemy import select
import tempfile
import os
from src.api import utils

crypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger = logging.getLogger("VoiceAuthRecovery")

async def voice_password_recovery(audio_content: bytes, new_password: str):
    logger.info("Iniciando recuperación de contraseña por voz.")

    temp_audio_file = None
    try:
        if utils._speaker_module is None or not utils._speaker_module.is_online():
            logger.warning("Módulo de hablante no disponible o fuera de línea.")
            return False

        async with get_db() as db:
            result = await db.execute(select(User))
            users = result.scalars().all()
            if not users:
                logger.info("No hay usuarios registrados en el sistema para recuperación por voz.")
                return False

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(audio_content)
            temp_audio_file = temp_file.name

        identified_user_future = utils._speaker_module.identify_speaker(temp_audio_file)
        identified_user, _ = identified_user_future.result()

        if identified_user:
            logger.info(f"Hablante identificado: {identified_user.nombre}. Procediendo con el restablecimiento de contraseña.")

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
        if temp_audio_file and os.path.exists(temp_audio_file):
            os.remove(temp_audio_file)
            logger.info(f"Archivo temporal {temp_audio_file} eliminado.")
