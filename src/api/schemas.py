from pydantic import BaseModel

class NLPQuery(BaseModel):
    """Modelo para validar las consultas al módulo NLP."""
    prompt: str

class NLPResponse(BaseModel):
    """Modelo para las respuestas del módulo NLP."""
    response: str

class AssistantNameUpdate(BaseModel):
    """Modelo para actualizar el nombre del asistente."""
    name: str

class OwnerNameUpdate(BaseModel):
    """Modelo para actualizar el nombre del propietario."""
    name: str

class StatusResponse(BaseModel):
    """Modelo para el estado del sistema."""
    nlp: str
    stt: str = "OFFLINE"
    speaker: str = "OFFLINE"

class STTRequest(BaseModel):
    """Modelo para la solicitud de transcripción de audio."""
    audio_path: str

class STTResponse(BaseModel):
    """Modelo para la respuesta de transcripción de audio."""
    text: str

class SpeakerRegisterRequest(BaseModel):
    """Modelo para la solicitud de registro de hablante."""
    name: str
    audio_path: str

class SpeakerIdentifyRequest(BaseModel):
    """Modelo para la solicitud de identificación de hablante."""
    audio_path: str

class SpeakerIdentifyResponse(BaseModel):
    """Modelo para la respuesta de identificación de hablante."""
    speaker_name: str