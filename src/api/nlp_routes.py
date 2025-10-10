from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.api.nlp_schemas import NLPQuery, NLPResponse, AssistantNameUpdate, CapabilitiesUpdate
from src.api.schemas import StatusResponse
import logging
import re

# Importar módulos globales desde utils
from src.api import utils
from src.db.models import User # Importar el modelo User

logger = logging.getLogger("APIRoutes")

nlp_router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@nlp_router.post("/nlp/query", response_model=NLPResponse)
async def query_nlp(query: NLPQuery, request: Request, db: Session = Depends(get_db)):
    """Procesa una consulta NLP y devuelve la respuesta generada."""
    if utils._nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    if not utils._nlp_module.is_online():
        # Intentar reconectar
        try:
            utils._nlp_module.reload()
            if not utils._nlp_module.is_online():
                logger.error("El módulo NLP no se pudo recargar y sigue fuera de línea.")
                raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")
        except Exception as e:
            logger.error(f"Error al recargar módulo NLP para /nlp/query: {e}")
            raise HTTPException(status_code=503, detail=f"El módulo NLP está fuera de línea: {e}")
    
    try:
        user_name = None
        is_owner = False

        if not query.user_id:
            logger.warning("Solicitud recibida sin user_id. Se requiere identificación.")
            return NLPResponse(
                prompt_sent=query.prompt,
                response="Por favor, identifícate para usar esta función.",
                command=None,
                preference_key=None,
                preference_value=None
            )

        if query.user_id:
            identified_user = db.query(User).filter(User.id == query.user_id).first()
            if identified_user:
                db.refresh(identified_user)
                # ✅ CORRECCIÓN: Usar 'nombre' en lugar de 'name'
                user_name = identified_user.nombre
                is_owner = identified_user.is_owner
                logger.info(f"Usuario identificado: {user_name} (ID: {query.user_id}, Owner: {is_owner})")
            else:
                logger.warning(f"Usuario con ID {query.user_id} no encontrado en la base de datos.")

        # ✅ CORRECCIÓN: Pasar user_name e is_owner correctamente
        response = await utils._nlp_module.generate_response(
            query.prompt, 
            user_name=user_name, 
            is_owner=is_owner
        )
        
        # ✅ CORRECCIÓN: Validar respuesta y manejar errores
        if response is None:
            raise HTTPException(status_code=500, detail="No se pudo generar la respuesta")
        
        if isinstance(response, dict) and "error" in response:
            logger.error(f"Error al generar respuesta NLP: {response['error']}")
            raise HTTPException(status_code=500, detail=response['error'])
        
        response_obj = NLPResponse(
            response=response["response"],
            preference_key=response.get("preference_key"),
            preference_value=response.get("preference_value"),
            command=response.get("command"),
            prompt_sent=query.prompt,
            user_name=user_name,
            user_id=query.user_id
        )
        
        # Limpiar cualquier rastro de etiquetas de comando que puedan haber quedado (solo memory_search, name_change, preference_set)
        response_obj.response = re.sub(r"^(memory_search:|name_change:|preference_set:)", "", response_obj.response).strip()
        
        logger.info(f"Consulta NLP procesada exitosamente. Respuesta completa: {response_obj.dict()}")
        
        # ✅ CORRECCIÓN: Manejo seguro de guardado de log
        try:
            utils._save_api_log("/nlp/query", query.dict(), response_obj.dict(), db)
        except Exception as log_error:
            logger.error(f"Error al guardar log de API: {log_error}")
            # No falla el request por error de logging
        
        return response_obj
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado en consulta NLP para /nlp/query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al procesar la consulta NLP: {str(e)}")

@nlp_router.put("/config/assistant-name", response_model=StatusResponse)
async def update_assistant_name(update: AssistantNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del asistente en la configuración."""
    if utils._nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    try:
        utils._nlp_module._config["assistant_name"] = update.name
        utils._nlp_module._save_config()
        logger.info(f"Nombre del asistente actualizado exitosamente a '{update.name}' para /config/assistant-name.")

        
        response_data = utils.get_module_status()
        utils._save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logger.error(f"Error al actualizar nombre del asistente para /config/assistant-name: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar el nombre del asistente: {str(e)}")

@nlp_router.put("/config/capabilities", response_model=StatusResponse)
async def update_capabilities(update: CapabilitiesUpdate, db: Session = Depends(get_db)):
    """Actualiza las capacidades del asistente en la configuración."""
    if utils._nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    try:
        utils._nlp_module._config["capabilities"] = update.capabilities
        utils._nlp_module._save_config()
        logger.info(f"Capacidades del asistente actualizadas exitosamente para /config/capabilities.")

        
        response_data = utils.get_module_status()
        utils._save_api_log("/config/capabilities", update.dict(), response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logger.error(f"Error al actualizar capacidades para /config/capabilities: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar las capacidades: {str(e)}")