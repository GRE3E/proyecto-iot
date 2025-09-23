from pydantic import BaseModel
from typing import Optional

class HotwordAudioProcessRequest(BaseModel):
    """Modelo para la solicitud de procesamiento de audio de hotword."""
    audio_file: str
    
class HotwordAudioProcessResponse(BaseModel):
    """Modelo para la respuesta del procesamiento de audio de hotword."""
    transcribed_text: str
    identified_speaker: str
    nlp_response: str
    serial_command_identified: Optional[str] = None