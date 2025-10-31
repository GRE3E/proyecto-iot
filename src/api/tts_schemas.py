from pydantic import BaseModel
from typing import List

class TTSTextRequest(BaseModel):
    """Modelo para la solicitud de síntesis de texto a voz.
    Args:
        text (str): El texto a convertir en voz.
    """
    text: str

class TTSAudioResponse(BaseModel):
    """Modelo para la respuesta de síntesis de texto a voz.
    Args:
        audio_file_path (str): Rutas al archivo de audio generado.
    """
    audio_file_paths: List[str]
    