from pydantic import BaseModel
from typing import Optional

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

class ConversationLogEntry(BaseModel):
    user_message: str
    assistant_message: str

    class Config:
        from_attributes = True

class ConversationHistoryResponse(BaseModel):
    history: list[ConversationLogEntry]