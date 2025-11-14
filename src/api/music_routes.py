from fastapi import APIRouter, HTTPException
import logging
import asyncio
from src.api.music_schemas import (
    MusicPlayRequest,
    MusicPlayResponse,
    MusicActionResponse,
    MusicVolumeSetRequest,
    MusicVolumeResponse,
    MusicStatusResponse,
    MusicConfigResponse,
    MusicConfigUpdateRequest,
)
from src.api import utils
from src.db.database import get_db

logger = logging.getLogger("APIRoutes")

music_router = APIRouter()

@music_router.post("/play", response_model=MusicPlayResponse)
async def play_music(request: MusicPlayRequest):
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        result = await utils._music_manager.play(request.query)
        response_obj = MusicPlayResponse(**result)
        async with get_db() as db:
            await utils._save_api_log("/music/play", request.dict(), response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/play: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al reproducir música")

@music_router.post("/pause", response_model=MusicActionResponse)
async def pause_music():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, utils._music_manager.pause)
        response_obj = MusicActionResponse(**result)
        async with get_db() as db:
            await utils._save_api_log("/music/pause", {}, response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/pause: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al pausar la música")

@music_router.post("/resume", response_model=MusicActionResponse)
async def resume_music():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, utils._music_manager.resume)
        response_obj = MusicActionResponse(**result)
        async with get_db() as db:
            await utils._save_api_log("/music/resume", {}, response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al reanudar la música")

@music_router.post("/stop", response_model=MusicActionResponse)
async def stop_music():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, utils._music_manager.stop)
        response_obj = MusicActionResponse(**result)
        async with get_db() as db:
            await utils._save_api_log("/music/stop", {}, response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/stop: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al detener la música")

@music_router.get("/volume", response_model=MusicVolumeResponse)
async def get_volume():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        volume = utils._music_manager.get_volume()
        response_obj = MusicVolumeResponse(volume=volume)
        async with get_db() as db:
            await utils._save_api_log("/music/volume", {}, response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/volume (GET): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener el volumen")

@music_router.put("/volume", response_model=MusicActionResponse)
async def set_volume(request: MusicVolumeSetRequest):
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, utils._music_manager.set_volume, request.volume)
        response_obj = MusicActionResponse(**result)
        async with get_db() as db:
            await utils._save_api_log("/music/volume", request.dict(), response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/volume (PUT): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al establecer el volumen")

@music_router.get("/status", response_model=MusicStatusResponse)
async def get_status():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        info = utils._music_manager.get_info()
        response_obj = MusicStatusResponse(**info)
        async with get_db() as db:
            await utils._save_api_log("/music/status", {}, response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener el estado del módulo de música")

@music_router.get("/config", response_model=MusicConfigResponse)
async def get_config():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        data = utils._music_manager.get_config()
        response_obj = MusicConfigResponse(**data)
        async with get_db() as db:
            await utils._save_api_log("/music/config", {}, response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/config (GET): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener configuración de música")

@music_router.put("/config", response_model=MusicConfigResponse)
async def update_config(request: MusicConfigUpdateRequest):
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        utils._music_manager.update_config(request.dict(exclude_none=True))
        data = utils._music_manager.get_config()
        response_obj = MusicConfigResponse(**data)
        async with get_db() as db:
            await utils._save_api_log("/music/config", request.dict(exclude_none=True), response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/config (PUT): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al actualizar configuración de música")