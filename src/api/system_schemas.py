from pydantic import BaseModel
from typing import Optional

class ModuleStatusUpdate(BaseModel):
    enabled: bool

class SystemStatusResponse(BaseModel):
    status: str
    uptime_seconds: Optional[float] = None
    memory_usage: Optional[dict] = None
