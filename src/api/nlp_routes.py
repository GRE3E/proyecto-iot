from fastapi import APIRouter, HTTPException, Request, Depends
from src.db.database import get_db
from src.api.nlp_schemas import NLPQuery, NLPResponse, AssistantNameUpdate, CapabilitiesUpdate, ConversationHistoryResponse, ConversationLogEntry, MessageResponse
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
    """Actualiza el nombre del asistente en la configuración."""
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
    """Actualiza las capacidades del asistente en la configuración."""
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
    """Recupera el historial de conversación para un usuario específico."""
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
    """Elimina el historial de conversación de un usuario específico."""
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
    """Elimina el historial de conversación de un usuario específico por su ID."""
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


# ============================================================================
# NUEVOS ENDPOINTS PARA MEMORY BRAIN
# ============================================================================

@nlp_router.get("/memory/status", response_model=dict)
async def get_memory_brain_status(
    current_user: User = Depends(get_current_user)
):
    """NUEVO: Obtiene estado de Memory Brain del usuario"""
    try:
        if not utils._nlp_module:
            raise HTTPException(status_code=503, detail="NLP Module no disponible")
        
        if not utils._nlp_module._memory_brain:
            raise HTTPException(status_code=503, detail="Memory Brain no inicializado")
        
        status = await utils._nlp_module.get_memory_brain_status(current_user.id)
        logger.info(f"Status Memory Brain obtenido para usuario {current_user.id}")
        
        async with get_db() as db:
            await utils._save_api_log(
                "/memory/status",
                {"user_id": current_user.id},
                status,
                db
            )
        
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo Memory Brain status: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener Memory Brain status")


@nlp_router.get("/memory/patterns", response_model=dict)
async def get_user_patterns(
    current_user: User = Depends(get_current_user)
):
    """NUEVO: Obtiene patrones detectados en comportamiento del usuario"""
    try:
        if not utils._nlp_module:
            raise HTTPException(status_code=503, detail="NLP Module no disponible")
        
        if not utils._nlp_module._memory_brain:
            raise HTTPException(status_code=503, detail="Memory Brain no inicializado")

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo patrones: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener patrones")


@nlp_router.post("/memory/routine/{routine_id}/confirm", response_model=dict)
async def confirm_routine(
    routine_id: str,
    current_user: User = Depends(get_current_user)
):
    """NUEVO: Confirma una rutina sugerida"""
    try:
        if not utils._nlp_module:
            raise HTTPException(status_code=503, detail="NLP Module no disponible")
        
        if not utils._nlp_module._memory_brain:
            raise HTTPException(status_code=503, detail="Memory Brain no inicializado")

        routine = utils._nlp_module._memory_brain.routine_manager.confirm_routine(routine_id)
        if not routine:
            raise HTTPException(status_code=404, detail="Rutina no encontrada")

        if routine.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tiene permiso para confirmar esta rutina")

        logger.info(f"Rutina confirmada: {routine_id} por usuario {current_user.id}")
        
        response_obj = {
            "message": f"✅ Rutina confirmada: {routine.name}",
            "routine": routine.to_dict()
        }
        
        async with get_db() as db:
            await utils._save_api_log(
                f"/memory/routine/{routine_id}/confirm",
                {"routine_id": routine_id},
                response_obj,
                db
            )
        
        return response_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirmando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error al confirmar rutina")


@nlp_router.post("/memory/routine/{routine_id}/reject", response_model=dict)
async def reject_routine(
    routine_id: str,
    current_user: User = Depends(get_current_user)
):
    """NUEVO: Rechaza una rutina sugerida"""
    try:
        if not utils._nlp_module:
            raise HTTPException(status_code=503, detail="NLP Module no disponible")
        
        if not utils._nlp_module._memory_brain:
            raise HTTPException(status_code=503, detail="Memory Brain no inicializado")

        routine_manager = utils._nlp_module._memory_brain.routine_manager
        routine = routine_manager.routines.get(routine_id)

        if not routine:
            raise HTTPException(status_code=404, detail="Rutina no encontrada")

        if routine.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tiene permiso para rechazar esta rutina")

        routine_manager.reject_routine(routine_id)
        logger.info(f"Rutina rechazada: {routine_id} por usuario {current_user.id}")
        
        response_obj = {"message": "❌ Rutina rechazada y eliminada"}
        
        async with get_db() as db:
            await utils._save_api_log(
                f"/memory/routine/{routine_id}/reject",
                {"routine_id": routine_id},
                response_obj,
                db
            )
        
        return response_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rechazando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error al rechazar rutina")


@nlp_router.post("/memory/routine/{routine_id}/delete", response_model=dict)
async def delete_routine(
    routine_id: str,
    current_user: User = Depends(get_current_user)
):
    """NUEVO: Elimina una rutina confirmada"""
    try:
        if not utils._nlp_module:
            raise HTTPException(status_code=503, detail="NLP Module no disponible")
        
        if not utils._nlp_module._memory_brain:
            raise HTTPException(status_code=503, detail="Memory Brain no inicializado")

        routine_manager = utils._nlp_module._memory_brain.routine_manager
        routine = routine_manager.routines.get(routine_id)

        if not routine:
            raise HTTPException(status_code=404, detail="Rutina no encontrada")

        if routine.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tiene permiso para eliminar esta rutina")

        routine_manager.reject_routine(routine_id)
        logger.info(f"Rutina eliminada: {routine_id} por usuario {current_user.id}")
        
        response_obj = {"message": "🗑️ Rutina eliminada correctamente"}
        
        async with get_db() as db:
            await utils._save_api_log(
                f"/memory/routine/{routine_id}/delete",
                {"routine_id": routine_id},
                response_obj,
                db
            )
        
        return response_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando rutina: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar rutina")