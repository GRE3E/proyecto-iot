from fastapi import APIRouter, HTTPException
from typing import Optional

from ..ai.nlp.nlp_core import NLPModule
from .schemas import NLPQuery, NLPResponse, StatusResponse, AssistantNameUpdate, OwnerNameUpdate

router = APIRouter()
_nlp_module: Optional[NLPModule] = None

def initialize_nlp():
    """Inicializa el módulo NLP."""
    global _nlp_module
    _nlp_module = NLPModule()

@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Devuelve el estado actual de los módulos."""
    if _nlp_module is None:
        return StatusResponse(nlp="OFFLINE")
    return StatusResponse(nlp="ONLINE" if _nlp_module.is_online() else "OFFLINE")

@router.post("/nlp/query", response_model=NLPResponse)
async def query_nlp(query: NLPQuery):
    """Procesa una consulta NLP y devuelve la respuesta generada."""
    if _nlp_module is None or not _nlp_module.is_online():
        raise HTTPException(status_code=503, detail="NLP module is offline")
    
    response = _nlp_module.generate_response(query.prompt)
    if response is None:
        raise HTTPException(status_code=500, detail="Failed to generate response")
    
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
        return StatusResponse(nlp="ONLINE")
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
        return StatusResponse(nlp="ONLINE")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update owner name: {str(e)}")