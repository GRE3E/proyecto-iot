"""
Camera API schemas.
Pydantic models for camera-related API requests and responses.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class CameraInfo(BaseModel):
    """Information about a camera."""
    
    id: str = Field(..., description="Unique camera identifier")
    label: str = Field(..., description="Human-readable camera label")
    source: str | int = Field(..., description="Camera source (index or URL)")
    active: bool = Field(..., description="Whether camera is currently active")
    recognition_enabled: bool = Field(..., description="Whether face recognition is enabled")


class CameraListResponse(BaseModel):
    """Response containing list of cameras."""
    
    cameras: Dict[str, CameraInfo] = Field(..., description="Dictionary of cameras by ID")


class CameraStartRequest(BaseModel):
    """Request to start a camera."""
    
    recognition_enabled: Optional[bool] = Field(
        None,
        description="Whether to enable face recognition on this camera"
    )


class SnapshotRecognizeResponse(BaseModel):
    """Response from snapshot and recognize operation."""
    
    success: bool = Field(..., description="Whether operation was successful")
    message: Optional[str] = Field(None, description="Error or status message")
    recognized_users: Optional[list[str]] = Field(None, description="List of recognized user names")
    user_id: Optional[int] = Field(None, description="ID of recognized user")
    auth: Optional[Dict[str, Any]] = Field(None, description="Authentication tokens if user was recognized")

