from fastapi import APIRouter, HTTPException
from src.api.system_schemas import  ModuleStatusUpdate
from src.api.schemas import StatusResponse
from src.db.database import get_db
import logging
from src.api import utils

logger = logging.getLogger("APIRoutes")

system_router = APIRouter()

@system_router.get("/status", response_model=StatusResponse)
async def get_system_status():
    """Devuelve el estado actual de los módulos."""
    try:
        status = utils.get_module_status()
        return status
    except Exception as e:
        logger.error(f"Error al obtener estado para /system/status: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@system_router.put("/modules/{module_name}", response_model=StatusResponse)
async def update_module_status(module_name: str, update: ModuleStatusUpdate):
    """
    Habilita o deshabilita un módulo dinámicamente.
    """
    try:
        if update.enabled:
            success = await utils.enable_module(module_name)
        else:
            success = await utils.disable_module(module_name)
            
        if not success:
             raise HTTPException(status_code=500, detail=f"No se pudo {'habilitar' if update.enabled else 'deshabilitar'} el módulo {module_name}")

        response_data = utils.get_module_status()
        async with get_db() as db:
            await utils._save_api_log(f"/system/modules/{module_name}", update.dict(), response_data.dict(), db)
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar estado del módulo {module_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar el módulo: {str(e)}")
