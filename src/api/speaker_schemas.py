from pydantic import BaseModel

class SpeakerRegisterRequest(BaseModel):
    """Modelo para la solicitud de registro de hablante."""
    name: str
    audio_file: str # Esto se manejará como UploadFile en el endpoint, pero se define como str para el esquema

class SpeakerIdentifyRequest(BaseModel):
    """Modelo para la solicitud de identificación de hablante."""
    audio_file: str # Esto se manejará como UploadFile en el endpoint, pero se define como str para el esquema

class SpeakerIdentifyResponse(BaseModel):
    """Modelo para la respuesta de identificación de hablante."""
    speaker_name: str