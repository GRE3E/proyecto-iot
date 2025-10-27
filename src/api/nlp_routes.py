from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.database import get_db
from src.api.nlp_schemas import NLPQuery, NLPResponse, AssistantNameUpdate, CapabilitiesUpdate
from src.api.schemas import StatusResponse
import logging
from src.api import utils

logger = logging.getLogger("APIRoutes")

nlp_router = APIRouter()

@nlp_router.post("/nlp/query", response_model=NLPResponse)
async def query_nlp(query: NLPQuery, request: Request):
    """Procesa una consulta NLP y devuelve la respuesta generada."""

    try:
        async with get_db() as db:
            response = await utils._nlp_module.generate_response(
                query.prompt,
                user_id=query.user_id,
                db=db
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
                user_id=query.user_id
            )

            logger.info(f"Consulta NLP procesada exitosamente. Respuesta completa: {response_obj.dict()}")

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
        async with get_db() as db:
            utils._nlp_module.update_assistant_name(db, update.name)
            logger.info(f"Nombre del asistente actualizado exitosamente a '{update.name}' para /config/assistant-name.")

            response_data = utils.get_module_status()
            await utils._save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
            return response_data

    except Exception as e:
        logger.error(f"Error al actualizar nombre del asistente para /config/assistant-name: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar el nombre del asistente: {str(e)}")

@nlp_router.put("/config/capabilities", response_model=StatusResponse)
async def update_capabilities(update: CapabilitiesUpdate):
    """Actualiza las capacidades del asistente en la configuración."""
    try:
        async with get_db() as db:
            utils._nlp_module.update_capabilities(db, update.capabilities)
            logger.info("Capacidades del asistente actualizadas exitosamente para /config/capabilities.")

            response_data = utils.get_module_status()
            await utils._save_api_log("/config/capabilities", update.dict(), response_data.dict(), db)
            return response_data

    except Exception as e:
        logger.error(f"Error al actualizar capacidades para /config/capabilities: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar las capacidades: {str(e)}")