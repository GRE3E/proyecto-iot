from fastapi import APIRouter, HTTPException, Request, Depends, Query
from src.db.database import get_db
from src.api.nlp_schemas import (
    NLPQuery, NLPResponse, AssistantNameUpdate, CapabilitiesUpdate, 
    ConversationHistoryResponse, ConversationLogEntry, MessageResponse,
    RoutineCreateRequest, RoutineUpdateRequest, RoutineResponse
)
from src.api.schemas import StatusResponse
from src.auth.auth_service import get_current_user
from src.db.models import User
import logging
from src.api import utils

logger = logging.getLogger("APIRoutes")

nlp_router = APIRouter()

@nlp_router.post("/nlp/query", response_model=NLPResponse)
async def query_nlp(
    query: NLPQuery,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="Token de autorización no proporcionado.")
    
    if token.startswith("Bearer "):
        token = token.split(" ")[1]

    try:
        response = await utils._nlp_module.generate_response(
            query.prompt,
            user_id=current_user.id,
            token=token
        )

        if response.get("error"):
            raise HTTPException(status_code=500, detail=response.get("error"))

        response_obj = NLPResponse(
            response=response["response"],
            preference_key=response.get("preference_key"),
            preference_value=response.get("preference_value"),
            command=response.get("command"),
            prompt_sent=query.prompt,
            user_name=response.get("user_name"),
            user_id=current_user.id,
        )

        logger.info("Consulta NLP procesada exitosamente.")

        async with get_db() as db:
            try:
                await utils._save_api_log("/nlp/query", query.dict(), response_obj.dict(), db)
            except Exception as log_error:
                logger.error(f"Error al guardar log de API: {log_error}")

        return response_obj

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado en consulta NLP: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al procesar la consulta NLP: {str(e)}")

@nlp_router.put("/config/assistant-name", response_model=StatusResponse)
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

@nlp_router.put("/config/capabilities", response_model=StatusResponse)
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

@nlp_router.get("/nlp/history", response_model=ConversationHistoryResponse)
async def get_user_conversation_history(
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            logs = await utils._nlp_module.get_conversation_history(db, current_user.id, limit)
            
            response_data = ConversationHistoryResponse(history=[
                ConversationLogEntry(
                    user_message=log.prompt,
                    assistant_message=log.response.split("mqtt_publish:")[0].strip()
                ) for log in logs
            ])
            await utils._save_api_log(
                f"/nlp/history/{current_user.id}",
                {"user_id": current_user.id, "limit": limit},
                response_data.dict(),
                db
            )
            return response_data
    except Exception as e:
        logger.error(f"Error al recuperar el historial de conversación: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al recuperar el historial de conversación: {str(e)}")

@nlp_router.delete("/nlp/history", response_model=MessageResponse)
async def delete_user_conversation_history(
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            await utils._nlp_module.delete_conversation_history(db, current_user.id)
            response_obj = MessageResponse(message="Historial de conversación eliminado exitosamente.")
            await utils._save_api_log(
                f"/nlp/history/{current_user.id}",
                {"user_id": current_user.id},
                response_obj.dict(),
                db
            )
            return response_obj
    except Exception as e:
        logger.error(f"Error al eliminar el historial: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al eliminar el historial de conversación: {str(e)}")

@nlp_router.delete("/nlp/history/{user_id}", response_model=MessageResponse)
async def delete_conversation_history_by_user_id(
    user_id: int,
    current_user: User = Depends(get_current_user)
):
    try:
        if not current_user.is_owner:
            raise HTTPException(status_code=403, detail="Solo los usuarios propietarios pueden eliminar el historial de otros usuarios.")

        async with get_db() as db:
            await utils._nlp_module.delete_conversation_history(db, user_id)
            response_obj = MessageResponse(message=f"Historial de conversación del usuario {user_id} eliminado exitosamente.")
            await utils._save_api_log(
                f"/nlp/history/{user_id}",
                {"user_id": user_id},
                response_obj.dict(),
                db
            )
            return response_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar el historial: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al eliminar el historial de conversación: {str(e)}")


@nlp_router.get("/memory/status", response_model=dict)
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


@nlp_router.get("/memory/patterns", response_model=dict)
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


@nlp_router.get("/routines", response_model=list[RoutineResponse])
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
            
            response = [RoutineResponse.model_validate(r) for r in routines]
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


@nlp_router.post("/routines", response_model=RoutineResponse)
async def create_routine(
    routine_req: RoutineCreateRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        async with get_db() as db:
            routine = await utils._nlp_module._memory_brain.routine_manager.create_routine_from_pattern(
                db,
                current_user.id,
                routine_req.trigger,
                command_ids=routine_req.command_ids,
                confirmed=False
            )
            
            routine = await utils._nlp_module._memory_brain.routine_manager.update_routine(
                db,
                routine.id,
                name=routine_req.name,
                description=routine_req.description,
                enabled=routine_req.enabled
            )
            
            logger.info(f"Rutina creada: {routine.name} (ID: {routine.id})")
            
            response = RoutineResponse.model_validate(routine)
            await utils._save_api_log(
                "/routines",
                routine_req.dict(),
                response.dict(),
                db
            )
            return response
    except Exception as e:
        logger.error(f"Error creando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error creando rutina")


@nlp_router.get("/routines/{routine_id}", response_model=RoutineResponse)
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
            
            response = RoutineResponse.model_validate(routine)
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo rutina: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo rutina")


@nlp_router.put("/routines/{routine_id}", response_model=RoutineResponse)
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
            if routine_req.enabled is not None:
                update_kwargs['enabled'] = routine_req.enabled
            if routine_req.confidence is not None:
                update_kwargs['confidence'] = routine_req.confidence
            
            routine = await utils._nlp_module._memory_brain.routine_manager.update_routine(
                db,
                routine_id,
                **update_kwargs
            )
            
            logger.info(f"Rutina actualizada: {routine.name} (ID: {routine_id})")
            
            response = RoutineResponse.model_validate(routine)
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


@nlp_router.delete("/routines/{routine_id}", response_model=MessageResponse)
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


@nlp_router.post("/routines/{routine_id}/confirm", response_model=MessageResponse)
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


@nlp_router.post("/routines/{routine_id}/reject", response_model=MessageResponse)
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


@nlp_router.post("/routines/{routine_id}/toggle", response_model=RoutineResponse)
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
            
            response = RoutineResponse.model_validate(routine)
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling rutina: {e}")
        raise HTTPException(status_code=500, detail="Error modificando rutina")


@nlp_router.post("/routines/suggest", response_model=list[RoutineResponse])
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
            
            response = [RoutineResponse.model_validate(r) for r in suggested]
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
        