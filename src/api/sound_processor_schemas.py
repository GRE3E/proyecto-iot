from pydantic import BaseModel

class AudioProcessRequest(BaseModel):
    """Modelo para la solicitud de procesamiento de audio."""
    audio_file: str

class AudioProcessResponse(BaseModel):
    """Modelo para la respuesta de procesamiento de audio."""
    processed_audio_path: str