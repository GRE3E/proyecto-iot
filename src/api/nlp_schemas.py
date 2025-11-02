from pydantic import BaseModel
from typing import Optional

class NLPQuery(BaseModel):
    """Modelo para validar las consultas al módulo NLP."""
    prompt: str
    user_id: Optional[int] = None

class NLPResponse(BaseModel):
    """Modelo para las respuestas del módulo NLP."""
    prompt_sent: Optional[str] = None
    response: str
    command: Optional[str] = None
    preference_key: Optional[str] = None
    preference_value: Optional[str] = None
    user_name: Optional[str] = None
    user_id: Optional[int] = None

class AssistantNameUpdate(BaseModel):
    """Modelo para actualizar el nombre del asistente."""
    name: str

class CapabilitiesUpdate(BaseModel):
    """Modelo para actualizar las capacidades del asistente."""
    capabilities: list[str]

class ConversationLogEntry(BaseModel):
    """Modelo para una entrada individual del log de conversación."""
    user_message: str
    assistant_message: str

    class Config:
        from_attributes = True

class ConversationHistoryResponse(BaseModel):
    """Modelo para la respuesta del historial de conversación."""
    history: list[ConversationLogEntry]

class ConversationHistoryRequest(BaseModel):
    """Modelo para solicitar el historial de conversación."""
    user_id: int
    limit: Optional[int] = 100