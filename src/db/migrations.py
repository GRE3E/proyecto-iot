import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("Migrations")

async def create_nlp_indexes(db: AsyncSession) -> None:
    
    indexes = [
        """
        CREATE INDEX IF NOT EXISTS idx_conversation_user_timestamp 
        ON conversation_log(user_id, timestamp DESC)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_conversation_user_id 
        ON conversation_log(user_id)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_iot_commands_name 
        ON iot_commands(name)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_iot_commands_topic_payload 
        ON iot_commands(mqtt_topic, command_payload)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_users_nombre 
        ON users(nombre)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_preferences_user_id 
        ON preferences(user_id)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_user_memory_user_id 
        ON user_memory(user_id)
        """,
        
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
        logger.error(f"Error al crear índices NLP: {e}")
        await db.rollback()
        raise


async def create_routine_indexes(db: AsyncSession) -> None:
    
    indexes = [
        """
        CREATE INDEX IF NOT EXISTS idx_routines_user_id 
        ON routines(user_id)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_routines_confirmed 
        ON routines(confirmed)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_routines_enabled 
        ON routines(enabled)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_routines_trigger_type 
        ON routines(trigger_type)
        """,
        
        """
        CREATE INDEX IF NOT EXISTS idx_routines_user_confirmed_enabled 
        ON routines(user_id, confirmed, enabled)
        """,
    ]
    
    try:
        for index_sql in indexes:
            await db.execute(text(index_sql))
            logger.info(f"Índice creado: {index_sql.strip()[:50]}...")
        
        await db.commit()
        logger.info("Todos los índices de rutinas creados exitosamente")
        
    except Exception as e:
        logger.error(f"Error al crear índices de rutinas: {e}")
        await db.rollback()
        raise


async def drop_nlp_indexes(db: AsyncSession) -> None:
    
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
        logger.info("Todos los índices NLP eliminados")
        
    except Exception as e:
        logger.error(f"Error al eliminar índices NLP: {e}")
        await db.rollback()
        raise


async def drop_routine_indexes(db: AsyncSession) -> None:
    
    indexes = [
        "idx_routines_user_id",
        "idx_routines_confirmed",
        "idx_routines_enabled",
        "idx_routines_trigger_type",
        "idx_routines_user_confirmed_enabled",
    ]
    
    try:
        for index_name in indexes:
            await db.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
            logger.info(f"Índice eliminado: {index_name}")
        
        await db.commit()
        logger.info("Todos los índices de rutinas eliminados")
        
    except Exception as e:
        logger.error(f"Error al eliminar índices de rutinas: {e}")
        await db.rollback()
        raise
    