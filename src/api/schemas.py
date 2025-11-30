from pydantic import BaseModel, Field
from typing import Any, Dict

class StatusResponse(BaseModel):
    """Modelo para el estado del sistema."""
    nlp: str
    stt: str = "OFFLINE"
    speaker: str = "OFFLINE"
    hotword: str = "OFFLINE"
    mqtt: str = "OFFLINE"
    tts: str = "OFFLINE"
    face_recognition: str = "OFFLINE"
    utils: str = "OFFLINE"


class WeatherRequest(BaseModel):
    """Modelo para solicitud de datos del clima."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitud geográfica WGS84")
    longitude: float = Field(..., ge=-180, le=180, description="Longitud geográfica WGS84")


class WeatherResponse(BaseModel):
    """Modelo para respuesta con datos del clima."""
    latitude: float
    longitude: float
    timezone: str
    current: Dict[str, Any]
    hourly: Dict[str, Any]
    daily: Dict[str, Any]


class CoordinatesUpdate(BaseModel):
    """Modelo para actualización de coordenadas."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitud geográfica WGS84")
    longitude: float = Field(..., ge=-180, le=180, description="Longitud geográfica WGS84")


class CoordinatesResponse(BaseModel):
    """Modelo para respuesta de coordenadas actualizadas."""
    latitude: float
    longitude: float
    message: str


class TimeResponse(BaseModel):
    """Modelo para respuesta de hora basada en coordenadas."""
    latitude: float
    longitude: float
    timezone_offset_seconds: int
    timezone_name: str
    current_time: str
    utc_time: str
    location_name: str