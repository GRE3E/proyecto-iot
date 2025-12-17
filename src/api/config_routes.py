from fastapi import APIRouter, HTTPException
from src.api.config_schemas import AssistantNameUpdate, TimezoneUpdate, CapabilitiesUpdate
from src.api.schemas import StatusResponse
from src.db.database import get_db
import logging
from src.api import utils

logger = logging.getLogger("APIRoutes")

config_router = APIRouter()

@config_router.put("/config/assistant-name", response_model=StatusResponse)
async def update_assistant_name(update: AssistantNameUpdate):
    try:
        await utils._nlp_module.update_assistant_name(update.name)
        logger.info(f"Nombre del asistente actualizado exitosamente a '{update.name}'")

        response_data = utils.get_module_status()
        async with get_db() as db:
            await utils._save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
        return response_data

    except Exception as e:
        logger.error(f"Error al actualizar nombre del asistente: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar el nombre del asistente: {str(e)}")


@config_router.put("/config/timezone", response_model=StatusResponse)
async def update_timezone(update: TimezoneUpdate):
    try:
        await utils._nlp_module.update_timezone(update.timezone)
        logger.info(f"Zona horaria actualizada exitosamente a '{update.timezone}'")

        response_data = utils.get_module_status()
        async with get_db() as db:
            await utils._save_api_log("/config/timezone", update.dict(), response_data.dict(), db)
        return response_data

    except Exception as e:
        logger.error(f"Error al actualizar la zona horaria: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar la zona horaria: {str(e)}")


@config_router.put("/config/capabilities", response_model=StatusResponse)
async def update_capabilities(update: CapabilitiesUpdate):
    try:
        await utils._nlp_module.update_capabilities(update.capabilities)
        logger.info("Capacidades del asistente actualizadas exitosamente")

        response_data = utils.get_module_status()
        async with get_db() as db:
            await utils._save_api_log("/config/capabilities", update.dict(), response_data.dict(), db)
        return response_data

    except Exception as e:
        logger.error(f"Error al actualizar capacidades: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar las capacidades: {str(e)}")



