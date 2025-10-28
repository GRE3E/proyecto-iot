from pydantic import BaseModel
from typing import List, Optional


class UserResponse(BaseModel):
    id: int
    nombre: str
    fecha_registro: Optional[str]
    tiene_encoding: bool


class UserRegistrationResponse(BaseModel):
    success: bool
    message: str


class UserDeletionResponse(BaseModel):
    success: bool
    message: str


class UserRecognitionResponse(BaseModel):
    success: bool
    recognized_users: List[str] = []


class UserListResponse(BaseModel):
    users: List[UserResponse] = []