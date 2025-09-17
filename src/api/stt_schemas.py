from pydantic import BaseModel

class STTRequest(BaseModel):
    """Modelo para la solicitud de transcripción de audio."""
    audio_path: str

class STTResponse(BaseModel):
    """Modelo para la respuesta de transcripción de audio."""
    text: str