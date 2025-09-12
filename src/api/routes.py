from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional
from datetime import datetime
import json
from sqlalchemy.orm import Session
from src.ai.nlp.nlp_core import NLPModule
from src.db.database import SessionLocal
from src.db.models import APILog
from .schemas import NLPQuery, NLPResponse, StatusResponse, AssistantNameUpdate, OwnerNameUpdate

router = APIRouter()
_nlp_module: Optional[NLPModule] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _save_api_log(endpoint: str, request_body: dict, response_data: dict, db: Session):
    """Guarda un log de la interacción de la API en la base de datos."""
    log_entry = APILog(
        timestamp=datetime.now(),
        endpoint=endpoint,
        request_body=json.dumps(request_body, ensure_ascii=False),
        response_data=json.dumps(response_data, ensure_ascii=False)
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

def initialize_nlp():
    """Inicializa el módulo NLP."""
    global _nlp_module
    _nlp_module = NLPModule()

@router.get("/status", response_model=StatusResponse)
async def get_status(db: Session = Depends(get_db)):
    """Devuelve el estado actual de los módulos."""
    status = StatusResponse(nlp="ONLINE" if _nlp_module.is_online() else "OFFLINE")
    return status

@router.post("/nlp/query", response_model=NLPResponse)
async def query_nlp(query: NLPQuery, request: Request, db: Session = Depends(get_db)):
    """Procesa una consulta NLP y devuelve la respuesta generada."""
    if _nlp_module is None or not _nlp_module.is_online():
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    response = _nlp_module.generate_response(query.prompt)
    if response is None:
        raise HTTPException(status_code=500, detail="Failed to generate response")
    
    _save_api_log("/nlp/query", query.dict(), NLPResponse(response=response).dict(), db)
    return NLPResponse(response=response)

@router.put("/config/assistant-name", response_model=StatusResponse)
async def update_assistant_name(update: AssistantNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del asistente en la configuración."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    try:
        _nlp_module._config["assistant_name"] = update.name
        _nlp_module._save_config()
        initialize_nlp()
        response_data = StatusResponse(nlp="ONLINE")
        _save_api_log("/config/assistant-name", update.dict(), response_data.dict(), db)
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update assistant name: {str(e)}")

@router.put("/config/owner-name", response_model=StatusResponse)
async def update_owner_name(update: OwnerNameUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre del propietario en la configuración."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    try:
        _nlp_module._config["owner_name"] = update.name
        _nlp_module._save_config()
        initialize_nlp()
        response_data = StatusResponse(nlp="ONLINE")
        _save_api_log("/config/owner-name", update.dict(), response_data.dict(), db)
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update owner name: {str(e)}")