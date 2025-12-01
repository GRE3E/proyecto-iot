from typing import Optional, Dict, Any
from pydantic import BaseModel


class CameraInfo(BaseModel):
    id: str
    label: str
    source: str | int
    active: bool
    recognition_enabled: bool


class CameraListResponse(BaseModel):
    cameras: Dict[str, CameraInfo]


class CameraStartRequest(BaseModel):
    recognition_enabled: Optional[bool] = None


class ToggleRecognitionRequest(BaseModel):
    enabled: bool


class SnapshotRecognizeResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    recognized_users: Optional[list[str]] = None
    user_id: Optional[int] = None
    auth: Optional[Dict[str, Any]] = None

