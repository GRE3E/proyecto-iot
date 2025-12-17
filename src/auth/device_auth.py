from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger("DeviceAuth")

load_dotenv()

API_KEY_NAME = "X-Device-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

DEVICE_API_KEY = os.getenv("DEVICE_API_KEY")

if not DEVICE_API_KEY:
    logger.critical("La variable de entorno DEVICE_API_KEY no está configurada.")
    raise ValueError("La variable de entorno DEVICE_API_KEY no está configurada.")

async def get_device_api_key(api_key: str = Security(api_key_header)):
    """
    Dependencia para validar la API Key del dispositivo.
    """
    if api_key == DEVICE_API_KEY:
        logger.info("API Key de dispositivo validada exitosamente.")
        return api_key
    else:
        logger.warning("Intento de acceso no autorizado con API Key de dispositivo inválida.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key de dispositivo inválida",
        )
        