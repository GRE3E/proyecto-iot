import logging
from datetime import datetime
from typing import Any
from src.utils.datetime_utils import get_current_datetime, format_date_human_readable, format_time_only, get_country_from_timezone

logger = logging.getLogger("PromptCreator")

def _safe_format_value(value: Any) -> str:
    """Convierte valores a strings seguros para formateo del system prompt."""
    if value is None:
        return "No disponible"
    if isinstance(value, dict):
        try:
            import json
            json_str = json.dumps(value, ensure_ascii=False)
            return json_str
        except Exception as e:
            logger.error(f"Error serializing dict to JSON: {e}")
            return ", ".join([f"{k}: {_safe_format_value(v)}" for k, v in value.items()])
    if isinstance(value, (list, tuple)):
        try:
            import json
            json_str = json.dumps(value, ensure_ascii=False)
            return json_str
        except Exception as e:
            logger.error(f"Error serializing list/tuple to JSON: {e}")
            return ", ".join([_safe_format_value(item) for item in value])
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, bool):
        return str(value).lower()
    
    result = str(value)
    
    if (result.startswith('{') and result.endswith('}')) or (result.startswith('[') and result.endswith(']')):
        try:
            import json
            json.loads(result)
            return result
        except Exception as e:
            logger.warning(f"Value looks like JSON but could not be parsed: {e}")
            pass
    
    result = result.replace("{", "{{").replace("}", "}}")
    result = ''.join(char for char in result if ord(char) >= 32 or char in '\n\r\t')
    return result

def create_system_prompt(
    config: dict,
    user_name: str,
    is_owner: bool,
    user_permissions_str: str,
    formatted_iot_commands: str,
    iot_command_names: list,
    search_results_str: str,
    user_preferences_dict: dict,
    prompt: str,
    system_prompt_template: str,
    conversation_history: str = ""
) -> tuple[str, str]:
    """
    Crea el system_prompt y el prompt_text para Ollama.
    Valida que el template esté correctamente formado antes de formatear.
    """
    logger.debug("Construyendo system_prompt para Ollama.")
    
    # Valores por defecto
    last_interaction_value = "No hay registro de interacciones previas."
    device_states_value = "No hay estados de dispositivos registrados."
    timezone_str = config.get("timezone", "UTC")
    
    # Obtener fecha/hora/país
    try:
        current_full_datetime = get_current_datetime(timezone_str)
        current_date_formatted = format_date_human_readable(current_full_datetime)
        current_time_formatted = format_time_only(current_full_datetime)
    except Exception as e:
        logger.error(f"Error al obtener datetime: {e}")
        current_date_formatted = "Fecha no disponible"
        current_time_formatted = "Hora no disponible"
    
    try:
        current_country = get_country_from_timezone(timezone_str)
    except Exception as e:
        logger.error(f"Error al obtener país: {e}")
        current_country = "País no disponible"

    # Combinar capabilidades
    all_capabilities = config.get("capabilities", []) + (iot_command_names or [])
    capabilities_str = "\n".join(f"- {cap}" for cap in all_capabilities) if all_capabilities else "No hay capacidades registradas"

    # Preparar valores para formateo
    format_dict = {
        "assistant_name": config.get("assistant_name", "Asistente"),
        "language": config.get("language", "español"),
        "capabilities": capabilities_str,
        "iot_commands": formatted_iot_commands or "No hay comandos IoT disponibles",
        "last_interaction": last_interaction_value,
        "device_states": _safe_format_value(device_states_value),
        "user_preferences": _safe_format_value(user_preferences_dict or {}),
        "identified_speaker": user_name if user_name else "Desconocido",
        "is_owner": str(is_owner).lower(),
        "user_permissions": _safe_format_value(user_permissions_str or "Sin permisos asignados"),
        "current_date": current_date_formatted,
        "current_time": current_time_formatted,
        "current_timezone": timezone_str,
        "search_results": _safe_format_value(search_results_str or "Sin resultados de búsqueda"),
        "current_country": current_country,
        "conversation_history": conversation_history or "Sin historial previo",
    }

    try:
        system_prompt = system_prompt_template.format(**format_dict)
        logger.debug("System_prompt construido correctamente.")
    except KeyError as e:
        logger.error(f"Error: Clave de formato no encontrada en el template: {e}")
        # Fallback: usar template sin formateo si falla
        system_prompt = system_prompt_template
    except Exception as e:
        logger.error(f"Error al formatear system_prompt: {e}")
        system_prompt = system_prompt_template

    prompt_text = f"Usuario: {prompt}"
    
    logger.debug(f"System prompt final (primeros 500 chars):\n{system_prompt[:500]}...")
    
    return system_prompt, prompt_text
    