from pydantic import BaseModel

class NLPQuery(BaseModel):
    """Modelo para validar las consultas al módulo NLP."""
    prompt: str

class NLPResponse(BaseModel):
    """Modelo para las respuestas del módulo NLP."""
    response: str

class AssistantNameUpdate(BaseModel):
    """Modelo para actualizar el nombre del asistente."""
    name: str

class OwnerNameUpdate(BaseModel):
    """Modelo para actualizar el nombre del propietario."""
    name: str