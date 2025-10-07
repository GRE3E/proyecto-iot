import asyncio
import logging
import re
from typing import Optional
from sqlalchemy.orm import Session
from src.db.models import User, Preference

logger = logging.getLogger("UserManager")

class UserManager:
    """
    Gestiona la lógica relacionada con usuarios, permisos y preferencias.
    """
    def __init__(self):
        pass

    async def get_user_data(self, db: Session, user_name: Optional[str]) -> tuple[Optional[User], str, str]:
        """
        Recupera los datos del usuario, sus permisos y preferencias.
        """
        logger.debug(f"Attempting to retrieve user data for user_name: {user_name}")
        db_user = None
        user_permissions_str = ""
        user_preferences_str = ""

        if user_name:
            db_user = await asyncio.to_thread(
                lambda: db.query(User).filter(User.nombre == user_name).first()
            )
            if db_user:
                logger.info(f"User '{user_name}' found in database.")
            else:
                logger.info(f"User '{user_name}' not found in database.")

        if db_user:
            await asyncio.to_thread(lambda: db.expire(db_user))
            await asyncio.to_thread(lambda: db.refresh(db_user))

            permissions = [up.permission.name for up in db_user.permissions]
            user_permissions_str = ", ".join(permissions)
            logger.debug(f"Permissions for user '{user_name}': {user_permissions_str}")

            user_preferences = await asyncio.to_thread(
                lambda: db.query(Preference).filter(Preference.user_id == db_user.id).all()
            )
            user_preferences_str = (
                ", ".join([f"{p.key}: {p.value}" for p in user_preferences])
                if user_preferences
                else "No hay preferencias de usuario registradas."
            )
            logger.debug(f"Preferences for user '{user_name}': {user_preferences_str}")
        logger.debug(f"Finished retrieving user data for user_name: {user_name}")
        return db_user, user_permissions_str, user_preferences_str

    async def handle_preference_setting(self, db: Session, db_user: User, full_response_content: str) -> str:
        logger.debug(f"Attempting to handle preference setting for user: {db_user.nombre if db_user else 'None'}")
        matches = list(
            re.finditer(r"preference_set:\s*([^,]+),\s*(.+)", full_response_content)
        )
        for match in matches:
            if db_user:
                pref_key, pref_value = match.group(1).strip(), match.group(2).strip()
                logger.info(f"Detected preference to set: key='{pref_key}', value='{pref_value}' for user '{db_user.nombre}'.")
                existing = await asyncio.to_thread(
                    lambda: db.query(Preference)
                    .filter(
                        Preference.user_id == db_user.id,
                        Preference.key == pref_key,
                    )
                    .first()
                )
                if existing:
                    existing.value = pref_value
                    logger.info(
                        f"Preferencia '{pref_key}' actualizada para '{db_user.nombre}': {pref_value}"
                    )
                else:
                    await asyncio.to_thread(
                        lambda: db.add(
                            Preference(
                                user_id=db_user.id,
                                key=pref_key,
                                value=pref_value,
                            )
                        )
                    )
                    logger.info(
                        f"Nueva preferencia '{pref_key}' guardada para '{db_user.nombre}': {pref_value}"
                    )
                await asyncio.to_thread(lambda: db.commit())
                logger.debug(f"Preference '{pref_key}' committed to database for user '{db_user.nombre}'.")

        return re.sub(
            r"preference_set:\s*([^,]+),\s*(.+)", "", full_response_content
        ).strip()

    async def handle_name_change(self, db: Session, user_name: str, match: re.Match) -> Optional[str]:
        logger.debug(f"Attempting to handle name change for user '{user_name}'.")
        new_name = match.group(1).capitalize()
        try:
            existing_user = await asyncio.to_thread(
                lambda: db.query(User).filter(User.nombre == user_name).first()
            )
            if existing_user:
                logger.info(f"Cambiando nombre de '{existing_user.nombre}' a '{new_name}'.")
                existing_user.nombre = new_name
                await asyncio.to_thread(lambda: db.commit())
                logger.info(f"User name changed to '{new_name}' and committed to database.")
                return f"De acuerdo, a partir de ahora te llamaré {new_name}."
            else:
                logger.warning(
                    f"Usuario '{user_name}' no encontrado para cambio de nombre."
                )
                return None
        except Exception as e:
            logger.error(f"Error al cambiar el nombre: {e}")
            await asyncio.to_thread(lambda: db.rollback())
            return None