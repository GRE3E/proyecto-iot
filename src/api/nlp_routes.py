from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.api.nlp_schemas import NLPQuery, NLPResponse, AssistantNameUpdate, OwnerNameUpdate
from src.api.schemas import StatusResponse
import logging

# Importar módulos globales desde utils
from src.api import utils

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
        response = await utils._nlp_module.generate_response(query.prompt)
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
        utils.initialize_nlp()
        
        response_data = StatusResponse(
            nlp="ONLINE" if utils._nlp_module and utils._nlp_module.is_online() else "OFFLINE",
            stt="ONLINE" if utils._stt_module and utils._stt_module.is_online() else "OFFLINE",
            speaker="ONLINE" if utils._speaker_module and utils._speaker_module.is_online() else "OFFLINE",
            hotword="ONLINE" if utils._hotword_module and utils._hotword_module.is_online() else "OFFLINE",
            serial="ONLINE" if utils._serial_manager and utils._serial_manager.is_online() else "OFFLINE",
            mqtt="ONLINE" if utils._mqtt_client and utils._mqtt_client.is_online() else "OFFLINE"
        )
        utils._save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al actualizar nombre del asistente: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar el nombre del asistente: {str(e)}")

@nlp_router.put("/config/owner-name", response_model=StatusResponse)
async def update_owner_name(update: OwnerNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del propietario en la configuración."""
    if utils._nlp_module is None:
        raise HTTPException(status_code=503, detail="El módulo NLP no está inicializado")
    
    try:
        utils._nlp_module._config["owner_name"] = update.name
        utils._nlp_module._save_config()
        utils.initialize_nlp()
        
        response_data = StatusResponse(
            nlp="ONLINE" if utils._nlp_module and utils._nlp_module.is_online() else "OFFLINE",
            stt="ONLINE" if utils._stt_module and utils._stt_module.is_online() else "OFFLINE",
            speaker="ONLINE" if utils._speaker_module and utils._speaker_module.is_online() else "OFFLINE",
            hotword="ONLINE" if utils._hotword_module and utils._hotword_module.is_online() else "OFFLINE",
            serial="ONLINE" if utils._serial_manager and utils._serial_manager.is_online() else "OFFLINE",
            mqtt="ONLINE" if utils._mqtt_client and utils._mqtt_client.is_online() else "OFFLINE"
        )
        utils._save_api_log("/config/owner-name", update.dict(), response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al actualizar nombre del propietario: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar el nombre del propietario: {str(e)}")