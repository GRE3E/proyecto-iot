from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class NLPQuery(BaseModel):
    prompt: str

class NLPResponse(BaseModel):
    prompt_sent: Optional[str] = None
    response: str
    command: Optional[str] = None
    preference_key: Optional[str] = None
    preference_value: Optional[str] = None
    user_name: Optional[str] = None
    user_id: Optional[int] = None

class AssistantNameUpdate(BaseModel):
    name: str

class TimezoneUpdate(BaseModel):
    timezone: str

class CapabilitiesUpdate(BaseModel):
    capabilities: list[str]

class ConversationLogEntry(BaseModel):
    user_message: str
    assistant_message: str

    class Config:
        from_attributes = True

class ConversationHistoryResponse(BaseModel):
    history: list[ConversationLogEntry]

class MessageResponse(BaseModel):
    message: str

class RoutineCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    trigger: Dict[str, Any]
    trigger_type: str
    command_ids: Optional[List[int]] = None
    enabled: bool = True

class RoutineUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None
    confidence: Optional[float] = None

class RoutineResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    trigger: Dict[str, Any]
    trigger_type: str
    confirmed: bool
    enabled: bool
    confidence: float
    created_at: str
    updated_at: str
    last_executed: Optional[str]
    execution_count: int
    iot_commands: List[str]

    class Config:
        from_attributes = True
        