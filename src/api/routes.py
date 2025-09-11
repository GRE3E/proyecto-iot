from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime
import json
from pathlib import Path

from ..ai.nlp.nlp_core import NLPModule
from .schemas import NLPQuery, NLPResponse, StatusResponse, AssistantNameUpdate, OwnerNameUpdate

router = APIRouter()
_nlp_module: Optional[NLPModule] = None
_api_logs_path = Path(__file__).parent.parent / 'ai' / 'logs' / 'logs_api.json'

def _save_api_log(endpoint: str, request_body: dict, response_data: dict):
    """Guarda un log de la interacción de la API."""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "endpoint": endpoint,
        "request_body": request_body,
        "response_data": response_data
    }
    try:
        with open(_api_logs_path, 'r+', encoding='utf-8') as f:
            logs = json.load(f)
            logs.append(log_entry)
            f.seek(0)
            json.dump(logs, f, indent=2, ensure_ascii=False)
            f.truncate()
    except (FileNotFoundError, json.JSONDecodeError):
        with open(_api_logs_path, 'w', encoding='utf-8') as f:
            json.dump([log_entry], f, indent=2, ensure_ascii=False)

def initialize_nlp():
    """Inicializa el módulo NLP."""
    global _nlp_module
    _nlp_module = NLPModule()

@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Devuelve el estado actual de los módulos."""
    status = StatusResponse(nlp="ONLINE" if _nlp_module.is_online() else "OFFLINE")
    _save_api_log("/status", {}, status.dict())
    return status

@router.post("/nlp/query", response_model=NLPResponse)
async def query_nlp(query: NLPQuery, request: Request):
    """Procesa una consulta NLP y devuelve la respuesta generada."""
    if _nlp_module is None or not _nlp_module.is_online():
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    response = _nlp_module.generate_response(query.prompt)
    if response is None:
        raise HTTPException(status_code=500, detail="Failed to generate response")
    
    _save_api_log("/nlp/query", query.dict(), NLPResponse(response=response).dict())
    return NLPResponse(response=response)

@router.put("/config/assistant-name", response_model=StatusResponse)
async def update_assistant_name(update: AssistantNameUpdate):
    """Actualiza el nombre del asistente en la configuración."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    try:
        _nlp_module._config["assistant_name"] = update.name
        _nlp_module._save_config()
        _nlp_module.reload()  # Recarga configuración y memoria
        response_data = StatusResponse(nlp="ONLINE")
        _save_api_log("/config/assistant-name", update.dict(), response_data.dict())
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update assistant name: {str(e)}")

@router.put("/config/owner-name", response_model=StatusResponse)
async def update_owner_name(update: OwnerNameUpdate):
    """Actualiza el nombre del propietario en la configuración."""
    if _nlp_module is None:
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    try:
        _nlp_module._config["owner_name"] = update.name
        _nlp_module._save_config()
        _nlp_module.reload()  # Recarga configuración y memoria
        response_data = StatusResponse(nlp="ONLINE")
        _save_api_log("/config/owner-name", update.dict(), response_data.dict())
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update owner name: {str(e)}")