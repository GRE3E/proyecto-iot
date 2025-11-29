"""
Rutas de la API para obtener información del clima.
"""
from fastapi import APIRouter, HTTPException, Query
import logging
from src.api.schemas import WeatherRequest, WeatherResponse, CoordinatesUpdate, CoordinatesResponse
from src.utils.weather_utils import fetch_weather_data, get_stored_coordinates, save_coordinates
import httpx

logger = logging.getLogger("WeatherRoutes")

weather_router = APIRouter()


@weather_router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    latitude: float = Query(..., ge=-90, le=90, description="Latitud geográfica WGS84"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitud geográfica WGS84")
):
    """
    Obtiene datos del clima basado en latitud y longitud.
    
    Utiliza la API de Open-Meteo para obtener:
    - Temperatura actual
    - Pronóstico horario para 7 días
    - Pronóstico diario
    - Código de clima (WMO)
    
    Args:
        latitude: Latitud geográfica (-90 a 90)
        longitude: Longitud geográfica (-180 a 180)
        
    Returns:
        Datos completos del clima incluyendo temperatura, precipitación y pronósticos
    """
    try:
        logger.info(f"Solicitando clima para lat={latitude}, lon={longitude}")
        weather_data = await fetch_weather_data(latitude, longitude)
        return WeatherResponse(**weather_data)
    except ValueError as e:
        logger.error(f"Coordenadas inválidas: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.HTTPError as e:
        logger.error(f"Error al obtener datos del clima: {e}")
        raise HTTPException(status_code=503, detail="Error al conectar con el servicio de clima")
    except Exception as e:
        logger.error(f"Error inesperado al obtener clima: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@weather_router.put("/weather/coordinates", response_model=CoordinatesResponse)
async def update_coordinates(coordinates: CoordinatesUpdate):
    """
    Actualiza las coordenadas guardadas para consultas de clima.
    
    Las coordenadas se almacenan en un archivo JSON y pueden ser utilizadas
    por el endpoint /weather/current para obtener el clima sin especificar
    coordenadas cada vez.
    
    Args:
        coordinates: Objeto con latitud y longitud
        
    Returns:
        Confirmación de coordenadas actualizadas
    """
    try:
        success = save_coordinates(coordinates.latitude, coordinates.longitude)
        
        if not success:
            raise HTTPException(
                status_code=500, 
                detail="Error al guardar las coordenadas"
            )
        
        logger.info(f"Coordenadas actualizadas: lat={coordinates.latitude}, lon={coordinates.longitude}")
        return CoordinatesResponse(
            latitude=coordinates.latitude,
            longitude=coordinates.longitude,
            message="Coordenadas actualizadas exitosamente"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar coordenadas: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@weather_router.get("/weather/current", response_model=WeatherResponse)
async def get_current_weather():
    """
    Obtiene datos del clima usando las coordenadas guardadas previamente.
    
    Este endpoint utiliza las coordenadas almacenadas mediante el endpoint
    PUT /weather/coordinates. Si no hay coordenadas guardadas, retorna un error.
    
    Returns:
        Datos completos del clima para las coordenadas guardadas
    """
    try:
        coordinates = get_stored_coordinates()
        
        if coordinates is None:
            raise HTTPException(
                status_code=404,
                detail="No hay coordenadas guardadas. Use PUT /weather/coordinates primero."
            )
        
        latitude, longitude = coordinates
        logger.info(f"Obteniendo clima para coordenadas guardadas: lat={latitude}, lon={longitude}")
        
        weather_data = await fetch_weather_data(latitude, longitude)
        return WeatherResponse(**weather_data)
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.error(f"Error al obtener datos del clima: {e}")
        raise HTTPException(status_code=503, detail="Error al conectar con el servicio de clima")
    except Exception as e:
        logger.error(f"Error inesperado al obtener clima: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
