from pydantic import BaseModel

class StatusResponse(BaseModel):
    """Modelo para el estado del sistema."""
    nlp: str
    stt: str = "OFFLINE"
    speaker: str = "OFFLINE"
    hotword: str = "OFFLINE"
    mqtt: str = "OFFLINE"
    tts: str = "OFFLINE"
    face_recognition: str = "OFFLINE"
    utils: str = "OFFLINE"


class MessageResponse(BaseModel):
    message: str
