from pydantic import BaseModel

class SpeakerRegisterRequest(BaseModel):
    """Modelo para la solicitud de registro de hablante."""
    name: str
    audio_file: str

class SpeakerIdentifyRequest(BaseModel):
    """Modelo para la solicitud de identificación de hablante."""
    audio_file: str

class SpeakerIdentifyResponse(BaseModel):
    """Modelo para la respuesta de identificación de hablante."""
    speaker_name: str | None = None
    user_id: int | None = None
    is_owner: bool | None = None
    needs_registration: bool = False

class UserCharacteristic(BaseModel):
    """Modelo para las características de un usuario."""
    id: int
    name: str
    is_owner: bool

class UserListResponse(BaseModel):
    """Modelo para la respuesta de la lista de usuarios."""
    user_count: int
    users: list[UserCharacteristic]

class SpeakerUpdateOwnerRequest(BaseModel):
    """Modelo para la solicitud de actualización de propietario de hablante."""
    user_id: int
    is_owner: bool

class AddVoiceToUserRequest(BaseModel):
    user_id: int
    