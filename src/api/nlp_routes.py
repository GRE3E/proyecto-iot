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

    """Procesa una consulta NLP y devuelve la respuesta generada."""

    try:
        response = await utils._nlp_module.generate_response(
            query.prompt,
            user_id=current_user.id,
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

        logger.info(f"Consulta NLP procesada exitosamente. Respuesta completa: {response_obj.dict()}")

        async with get_db() as db:
            try:
                await utils._save_api_log("/nlp/query", query.dict(), response_obj.dict(), db)
            except Exception as log_error:
                logger.error(f"Error al guardar log de API: {log_error}")

        return response_obj

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado en consulta NLP para /nlp/query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al procesar la consulta NLP: {str(e)}")

@nlp_router.put("/config/assistant-name", response_model=StatusResponse)
async def update_assistant_name(update: AssistantNameUpdate):
    """Actualiza el nombre del asistente en la configuración."""
    try:
        await utils._nlp_module.update_assistant_name(update.name)
        logger.info(f"Nombre del asistente actualizado exitosamente a '{update.name}' para /config/assistant-name.")

        response_data = utils.get_module_status()
        async with get_db() as db:
            await utils._save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
        return response_data

    except Exception as e:
        logger.error(f"Error al actualizar nombre del asistente para /config/assistant-name: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar el nombre del asistente: {str(e)}")

@nlp_router.put("/config/capabilities", response_model=StatusResponse)
async def update_capabilities(update: CapabilitiesUpdate):
    """Actualiza las capacidades del asistente en la configuración."""
    try:
        await utils._nlp_module.update_capabilities(update.capabilities)
        logger.info("Capacidades del asistente actualizadas exitosamente para /config/capabilities.")

        response_data = utils.get_module_status()
        async with get_db() as db:
            await utils._save_api_log("/config/capabilities", update.dict(), response_data.dict(), db)
        return response_data

    except Exception as e:
        logger.error(f"Error al actualizar capacidades para /config/capabilities: {e}")
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
                    assistant_message=log.response
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
        logger.error(f"Error al recuperar el historial de conversación para el usuario {current_user.id}: {e}", exc_info=True)
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
        logger.error(f"Error al eliminar el historial de conversación para el usuario {current_user.id}: {e}", exc_info=True)
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
        logger.error(f"Error al eliminar el historial de conversación para el usuario {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al eliminar el historial de conversación: {str(e)}")
