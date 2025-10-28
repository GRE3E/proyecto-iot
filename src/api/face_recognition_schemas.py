from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class UserRegistrationRequest(BaseModel):
    """
    Esquema para la solicitud de registro de usuario con reconocimiento facial.
    """
    name: str = Field(
        ...,
        description="Nombre del usuario a registrar",
        min_length=2,
        max_length=50
    )
    video_source: int = Field(
        default=0,
        description="ID de la fuente de video (0 para cámara predeterminada)",
        ge=0
    )

class UserIdentificationRequest(BaseModel):
    """
    Esquema para la solicitud de identificación de usuario.
    """
    video_source: int = Field(
        default=0,
        description="ID de la fuente de video (0 para cámara predeterminada)",
        ge=0
    )

class AddFaceToUserRequest(BaseModel):
    """
    Esquema para añadir reconocimiento facial a un usuario existente.
    """
    user_id: int = Field(
        ...,
        description="ID del usuario en la base de datos",
        gt=0
    )
    video_source: int = Field(
        default=0,
        description="ID de la fuente de video (0 para cámara predeterminada)",
        ge=0
    )

class FaceQualityRequest(BaseModel):
    """
    Esquema para verificar la calidad de una imagen facial.
    """
    image_path: str = Field(
        ...,
        description="Ruta a la imagen facial a verificar"
    )

class RegisteredUser(BaseModel):
    """
    Esquema para la información de un usuario registrado.
    """
    id: int
    nombre: str
    face_encoding: Optional[bytes] = None
    created_at: str
    updated_at: str

class UserListResponse(BaseModel):
    """
    Esquema para la respuesta de listado de usuarios.
    """
    success: bool
    message: str
    users: List[RegisteredUser]

class BaseResponse(BaseModel):
    """
    Esquema base para respuestas de la API.
    """
    success: bool
    message: str

class UserResponse(BaseModel):
    """
    Esquema para la información de un usuario.
    """
    id: int
    name: str
    photos_count: int
    created_at: str
    updated_at: str

class UserRegistrationResponse(BaseResponse):
    """
    Esquema para la respuesta de registro de usuario.
    """
    user: Optional[UserResponse] = None
    photos_taken: Optional[int] = None

class UserDeletionResponse(BaseResponse):
    """
    Esquema para la respuesta de eliminación de usuario.
    """
    user_name: str

class UserRecognitionResponse(BaseResponse):
    """
    Esquema para la respuesta de reconocimiento facial.
    """
    user: Optional[UserResponse] = None
    confidence: Optional[float] = Field(
        None,
        description="Nivel de confianza del reconocimiento (0-1)",
        ge=0.0,
        le=1.0
    )

class UserIdentificationResponse(BaseResponse):
    """
    Esquema para la respuesta de identificación de usuario.
    """
    user: Optional[str] = None

class FaceQualityResponse(BaseResponse):
    """
    Esquema para la respuesta de verificación de calidad facial.
    """
    quality_score: float = Field(
        default=0.0,
        description="Puntuación de calidad de la imagen facial (0-1)",
        ge=0.0,
        le=1.0
    )
