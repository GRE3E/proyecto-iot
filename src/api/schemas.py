from pydantic import BaseModel

class StatusResponse(BaseModel):
    """Modelo para el estado del sistema."""
    nlp: str
    stt: str = "OFFLINE"
    speaker: str = "OFFLINE"
    hotword: str = "OFFLINE"
    serial: str = "OFFLINE"
    mqtt: str = "OFFLINE"
    utils: str = "OFFLINE"