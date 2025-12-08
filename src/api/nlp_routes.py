from fastapi import APIRouter, HTTPException, Request, Depends
from src.db.database import get_db
from src.api.nlp_schemas import (
    NLPQuery, NLPResponse, ConversationHistoryResponse, ConversationLogEntry
)
from src.api.schemas import MessageResponse
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
        logger.info(f"Respuesta del LLM: '{response_obj.response}'")

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