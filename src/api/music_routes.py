import json
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
import logging
import asyncio
from typing import Set
from starlette.responses import JSONResponse
from src.api.music_schemas import (
    MusicPlayRequest,
    MusicPlayResponse,
    MusicActionResponse,
    MusicVolumeSetRequest,
    MusicVolumeResponse,
    MusicStatusResponse,
    MusicConfigResponse,
    MusicConfigUpdateRequest,
    MusicNowPlayingResponse,
    MusicSeekRequest,
)
from src.api import utils
from src.websocket.connection_manager import manager as ws_manager
from src.db.database import get_db
from src.auth.auth_service import get_current_user
from src.db.models import MusicPlayLog, User
from sqlalchemy import select

logger = logging.getLogger("APIRoutes")

music_router = APIRouter()

connections: Set[WebSocket] = set()

async def broadcast(message: dict):
    for connection in list(connections):
        try:
            await connection.send_json(message)
        except RuntimeError:
            # Handle WebSocket connection already closed
            connections.remove(connection)

@music_router.websocket("/ws/music-status")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections.add(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        connections.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connections.remove(websocket)

@music_router.post("/play", response_model=MusicPlayResponse)
async def play_music(request: MusicPlayRequest, current_user: User = Depends(get_current_user)):
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        result = await utils._music_manager.play(request.query, current_user.id, current_user.nombre)
        response_obj = MusicPlayResponse(**result)
        async with get_db() as db:
            audio_info = utils._music_manager.get_current_track()
            entry = MusicPlayLog(
                user_id=current_user.id,
                user_name=current_user.nombre,
                title=response_obj.title,
                uploader=response_obj.uploader,
                duration=response_obj.duration,
                thumbnail=response_obj.thumbnail,
                backend=response_obj.backend,
                query=response_obj.query,
                track_url=audio_info.get("url") if audio_info else None,
            )
            db.add(entry)
            await db.commit()
            await utils._save_api_log("/music/play", request.dict(), response_obj.dict(), db)
        # Anotar metadata de la última agregada si se encoló
        try:
            if response_obj.status == "queued":
                utils._music_manager.annotate_last_added(current_user.id, current_user.nombre, request.query)
            elif response_obj.status == "playing":
                utils._music_manager.annotate_current_track(current_user.id, current_user.nombre, request.query)
        except Exception as e:
            logger.warning(f"No se pudo anotar metadata de la última agregada: {e}")
        


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
        info['history'] = await _get_last_history()
        response_obj = MusicStatusResponse(**info)
        async with get_db() as db:
            await utils._save_api_log("/music/status", {}, response_obj.dict(), db)
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener el estado del módulo de música")

@music_router.put("/seek", response_model=MusicActionResponse)
async def seek_music(request: MusicSeekRequest):
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        result = await utils._music_manager.seek(request.position)
        response_obj = MusicActionResponse(**result)
        async with get_db() as db:
            await utils._save_api_log("/music/seek", request.dict(), response_obj.dict(), db)
        msg = {
            "type": "music_update",
            "status": "playing",
            "current_track": utils._music_manager.get_current_track(),
            "queue": utils._music_manager.get_queue(),
            "last_added": utils._music_manager.get_last_added(),
            "history": await _get_last_history(),
            "position": utils._music_manager.get_position(),
            "duration": utils._music_manager.get_duration(),
        }
        await broadcast(msg)
        await ws_manager.broadcast(json.dumps(msg, ensure_ascii=False))
        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/seek: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al realizar seek")

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


@music_router.get("/now-playing", response_model=MusicNowPlayingResponse)
async def now_playing():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        info = utils._music_manager.get_info()
        current = info.get("current_track")
        if not current:
            data = {
                "status": "idle",
                "queue": utils._music_manager.get_queue(),
                "history": [],
                "position": utils._music_manager.get_position(),
                "duration": utils._music_manager.get_duration(),
            }
            try:
                async with get_db() as db:
                    result_hist = await db.execute(
                        select(MusicPlayLog).order_by(MusicPlayLog.started_at.desc()).limit(3)
                    )
                    logs = result_hist.scalars().all()
                    data["history"] = [
                        {
                            "id": str(l.id),
                            "title": l.title,
                            "uploader": l.uploader,
                            "duration": l.duration,
                            "thumbnail": l.thumbnail,
                            "query": l.query,
                            "started_at": l.started_at.isoformat() if l.started_at else None,
                            "started_by": {"user_id": l.user_id, "username": l.user_name},
                        }
                        for l in logs
                    ]
            except Exception:
                pass

            return MusicNowPlayingResponse(**data)
        async with get_db() as db:
            result = await db.execute(
                select(MusicPlayLog)
                .filter(MusicPlayLog.track_url == current.get("url"))
                .order_by(MusicPlayLog.started_at.desc())
            )
            log = result.scalars().first()
            if not log:
                result = await db.execute(
                    select(MusicPlayLog)
                    .filter(MusicPlayLog.title == current.get("title"))
                    .order_by(MusicPlayLog.started_at.desc())
                )
                log = result.scalars().first()
        backend_name = None
        backend = info.get("backend")
        if isinstance(backend, dict):
            backend_name = backend.get("backend")
        data = {
            "status": "playing",
            "title": current.get("title"),
            "uploader": current.get("uploader"),
            "duration": current.get("duration"),
            "thumbnail": current.get("thumbnail"),
            "backend": backend_name or (log.backend if log else None),
            "query": log.query if log else None,
            "started_at": log.started_at.isoformat() if log and log.started_at else None,
            "started_by": {"user_id": log.user_id, "username": log.user_name} if log else None,
            "queue": utils._music_manager.get_queue(),
            "history": [],
            "position": utils._music_manager.get_position(),
            "duration": utils._music_manager.get_duration(),
        }
        try:
            async with get_db() as db:
                result_hist = await db.execute(
                    select(MusicPlayLog).order_by(MusicPlayLog.started_at.desc()).limit(3)
                )
                logs = result_hist.scalars().all()
                data["history"] = [
                    {
                        "id": str(l.id),
                        "title": l.title,
                        "uploader": l.uploader,
                        "duration": l.duration,
                        "thumbnail": l.thumbnail,
                        "query": l.query,
                        "started_at": l.started_at.isoformat() if l.started_at else None,
                        "started_by": {"user_id": l.user_id, "username": l.user_name},
                    }
                    for l in logs
                ]
        except Exception:
            pass
        


        return MusicNowPlayingResponse(**data)
    except Exception as e:
        logger.error(f"Error en /music/now-playing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener canción actual")

@music_router.post("/previous", response_model=MusicActionResponse)
async def previous_track():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        result = await utils._music_manager.previous()
        response_obj = MusicActionResponse(**result)
        

        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/previous: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al ir a la canción anterior: {e}")

@music_router.post("/next", response_model=MusicActionResponse)
async def next_track():
    if utils._music_manager is None:
        raise HTTPException(status_code=503, detail="El módulo de música está fuera de línea")
    try:
        result = await utils._music_manager.next()
        response_obj = MusicActionResponse(**result)
        

        return response_obj
    except Exception as e:
        logger.error(f"Error en /music/next: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al ir a la siguiente canción: {e}")
async def _get_last_history(limit: int = 3):
    try:
        async with get_db() as db:
            result_hist = await db.execute(
                select(MusicPlayLog).order_by(MusicPlayLog.started_at.desc()).limit(limit)
            )
            logs = result_hist.scalars().all()
            return [
                {
                    "id": str(l.id),
                    "title": l.title,
                    "uploader": l.uploader,
                    "duration": l.duration,
                    "thumbnail": l.thumbnail,
                    "query": l.query,
                    "started_at": l.started_at.isoformat() if l.started_at else None,
                    "started_by": {"user_id": l.user_id, "username": l.user_name},
                }
                for l in logs
            ]
    except Exception:
        return []