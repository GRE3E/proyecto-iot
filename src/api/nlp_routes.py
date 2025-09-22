from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.api.nlp_schemas import NLPQuery, NLPResponse, AssistantNameUpdate, CapabilitiesUpdate
from src.api.schemas import StatusResponse
import logging

# Importar módulos globales desde utils
from src.api import utils
from src.db.models import User # Importar el modelo User

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
                raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")
        except Exception as e:
            logging.error(f"Error al recargar módulo NLP: {e}")
            raise HTTPException(status_code=503, detail="El módulo NLP está fuera de línea")
    
    try:
        identified_user = None
        if query.user_id:
            identified_user = db.query(User).filter(User.id == query.user_id).first()
            if identified_user:
                db.refresh(identified_user)
            if identified_user is None:
                logging.warning(f"Usuario con ID {query.user_id} no encontrado en la base de datos.")

        response = await utils._nlp_module.generate_response(query.prompt, identified_user)
        if response is None:
            raise HTTPException(status_code=500, detail="No se pudo generar la respuesta")
        
        response_obj = NLPResponse(response=response)
        utils._save_api_log("/nlp/query", query.dict(), response_obj.dict(), db)
        return response_obj
        
    except Exception as e:
        logging.error(f"Error en consulta NLP: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar la consulta NLP")

@nlp_router.put("/config/assistant-name", response_model=StatusResponse)
async def update_assistant_name(update: AssistantNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del asistente en la configuración."""
    if utils._nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    try:
        utils._nlp_module._config["assistant_name"] = update.name
        utils._nlp_module._save_config()

        
        response_data = utils.get_module_status()
        utils._save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al actualizar nombre del asistente: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar el nombre del asistente: {str(e)}")

@nlp_router.put("/config/capabilities", response_model=StatusResponse)
async def update_capabilities(update: CapabilitiesUpdate, db: Session = Depends(get_db)):
    """Actualiza las capacidades del asistente en la configuración."""
    if utils._nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    try:
        utils._nlp_module._config["capabilities"] = update.capabilities
        utils._nlp_module._save_config()

        
        response_data = utils.get_module_status()
        utils._save_api_log("/config/capabilities", update.dict(), response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al actualizar capacidades: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudieron actualizar las capacidades: {str(e)}")