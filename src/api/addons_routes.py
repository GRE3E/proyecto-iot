from fastapi import APIRouter, Depends, HTTPException
from src.ai.nlp.core.nlp_core import NLPModule
from src.ai.nlp.core.ollama_manager import OllamaManager
from src.api.addons_schemas import TimezoneUpdate
import logging
from src.ai.nlp.config.config_manager import ConfigManager
from pathlib import Path

logger = logging.getLogger("APIRoutes")

router = APIRouter()

def get_nlp_module():
    project_root = Path(__file__).parent.parent.parent
    config_path = project_root / "config" / "config.json"
    config_manager = ConfigManager(config_path)
    model_config = config_manager.get_config()["model"]
    ollama_manager = OllamaManager(model_config)
    return NLPModule(ollama_manager, config_manager)

@router.put("/timezone")
async def update_timezone(timezone_update: TimezoneUpdate, nlp_module: NLPModule = Depends(get_nlp_module)):
    """Actualiza la zona horaria de la configuración del asistente."""
    try:
        nlp_module._config_manager.update_config({"timezone": timezone_update.timezone})
        await nlp_module.reload()
        logger.info(f"Zona horaria actualizada exitosamente a {timezone_update.timezone} para /addons/timezone.")
        return {"message": f"Zona horaria actualizada a {timezone_update.timezone}"}
    except Exception as e:
        logger.error(f"Error al actualizar la zona horaria para /addons/timezone: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar la zona horaria: {e}")
        