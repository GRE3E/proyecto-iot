import logging
import tempfile
import os

from src.rc.recognize import FaceRecognizer
from src.db.database import get_db
from src.db.models import User
from passlib.context import CryptContext
from sqlalchemy import select

crypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
face_recognizer = FaceRecognizer()

logger = logging.getLogger("FaceAuthRecovery")

async def face_password_recovery(new_password: str, source: str = "camera", image_content: bytes = None):
    logger.info(f"Iniciando recuperación de contraseña por reconocimiento facial desde {source}.")

    identified_username = None
    temp_image_file = None

    try:
        await face_recognizer.load_known_faces()

        if source == "camera":
            recognized_users = await face_recognizer.recognize_from_cam()
            if recognized_users:
                identified_username = recognized_users[0]
        elif source == "file" and image_content:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
                temp_file.write(image_content)
                temp_image_file = temp_file.name
            recognized_users = await face_recognizer.recognize_from_file(temp_image_file)
            if recognized_users:
                identified_username = recognized_users[0]
        else:
            logger.warning(f"Fuente de reconocimiento no válida o contenido de imagen faltante: {source}")
            return False

        if identified_username:
            logger.info(f"Rostro identificado: {identified_username}. Proceda con el restablecimiento de contraseña.")

            async with get_db() as db:
                user_to_update = await db.execute(select(User).filter(User.nombre == identified_username))
                user_to_update = user_to_update.scalar_one_or_none()

                if user_to_update:
                    hashed_password = crypt_context.hash(new_password)
                    user_to_update.hashed_password = hashed_password
                    await db.commit()
                    await db.refresh(user_to_update)
                    logger.info(f"Contraseña para {identified_username} actualizada exitosamente.")
                    return True
                else:
                    logger.warning(f"Usuario {identified_username} no encontrado en la base de datos.")
                    return False
        else:
            logger.warning("Rostro no identificado. Acceso denegado.")
            return False
    except Exception as e:
        logger.error(f"Error durante la recuperación de contraseña por rostro: {e}")
        return False
    finally:
        if temp_image_file and os.path.exists(temp_image_file):
            os.remove(temp_image_file)