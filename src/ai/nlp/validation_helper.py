import logging
from typing import Tuple, Optional, Any
from src.db.database import get_db

logger = logging.getLogger("ValidationHelper")

class ValidationHelper:
    """Valida datos y estados del módulo"""
    
    def __init__(self, user_manager):
        self._user_manager = user_manager
    
    async def validate_user(self, user_id: int) -> Tuple[Optional[Any], Optional[str], Optional[bool], Optional[str], Optional[dict]]:
        """Valida el usuario y obtiene sus datos"""
        if user_id is None:
            return None, None, None, None, None

        async with get_db() as db:
            db_user, user_permissions_str, user_preferences_dict = await self._user_manager.get_user_data_by_id(db, user_id)
            if not db_user:
                return None, None, None, None, None
                
            return db_user, db_user.nombre, db_user.is_owner, user_permissions_str, user_preferences_dict
    
    async def load_iot_commands(self, iot_processor) -> Tuple[Optional[Any], Optional[list[str]], Optional[str]]:
        """Carga los comandos IoT desde la base de datos"""
        try:
            async with get_db() as db:
                formatted_iot_commands, iot_commands_db = await iot_processor.load_commands_from_db(db)
                return formatted_iot_commands, [cmd.name for cmd in iot_commands_db], None
        except Exception as e:
            error_msg = "Error al cargar comandos IoT."
            logger.error(f"No se pudieron cargar los comandos IoT: {e}")
            return None, None, error_msg
