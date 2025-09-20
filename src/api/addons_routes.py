from fastapi import APIRouter, Depends, HTTPException
from src.ai.nlp.nlp_core import NLPModule
from src.api.addons_schemas import TimezoneUpdate

router = APIRouter()

@router.put("/timezone")
async def update_timezone(timezone_update: TimezoneUpdate, nlp_module: NLPModule = Depends(NLPModule)):
    """Actualiza la zona horaria de la configuración del asistente."""
    try:
        nlp_module._config["timezone"] = timezone_update.timezone
        nlp_module._save_config()
        nlp_module.reload()
        return {"message": f"Zona horaria actualizada a {timezone_update.timezone}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar la zona horaria: {e}")