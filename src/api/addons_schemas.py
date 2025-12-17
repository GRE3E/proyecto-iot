from pydantic import BaseModel

class TimezoneUpdate(BaseModel):
    timezone: str