from pydantic import BaseModel

class ContinuousListeningToggle(BaseModel):
    """Modelo para controlar el estado de la escucha continua."""
    enable: bool

class ContinuousListeningResponse(BaseModel):
    """Modelo para la respuesta del estado de la escucha continua."""
    status: str

class SerialCommand(BaseModel):
    """Modelo para enviar comandos al puerto serial."""
    command: str

class SerialCommandResponse(BaseModel):
    """Modelo para la respuesta del comando serial."""
    status: str
    message: str