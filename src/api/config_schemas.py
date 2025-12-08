from pydantic import BaseModel

class AssistantNameUpdate(BaseModel):
    name: str

class TimezoneUpdate(BaseModel):
    timezone: str

class CapabilitiesUpdate(BaseModel):
    capabilities: list[str]



