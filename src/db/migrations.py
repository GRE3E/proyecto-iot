import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("Migrations")

async def create_nlp_indexes(db: AsyncSession) -> None:
    """Crea los índices necesarios para optimizar el módulo NLP"""
    
    indexes = [
        # Índice para búsquedas de historial de conversación por usuario y timestamp
        """
        CREATE INDEX IF NOT EXISTS idx_conversation_user_timestamp 
        ON conversation_log(user_id, timestamp DESC)
        """,
        
        # Índice para búsquedas por user_id en conversation_log
        """
        CREATE INDEX IF NOT EXISTS idx_conversation_user_id 
        ON conversation_log(user_id)
        """,
        
        # Índice para búsquedas de comandos IoT por nombre
        """
        CREATE INDEX IF NOT EXISTS idx_iot_commands_name 
        ON iot_commands(name)
        """,
        
        # Índice para búsquedas de comandos IoT por topic y payload
        """
        CREATE INDEX IF NOT EXISTS idx_iot_commands_topic_payload 
        ON iot_commands(mqtt_topic, command_payload)
        """,
        
        # Índice para usuarios por nombre
        """
        CREATE INDEX IF NOT EXISTS idx_users_nombre 
        ON users(nombre)
        """,
        
        # Índice para preferencias por user_id
        """
        CREATE INDEX IF NOT EXISTS idx_preferences_user_id 
        ON preferences(user_id)
        """,
        
        # Índice para memory por user_id
        """
        CREATE INDEX IF NOT EXISTS idx_user_memory_user_id 
        ON user_memory(user_id)
        """,
        
        # Índice para device_states por device_name
        """
        CREATE INDEX IF NOT EXISTS idx_device_states_name 
        ON device_states(device_name)
        """,
    ]
    
    try:
        for index_sql in indexes:
            await db.execute(text(index_sql))
            logger.info(f"Índice creado: {index_sql.strip()[:50]}...")
        
        await db.commit()
        logger.info("Todos los índices NLP creados exitosamente")
        
    except Exception as e:
        logger.error(f"Error al crear índices: {e}")
        await db.rollback()
        raise

async def drop_nlp_indexes(db: AsyncSession) -> None:
    """Elimina los índices (en caso de necesidad)"""
    
    indexes = [
        "idx_conversation_user_timestamp",
        "idx_conversation_user_id",
        "idx_iot_commands_name",
        "idx_iot_commands_topic_payload",
        "idx_users_nombre",
        "idx_preferences_user_id",
        "idx_user_memory_user_id",
        "idx_device_states_name",
    ]
    
    try:
        for index_name in indexes:
            await db.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
            logger.info(f"Índice eliminado: {index_name}")
        
        await db.commit()
        logger.info("Todos los índices eliminados")
        
    except Exception as e:
        logger.error(f"Error al eliminar índices: {e}")
        await db.rollback()
        raise
    