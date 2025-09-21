from pydantic import BaseModel


class SerialCommand(BaseModel):
    """Modelo para enviar comandos al puerto serial."""
    command: str

class SerialCommandResponse(BaseModel):
    """Modelo para la respuesta del comando serial."""
    status: str
    message: str