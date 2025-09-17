from pydantic import BaseModel

class ContinuousListeningToggle(BaseModel):
    """Modelo para controlar el estado de la escucha continua."""
    enable: bool

class ContinuousListeningResponse(BaseModel):
    """Modelo para la respuesta del estado de la escucha continua."""
    status: str