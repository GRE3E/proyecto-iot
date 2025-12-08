"""
Face recognition API schemas.
Pydantic models for face recognition-related API requests and responses.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class UserResponse(BaseModel):
    """Response containing user information."""
    
    id: Optional[int] = Field(None, description="User ID (None if not in database)")
    nombre: str = Field(..., description="User name", examples=["Juan Pérez"])
    tiene_speaker_encoding: bool = Field(
        ...,
        description="Whether user has voice encoding registered"
    )
    tiene_face_encoding: bool = Field(
        ...,
        description="Whether user has face encoding registered"
    )

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Response containing authentication tokens."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")


class ResponseModel(BaseModel):
    """General response model for face recognition operations."""
    
    success: bool = Field(..., description="Whether operation was successful")
    message: Optional[str] = Field(None, description="Descriptive result message")
    auth: Optional[AuthResponse] = Field(None, description="Authentication tokens if applicable")


class RecognitionResponse(BaseModel):
    """Response from face recognition operation."""
    
    success: bool = Field(..., description="Whether recognition was successful")
    recognized_users: Optional[List[str]] = Field(None, description="List of recognized users")
    message: Optional[str] = Field(None, description="Error message if recognition failed")
    user_id: Optional[int] = Field(None, description="ID of recognized user")
    auth: Optional[AuthResponse] = Field(None, description="Authentication tokens if user was recognized")

    @field_validator("recognized_users", mode="before")
    @classmethod
    def validate_recognized_users(cls, v):
        """
        Validate and format the list of recognized users.
        
        Args:
            v: Value to validate
            
        Returns:
            List of recognized users
        """
        if v is None:
            return []
        return v if isinstance(v, list) else [v]


class StatusResponse(BaseModel):
    """Response containing system status."""
    
    status: str = Field(..., description="Current system status (online/offline)")
    last_check: datetime = Field(default_factory=datetime.now, description="Timestamp of last check")


class UserListResponse(BaseModel):
    """Response containing list of users."""
    
    users: List[UserResponse] = []