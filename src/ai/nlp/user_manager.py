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

    def _sanitize_value(self, value: str) -> str:
        """
        Sanitiza valores para evitar problemas con el formateo del template.
        Elimina comillas problemáticas y caracteres de escape.
        """
        if not value:
            return value
        # Reemplazar comillas dobles por simples y eliminar saltos de línea
        return str(value).replace('"', '').replace("'", "").replace('\n', ' ').replace('\r', '').strip()

    def _parse_preferences(self, preferences_str: str) -> dict:
        preferences = {}
        if preferences_str:
            for item in preferences_str.split(", "):
                try:
                    if ": " in item:
                        key, value = item.split(": ", 1)
                        preferences[key.strip()] = value.strip()
                    else:
                        logger.warning(f"Formato de preferencia inválido encontrado: '{item}'. Se ignorará.")
                except ValueError as e:
                    logger.warning(f"Error al parsear el elemento de preferencia '{item}': {e}. Se ignorará.")
        return preferences

    async def get_user_data(self, db: Session, user_name: Optional[str]) -> tuple[Optional[User], str, dict]:
        """
        Recupera los datos del usuario, sus permisos y preferencias.
        """
        logger.debug(f"Intentando recuperar datos de usuario para user_name: {user_name}")
        db_user = None
        user_permissions_str = ""
        user_preferences_str = ""
        user_preferences_dict = {}

        if user_name:
            try:
                db_user = await asyncio.to_thread(
                    lambda: db.query(User).filter(User.nombre == user_name).first()
                )
                if db_user:
                    logger.info(f"Usuario '{user_name}' encontrado en la base de datos.")
                else:
                    logger.info(f"Usuario '{user_name}' no encontrado en la base de datos.")
            except Exception as e:
                logger.error(f"Error al buscar usuario '{user_name}' en la base de datos: {e}")
                db_user = None

        if db_user:
            try:
                await asyncio.to_thread(lambda: db.expire(db_user))
                await asyncio.to_thread(lambda: db.refresh(db_user))
            except Exception as e:
                logger.error(f"Error al refrescar datos del usuario '{user_name}': {e}")
                # Continuar con datos parciales o manejar como error fatal si es necesario

            # Sanitizar permisos
            permissions = [up.permission.name for up in db_user.permissions]
            user_permissions_str = ", ".join([self._sanitize_value(p) for p in permissions])
            logger.debug(f"Permisos para el usuario '{user_name}': {user_permissions_str}")

            # Sanitizar preferencias
            try:
                user_preferences = await asyncio.to_thread(
                    lambda: db.query(Preference).filter(Preference.user_id == db_user.id).all()
                )
            except Exception as e:
                logger.error(f"Error al cargar preferencias para el usuario '{user_name}': {e}")
                user_preferences = []

            if user_preferences:
                pref_items = []
                for p in user_preferences:
                    safe_key = self._sanitize_value(str(p.key))
                    safe_value = self._sanitize_value(str(p.value))
                    pref_items.append(f"{safe_key}: {safe_value}")
                user_preferences_str = ", ".join(pref_items)
                user_preferences_dict = self._parse_preferences(user_preferences_str)
            else:
                user_preferences_str = "No hay preferencias de usuario registradas"
                user_preferences_dict = {}
            
            logger.debug(f"Preferencias para el usuario '{user_name}': {user_preferences_str}")
            
        logger.debug(f"Finalizada la recuperación de datos de usuario para user_name: {user_name}")
        return db_user, user_permissions_str, user_preferences_dict

    async def handle_preference_setting(self, db: Session, db_user: User, full_response_content: str) -> str:
        logger.debug(f"Intentando manejar la configuración de preferencias para el usuario: {db_user.nombre if db_user else 'None'}")
        matches = list(
            re.finditer(r"preference_set:\s*([^,]+),\s*(.+)", full_response_content)
        )
        for match in matches:
            if db_user:
                pref_key, pref_value = match.group(1).strip(), match.group(2).strip()
                logger.info(f"Preferencia detectada para establecer: clave='{pref_key}', valor='{pref_value}' para el usuario '{db_user.nombre}'.")
                try:
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
                    logger.debug(f"Preferencia '{pref_key}' confirmada en la base de datos para el usuario '{db_user.nombre}'.")
                except Exception as e:
                    logger.error(f"Error al guardar preferencia '{pref_key}' para '{db_user.nombre}': {e}")
                    await asyncio.to_thread(lambda: db.rollback())

        return re.sub(
            r"preference_set:\s*([^,]+),\s*(.+)", "", full_response_content
        ).strip()

    async def handle_name_change(self, db: Session, user_name: str, new_name: str) -> Optional[str]:
        logger.debug(f"Intentando manejar el cambio de nombre para el usuario '{user_name}' a '{new_name}'.")
        try:
            existing_user = await asyncio.to_thread(
                lambda: db.query(User).filter(User.nombre == user_name).first()
            )
            if existing_user:
                logger.info(f"Cambiando nombre de '{existing_user.nombre}' a '{new_name}'.")
                existing_user.nombre = new_name
                await asyncio.to_thread(lambda: db.commit())
                logger.info(f"Nombre de usuario cambiado a '{new_name}' y confirmado en la base de datos.")
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