from fastapi import APIRouter, HTTPException
from typing import Optional

from ..ai.nlp.nlp_core import NLPModule
from .schemas import NLPQuery, NLPResponse, StatusResponse

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