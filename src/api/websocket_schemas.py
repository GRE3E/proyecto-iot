from pydantic import BaseModel

class WebSocketMessage(BaseModel):
    event: str
    payload: dict
    