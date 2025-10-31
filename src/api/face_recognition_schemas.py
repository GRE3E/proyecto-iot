from typing import List, Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

class UserResponse(BaseModel):
    """
    Esquema de respuesta para información de usuario.
    """
    id: Optional[int] = None
    nombre: str = Field(..., description="Nombre del usuario")
    tiene_speaker_encoding: bool = Field(..., description="Indica si el usuario tiene encoding de voz generado")
    tiene_face_encoding: bool = Field(..., description="Indica si el usuario tiene encoding facial generado")

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    """
    Esquema de respuesta para tokens de autenticación.
    """
    access_token: str = Field(..., description="Token de acceso JWT")
    refresh_token: str = Field(..., description="Token de refresco JWT")
    token_type: str = Field("bearer", description="Tipo de token")

class ResponseModel(BaseModel):
    """
    Esquema de respuesta general.
    """
    success: bool = Field(..., description="Indica si la operación fue exitosa")
    message: Optional[str] = Field(None, description="Mensaje descriptivo del resultado")
    auth: Optional[AuthResponse] = Field(None, description="Tokens de autenticación si la operación lo requiere")

class RecognitionResponse(BaseModel):
    """
    Esquema de respuesta para reconocimiento facial.
    """
    success: bool = Field(..., description="Indica si el reconocimiento fue exitoso")
    recognized_users: Optional[List[str]] = Field(None, description="Lista de usuarios reconocidos")
    message: Optional[str] = Field(None, description="Mensaje de error si el reconocimiento falló")
    user_id: Optional[int] = Field(None, description="ID del usuario reconocido")
    auth: Optional[AuthResponse] = Field(None, description="Tokens de autenticación si un usuario fue reconocido")

    @validator("recognized_users", pre=True)
    def validate_recognized_users(cls, v):
        """
        Valida y formatea la lista de usuarios reconocidos.
        """
        if v is None:
            return []
        return v if isinstance(v, list) else [v]

class StatusResponse(BaseModel):
    """
    Esquema de respuesta para el estado del sistema.
    """
    status: str = Field(..., description="Estado actual del sistema (online/offline)")
    last_check: datetime = Field(default_factory=datetime.now, description="Timestamp del último chequeo")

class UserListResponse(BaseModel):
    users: List[UserResponse] = []
    