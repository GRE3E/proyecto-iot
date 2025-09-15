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

class HotwordAudioProcessRequest(BaseModel):
    """Modelo para la solicitud de procesamiento de audio de hotword."""
    audio_file: str # Esto se manejará como UploadFile en el endpoint, pero se define como str para el esquema

class HotwordAudioProcessResponse(BaseModel):
    """Modelo para la respuesta del procesamiento de audio de hotword."""
    transcribed_text: str
    identified_speaker: str
    nlp_response: str

class ContinuousListeningToggle(BaseModel):
    """Modelo para controlar el inicio/parada de la escucha continua."""
    action: str # "start" or "stop"

class ContinuousListeningResponse(BaseModel):
    """Modelo para la respuesta de la escucha continua."""
    status: str
    message: str