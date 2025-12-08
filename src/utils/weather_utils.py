"""
Utilidades para obtener información del clima desde OpenWeatherMap API.
"""
import httpx
import logging
import os
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env desde la raíz del proyecto de forma explícita
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

logger = logging.getLogger("WeatherUtils")

# Ruta para almacenar las coordenadas
COORDINATES_FILE = Path(__file__).parent.parent.parent / "data" / "coordinates.json"

# OpenWeatherMap API Configuration
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
OPENWEATHERMAP_BASE_URL = "https://api.openweathermap.org/data/2.5"


async def fetch_weather_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Obtiene datos del clima desde OpenWeatherMap API.
    
    Args:
        latitude: Latitud geográfica WGS84 (-90 a 90)
        longitude: Longitud geográfica WGS84 (-180 a 180)
    
    Returns:
        Dict con los datos del clima obtenidos de la API
        
    Raises:
        httpx.HTTPError: Si hay un error en la petición HTTP
        ValueError: Si las coordenadas son inválidas o falta la API key
    """
    # Validar API key
    if not OPENWEATHERMAP_API_KEY:
        raise ValueError(
            "OPENWEATHERMAP_API_KEY no está configurada. "
            "Agrega tu API key en el archivo .env"
        )
    
    # Validar coordenadas
    if not -90 <= latitude <= 90:
        raise ValueError(f"Latitud inválida: {latitude}. Debe estar entre -90 y 90")
    if not -180 <= longitude <= 180:
        raise ValueError(f"Longitud inválida: {longitude}. Debe estar entre -180 y 180")
    
    # Parámetros para la API
    params = {
        "lat": latitude,
        "lon": longitude,
        "appid": OPENWEATHERMAP_API_KEY,
        "units": "metric",  # Celsius
        "lang": "es"  # Respuestas en español
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            logger.info(f"Solicitando datos del clima para lat={latitude}, lon={longitude}")
            
            # Obtener clima actual
            current_response = await client.get(
                f"{OPENWEATHERMAP_BASE_URL}/weather",
                params=params
            )
            current_response.raise_for_status()
            current_data = current_response.json()
            
            # Obtener pronóstico (opcional, 5 días cada 3 horas)
            forecast_response = await client.get(
                f"{OPENWEATHERMAP_BASE_URL}/forecast",
                params=params
            )
            forecast_response.raise_for_status()
            forecast_data = forecast_response.json()
            
            # Formatear respuesta para mantener compatibilidad con el schema existente
            formatted_data = {
                "latitude": latitude,
                "longitude": longitude,
                "timezone": str(current_data.get("timezone", "UTC")),  # Convertir a string
                "current": {
                    "time": current_data.get("dt"),
                    "temperature_2m": current_data["main"]["temp"],
                    "relative_humidity_2m": current_data["main"]["humidity"],
                    "apparent_temperature": current_data["main"]["feels_like"],
                    "weather_code": current_data["weather"][0]["id"],
                    "weather_description": current_data["weather"][0]["description"],
                    "wind_speed_10m": current_data["wind"]["speed"],
                    "pressure": current_data["main"]["pressure"],
                    "visibility": current_data.get("visibility", 0) / 1000,  # convertir a km
                    "clouds": current_data.get("clouds", {}).get("all", 0),
                },
                "hourly": {
                    "time": [item["dt"] for item in forecast_data["list"][:24]],
                    "temperature_2m": [item["main"]["temp"] for item in forecast_data["list"][:24]],
                    "precipitation": [item.get("rain", {}).get("3h", 0) for item in forecast_data["list"][:24]],
                    "weather_code": [item["weather"][0]["id"] for item in forecast_data["list"][:24]],
                    "wind_speed_10m": [item["wind"]["speed"] for item in forecast_data["list"][:24]],
                },
                "daily": _extract_daily_forecast(forecast_data["list"]),
                "_source": "OpenWeatherMap"
            }
            
            logger.info(f"Datos del clima obtenidos exitosamente: {current_data['main']['temp']}°C en {current_data['name']}")
            return formatted_data
            
    except httpx.TimeoutException:
        logger.error(f"Timeout al obtener datos del clima para lat={latitude}, lon={longitude}")
        raise httpx.HTTPError("Timeout al conectar con OpenWeatherMap API")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            logger.error("API key inválida para OpenWeatherMap")
            raise ValueError("API key de OpenWeatherMap inválida. Verifica tu configuración en .env")
        logger.error(f"Error HTTP al obtener datos del clima: {e}")
        raise
    except httpx.HTTPError as e:
        logger.error(f"Error HTTP al obtener datos del clima: {e}")
        raise


def _extract_daily_forecast(forecast_list: list) -> Dict[str, Any]:
    """
    Extrae pronóstico diario del pronóstico cada 3 horas.
    Agrupa por día y calcula min/max.
    """
    from datetime import datetime
    
    daily_data = {}
    
    for item in forecast_list:
        date = datetime.fromtimestamp(item["dt"]).date()
        date_str = date.isoformat()
        
        if date_str not in daily_data:
            daily_data[date_str] = {
                "temp_min": item["main"]["temp_min"],
                "temp_max": item["main"]["temp_max"],
                "precipitation": 0,
                "weather_codes": []
            }
        else:
            daily_data[date_str]["temp_min"] = min(
                daily_data[date_str]["temp_min"],
                item["main"]["temp_min"]
            )
            daily_data[date_str]["temp_max"] = max(
                daily_data[date_str]["temp_max"],
                item["main"]["temp_max"]
            )
        
        # Acumular precipitación
        daily_data[date_str]["precipitation"] += item.get("rain", {}).get("3h", 0)
        daily_data[date_str]["weather_codes"].append(item["weather"][0]["id"])
    
    # Formatear para respuesta
    return {
        "time": list(daily_data.keys())[:7],  # Solo 7 días
        "temperature_2m_max": [daily_data[date]["temp_max"] for date in list(daily_data.keys())[:7]],
        "temperature_2m_min": [daily_data[date]["temp_min"] for date in list(daily_data.keys())[:7]],
        "precipitation_sum": [daily_data[date]["precipitation"] for date in list(daily_data.keys())[:7]],
        "weather_code": [max(set(daily_data[date]["weather_codes"]), 
                            key=daily_data[date]["weather_codes"].count) 
                        for date in list(daily_data.keys())[:7]]
    }


def get_stored_coordinates() -> Optional[Tuple[float, float]]:
    """
    Obtiene las coordenadas almacenadas desde la configuración.
    
    Returns:
        Tupla (latitude, longitude) si existe, None si no hay coordenadas guardadas
    """
    try:
        from pathlib import Path
        from src.ai.nlp.config.config_manager import ConfigManager
        
        project_root = Path(__file__).parent.parent.parent
        config_path = project_root / "config" / "config.json"
        config_manager = ConfigManager(config_path)
        config = config_manager.get_config()
        
        coordinates = config.get('coordinates')
        if coordinates:
            latitude = coordinates.get('latitude')
            longitude = coordinates.get('longitude')
            
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
    Guarda las coordenadas en la configuración.
    
    Args:
        latitude: Latitud geográfica WGS84
        longitude: Longitud geográfica WGS84
        
    Returns:
        True si se guardó exitosamente, False en caso contrario
    """
    try:
        from pathlib import Path
        from src.ai.nlp.config.config_manager import ConfigManager
        
        project_root = Path(__file__).parent.parent.parent
        config_path = project_root / "config" / "config.json"
        config_manager = ConfigManager(config_path)
        
        config_manager.update_config({
            "coordinates": {
                "latitude": latitude,
                "longitude": longitude
            }
        })
        
        logger.info(f"Coordenadas guardadas: lat={latitude}, lon={longitude}")
        return True
    except Exception as e:
        logger.error(f"Error al guardar coordenadas: {e}")
        return False

