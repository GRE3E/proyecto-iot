from pydantic import BaseModel
from typing import Optional

class NLPQuery(BaseModel):
    """Modelo para validar las consultas al módulo NLP."""
    prompt: str
    user_id: Optional[int] = None

class NLPResponse(BaseModel):
    """Modelo para las respuestas del módulo NLP."""
    response: str

class AssistantNameUpdate(BaseModel):
    """Modelo para actualizar el nombre del asistente."""
    name: str

class CapabilitiesUpdate(BaseModel):
    """Modelo para actualizar las capacidades del asistente."""
    capabilities: list[str]

class OwnerOnlyCommandsUpdate(BaseModel):
    """Modelo para actualizar los comandos que solo el propietario puede ejecutar."""
    commands: list[str]