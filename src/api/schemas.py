from pydantic import BaseModel

class NLPQuery(BaseModel):
    """Modelo para validar las consultas al módulo NLP."""
    prompt: str

class NLPResponse(BaseModel):
    """Modelo para las respuestas del módulo NLP."""
    response: str

class StatusResponse(BaseModel):
    """Modelo para el estado del sistema."""
    nlp: str