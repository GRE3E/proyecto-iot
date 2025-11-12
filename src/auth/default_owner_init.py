import logging
from src.db.database import get_db
from src.auth.auth_service import AuthService

logger = logging.getLogger("AuthInit")


async def init_default_owner_startup() -> None:
    """
    Handler de startup para garantizar un usuario propietario por defecto
    cuando la base de datos no tiene ningún owner.

    Crea el usuario:
    - username: "administrador"
    - password: "12345"
    - is_owner: True
    """
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            owners = await auth_service.get_owner_users()
            if not owners:
                await auth_service.register_user(
                    username="administrador",
                    password="12345",
                    is_owner=True,
                )
                logger.info("Usuario owner por defecto creado: 'administrador'")
            else:
                logger.info(
                    f"Se encontraron {len(owners)} propietarios; no se crea usuario por defecto."
                )
    except Exception as e:
        logger.error(
            f"Error al verificar/crear usuario owner por defecto: {e}",
            exc_info=True,
        )