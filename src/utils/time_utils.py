"""
Función auxiliar para obtener la hora actual basada en coordenadas usando OpenWeatherMap.
"""
from datetime import datetime, timezone, timedelta
import httpx
import logging

logger = logging.getLogger("WeatherUtils")


async def get_current_time_by_coordinates(latitude: float, longitude: float, api_key: str) -> dict:
    """
    Obtiene la hora actual basada en coordenadas usando el timezone offset de OpenWeatherMap.
    
    Args:
        latitude: Latitud geográfica
        longitude: Longitud geográfica
        api_key: API key de OpenWeatherMap
        
    Returns:
        Dict con información de tiempo y zona horaria
    """
    # Obtener datos del clima para extraer el timezone
    params = {
        "lat": latitude,
        "lon": longitude,
        "appid": api_key
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            # Extraer información
            timezone_offset_seconds = data.get("timezone", 0)  # Offset en segundos
            location_name = data.get("name", "Unknown")
            
            # Calcular hora UTC actual
            utc_now = datetime.now(timezone.utc)
            
            # Calcular hora local usando el offset
            local_tz = timezone(timedelta(seconds=timezone_offset_seconds))
            local_time = utc_now.astimezone(local_tz)
            
            # Determinar nombre de zona horaria basado en offset
            hours_offset = timezone_offset_seconds / 3600
            if hours_offset >= 0:
                timezone_name = f"UTC+{int(hours_offset)}"
            else:
                timezone_name = f"UTC{int(hours_offset)}"
            
            return {
                "latitude": latitude,
                "longitude": longitude,
                "timezone_offset_seconds": timezone_offset_seconds,
                "timezone_name": timezone_name,
                "current_time": local_time.isoformat(),
                "utc_time": utc_now.isoformat(),
                "location_name": location_name
            }
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise ValueError("API key de OpenWeatherMap inválida")
        raise
    except Exception as e:
        logger.error(f"Error al obtener hora por coordenadas: {e}")
        raise
