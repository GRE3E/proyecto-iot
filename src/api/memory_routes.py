from fastapi import APIRouter, HTTPException, Depends
from src.auth.auth_service import get_current_user
from src.db.models import User
from src.db.database import get_db
import logging
from src.api import utils

from src.api.memory_schemas import MemoryStatusResponse, UserPatternsResponse

logger = logging.getLogger("APIRoutes")

memory_router = APIRouter()

@memory_router.get("/memory/status", response_model=MemoryStatusResponse)
async def get_memory_brain_status(
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            status = await utils._nlp_module._memory_brain.get_routine_status(db, current_user.id)
            logger.info(f"Status Memory Brain obtenido para usuario {current_user.id}")
            
            await utils._save_api_log(
                "/memory/status",
                {"user_id": current_user.id},
                status,
                db
            )
            return status
    except Exception as e:
        logger.error(f"Error obteniendo Memory Brain status: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener Memory Brain status")


@memory_router.get("/memory/patterns", response_model=UserPatternsResponse)
async def get_user_patterns(
    current_user: User = Depends(get_current_user)
):
    try:
        patterns = utils._nlp_module._memory_brain.analyze_user(current_user.id)
        logger.info(f"Patrones obtenidos para usuario {current_user.id}")
        
        async with get_db() as db:
            await utils._save_api_log(
                "/memory/patterns",
                {"user_id": current_user.id},
                patterns,
                db
            )
        
        return patterns
    except Exception as e:
        logger.error(f"Error obteniendo patrones: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener patrones")
