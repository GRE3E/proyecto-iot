from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.db.database import get_db
from src.api.routines_schemas import (
    RoutineCreateRequest, RoutineUpdateRequest, RoutineResponse
)
from src.api.schemas import MessageResponse
from src.auth.auth_service import get_current_user
from src.db.models import User, Routine
import logging
from src.api import utils

logger = logging.getLogger("APIRoutes")

routines_router = APIRouter()

@routines_router.get("/routines", response_model=list[RoutineResponse])
async def get_user_routines(
    confirmed_only: bool = Query(False),
    enabled_only: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routines = await utils._nlp_module._memory_brain.routine_manager.get_user_routines(
                db, 
                current_user.id,
                confirmed_only=confirmed_only,
                enabled_only=enabled_only
            )
            
            response = [RoutineResponse.model_validate(r.to_dict()) for r in routines]
            logger.info(f"Rutinas obtenidas para usuario {current_user.id}: {len(response)} encontradas")
            
            await utils._save_api_log(
                "/routines",
                {"user_id": current_user.id, "confirmed_only": confirmed_only},
                {"count": len(response)},
                db
            )
            return response
    except Exception as e:
        logger.error(f"Error obteniendo rutinas: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo rutinas")

@routines_router.post("/routines", response_model=RoutineResponse)
async def create_routine(
    routine_req: RoutineCreateRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            pattern = dict(routine_req.trigger)
            if 'type' not in pattern and getattr(routine_req, 'trigger_type', None):
                pattern['type'] = routine_req.trigger_type

            routine = await utils._nlp_module._memory_brain.routine_manager.create_routine_from_pattern(
                db,
                current_user.id,
                pattern,
                actions=routine_req.actions,
                command_ids=routine_req.command_ids,
                confirmed=True  # User-created routines are automatically confirmed
            )
            
            routine = await utils._nlp_module._memory_brain.routine_manager.update_routine(
                db,
                routine.id,
                name=routine_req.name,
                description=routine_req.description,
                enabled=routine_req.enabled
            )
            
            logger.info(f"Rutina creada: {routine.name} (ID: {routine.id})")
            
            # Commit all changes
            await db.commit()
            
            # Reload with eager loading to avoid lazy loading errors
            result = await db.execute(
                select(Routine)
                .options(selectinload(Routine.iot_commands))
                .filter(Routine.id == routine.id)
            )
            routine = result.scalars().first()
            
        # Create response OUTSIDE the db context to avoid greenlet issues
        response = RoutineResponse.model_validate(routine.to_dict())
        return response
        
    except Exception as e:
        logger.error(f"Error creando rutina: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@routines_router.get("/routines/{routine_id}", response_model=RoutineResponse)
async def get_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routine = await utils._nlp_module._memory_brain.routine_manager.get_routine_by_id(db, routine_id)
            
            if not routine:
                raise HTTPException(status_code=404, detail="Rutina no encontrada")
            
            if routine.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="No tiene permiso para ver esta rutina")
            
            response = RoutineResponse.model_validate(routine.to_dict())
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo rutina: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo rutina")


@routines_router.put("/routines/{routine_id}", response_model=RoutineResponse)
async def update_routine(
    routine_id: int,
    routine_req: RoutineUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routine = await utils._nlp_module._memory_brain.routine_manager.get_routine_by_id(db, routine_id)
            
            if not routine:
                raise HTTPException(status_code=404, detail="Rutina no encontrada")
            
            if routine.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="No tiene permiso para editar esta rutina")
            
            update_kwargs = {}
            if routine_req.name is not None:
                update_kwargs['name'] = routine_req.name
            if routine_req.description is not None:
                update_kwargs['description'] = routine_req.description
            if routine_req.trigger is not None:
                update_kwargs['trigger'] = routine_req.trigger
            if routine_req.trigger_type is not None and (not update_kwargs.get('trigger') or 'type' not in update_kwargs['trigger']):
                update_kwargs.setdefault('trigger', {})
                update_kwargs['trigger']['type'] = routine_req.trigger_type
            if routine_req.enabled is not None:
                update_kwargs['enabled'] = routine_req.enabled
            if routine_req.confidence is not None:
                update_kwargs['confidence'] = routine_req.confidence
            if routine_req.command_ids is not None:
                update_kwargs['command_ids'] = routine_req.command_ids
            if routine_req.actions is not None:
                update_kwargs['actions'] = routine_req.actions
            
            routine = await utils._nlp_module._memory_brain.routine_manager.update_routine(
                db,
                routine_id,
                **update_kwargs
            )
            
            logger.info(f"Rutina actualizada: {routine.name} (ID: {routine_id})")
            
            response = RoutineResponse.model_validate(routine.to_dict())
            await utils._save_api_log(
                f"/routines/{routine_id}",
                routine_req.dict(),
                response.dict(),
                db
            )
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando rutina")


@routines_router.post("/routines/{routine_id}/execute", response_model=MessageResponse)
async def execute_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routine = await utils._nlp_module._memory_brain.routine_manager.get_routine_by_id(db, routine_id)
            if not routine:
                raise HTTPException(status_code=404, detail="Rutina no encontrada")
            if routine.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="No tiene permiso para ejecutar esta rutina")
            executed = await utils._nlp_module._memory_brain.routine_manager.execute_routine(db, routine_id)
            if executed is None:
                raise HTTPException(status_code=400, detail="Rutina no está confirmada o habilitada")
            response = MessageResponse(message="Rutina ejecutada correctamente")
            await utils._save_api_log(
                f"/routines/{routine_id}/execute",
                {"routine_id": routine_id},
                response.dict(),
                db
            )
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ejecutando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error ejecutando rutina")


@routines_router.delete("/routines/{routine_id}", response_model=MessageResponse)
async def delete_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routine = await utils._nlp_module._memory_brain.routine_manager.get_routine_by_id(db, routine_id)
            
            if not routine:
                raise HTTPException(status_code=404, detail="Rutina no encontrada")
            
            if routine.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="No tiene permiso para eliminar esta rutina")
            
            await utils._nlp_module._memory_brain.routine_manager.delete_routine(db, routine_id)
            
            logger.info(f"Rutina eliminada: ID {routine_id}")
            
            response = MessageResponse(message="Rutina eliminada correctamente")
            await utils._save_api_log(
                f"/routines/{routine_id}",
                {"routine_id": routine_id},
                response.dict(),
                db
            )
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error eliminando rutina")


@routines_router.post("/routines/{routine_id}/confirm", response_model=MessageResponse)
async def confirm_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routine = await utils._nlp_module._memory_brain.routine_manager.get_routine_by_id(db, routine_id)
            
            if not routine:
                raise HTTPException(status_code=404, detail="Rutina no encontrada")
            
            if routine.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="No tiene permiso para confirmar esta rutina")
            
            routine = await utils._nlp_module._memory_brain.routine_manager.confirm_routine(db, routine_id)
            
            logger.info(f"Rutina confirmada: {routine.name} (ID: {routine_id})")
            
            response = MessageResponse(message=f"Rutina confirmada: {routine.name}")
            await utils._save_api_log(
                f"/routines/{routine_id}/confirm",
                {"routine_id": routine_id},
                response.dict(),
                db
            )
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirmando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error confirmando rutina")


@routines_router.post("/routines/{routine_id}/reject", response_model=MessageResponse)
async def reject_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routine = await utils._nlp_module._memory_brain.routine_manager.get_routine_by_id(db, routine_id)
            
            if not routine:
                raise HTTPException(status_code=404, detail="Rutina no encontrada")
            
            if routine.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="No tiene permiso para rechazar esta rutina")
            
            await utils._nlp_module._memory_brain.routine_manager.reject_routine(db, routine_id)
            
            logger.info(f"Rutina rechazada: ID {routine_id}")
            
            response = MessageResponse(message="Rutina rechazada y eliminada")
            await utils._save_api_log(
                f"/routines/{routine_id}/reject",
                {"routine_id": routine_id},
                response.dict(),
                db
            )
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rechazando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error rechazando rutina")


@routines_router.post("/routines/{routine_id}/toggle", response_model=RoutineResponse)
async def toggle_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routine = await utils._nlp_module._memory_brain.routine_manager.get_routine_by_id(db, routine_id)
            
            if not routine:
                raise HTTPException(status_code=404, detail="Rutina no encontrada")
            
            if routine.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="No tiene permiso para modificar esta rutina")
            
            routine = await utils._nlp_module._memory_brain.routine_manager.update_routine(
                db,
                routine_id,
                enabled=not routine.enabled
            )
            
            status = "habilitada" if routine.enabled else "deshabilitada"
            logger.info(f"Rutina {status}: {routine.name}")
            
            response = RoutineResponse.model_validate(routine.to_dict())
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling rutina: {e}")
        raise HTTPException(status_code=500, detail="Error modificando rutina")


@routines_router.post("/routines/suggest", response_model=list[RoutineResponse])
async def suggest_new_routines(
    min_confidence: float = Query(0.5, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            suggested = await utils._nlp_module._memory_brain.suggest_routines(
                db,
                current_user.id,
                min_confidence=min_confidence
            )
            
            # Convertir a dict (iot_commands ya está cargado por selectinload)
            response = [RoutineResponse.model_validate(r.to_dict()) for r in suggested]
            logger.info(f"Se sugirieron {len(response)} rutinas para usuario {current_user.id}")
            
            await utils._save_api_log(
                "/routines/suggest",
                {"user_id": current_user.id, "min_confidence": min_confidence},
                {"count": len(response)},
                db
            )
            return response
    except Exception as e:
        logger.error(f"Error sugiriendo rutinas: {e}")
        raise HTTPException(status_code=500, detail="Error sugiriendo rutinas")
