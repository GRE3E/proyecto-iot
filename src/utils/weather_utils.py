"""
Utilidades para obtener información del clima desde Open-Meteo API.
"""
import httpx
import logging
import json
import os
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

logger = logging.getLogger("WeatherUtils")

# Ruta para almacenar las coordenadas
COORDINATES_FILE = Path(__file__).parent.parent.parent / "data" / "coordinates.json"

# URL base de la API de Open-Meteo
OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_weather_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Obtiene datos del clima desde la API de Open-Meteo.
    
    Args:
        latitude: Latitud geográfica WGS84 (-90 a 90)
        longitude: Longitud geográfica WGS84 (-180 a 180)
    
    Returns:
        Dict con los datos del clima obtenidos de la API
        
    Raises:
        httpx.HTTPError: Si hay un error en la petición HTTP
        ValueError: Si las coordenadas son inválidas
    """
    # Validar coordenadas
    if not -90 <= latitude <= 90:
        raise ValueError(f"Latitud inválida: {latitude}. Debe estar entre -90 y 90")
    if not -180 <= longitude <= 180:
        raise ValueError(f"Longitud inválida: {longitude}. Debe estar entre -180 y 180")
    
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
        "hourly": "temperature_2m,precipitation,weather_code,wind_speed_10m",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
        "timezone": "auto",
        "forecast_days": 7
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            logger.info(f"Solicitando datos del clima para lat={latitude}, lon={longitude}")
            response = await client.get(OPEN_METEO_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Datos del clima obtenidos exitosamente para lat={latitude}, lon={longitude}")
            return data
    except httpx.TimeoutException:
        logger.error(f"Timeout al obtener datos del clima para lat={latitude}, lon={longitude}")
        raise httpx.HTTPError("Timeout al conectar con la API de Open-Meteo")
    except httpx.HTTPError as e:
        logger.error(f"Error HTTP al obtener datos del clima: {e}")
        raise


def get_stored_coordinates() -> Optional[Tuple[float, float]]:
    """
    Obtiene las coordenadas almacenadas desde el archivo JSON.
    
    Returns:
        Tupla (latitude, longitude) si existe, None si no hay coordenadas guardadas
    """
    try:
        if COORDINATES_FILE.exists():
            with open(COORDINATES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                latitude = data.get('latitude')
                longitude = data.get('longitude')
                
                if latitude is not None and longitude is not None:
                    logger.info(f"Coordenadas cargadas: lat={latitude}, lon={longitude}")
                    return (float(latitude), float(longitude))
        
        logger.info("No se encontraron coordenadas guardadas")
        return None
    except Exception as e:
        logger.error(f"Error al leer coordenadas guardadas: {e}")
        return None


def save_coordinates(latitude: float, longitude: float) -> bool:
    """
    Guarda las coordenadas en un archivo JSON.
    
    Args:
        latitude: Latitud geográfica WGS84
        longitude: Longitud geográfica WGS84
        
    Returns:
        True si se guardó exitosamente, False en caso contrario
    """
    try:
        # Crear directorio si no existe
        COORDINATES_FILE.parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            "latitude": latitude,
            "longitude": longitude
        }
        
        with open(COORDINATES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Coordenadas guardadas: lat={latitude}, lon={longitude}")
        return True
    except Exception as e:
        logger.error(f"Error al guardar coordenadas: {e}")
        return False
