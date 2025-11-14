from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class MusicPlayRequest(BaseModel):
    query: str = Field(..., example="Nirvana Smells Like Teen Spirit")

class MusicPlayResponse(BaseModel):
    status: str
    title: str
    uploader: Optional[str] = None
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    backend: Optional[str] = None
    query: str

class MusicActionResponse(BaseModel):
    status: str
    success: bool
    backend: Optional[str] = None

class MusicVolumeSetRequest(BaseModel):
    volume: int = Field(..., ge=0, le=100, example=75)

class MusicVolumeResponse(BaseModel):
    volume: int

class MusicStatusResponse(BaseModel):
    status: str
    backend: Optional[Dict[str, Any]] = None
    current_track: Optional[Dict[str, Any]] = None
    volume: int

class MusicConfigResponse(BaseModel):
    music: Dict[str, Any]
    now_playing: Optional[Dict[str, Any]] = None

class MusicConfigUpdateRequest(BaseModel):
    default_volume: Optional[int] = Field(None, ge=0, le=100)
    playback: Optional[str] = Field(None, pattern="^(vlc|mpv)$")
    retries: Optional[int] = Field(None, ge=0, le=10)
    extractor: Optional[str] = None

class MusicNowPlayingResponse(BaseModel):
    status: str
    title: Optional[str] = None
    uploader: Optional[str] = None
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    backend: Optional[str] = None
    query: Optional[str] = None
    started_at: Optional[str] = None
    started_by: Optional[Dict[str, Any]] = None