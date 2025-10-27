import logging
from datetime import datetime
from typing import Any
from src.ai.nlp.prompt_loader import load_system_prompt_template
from src.utils.datetime_utils import get_current_datetime, format_date_human_readable, format_time_only, get_country_from_timezone
import re

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
    recent_conversations: list = None
) -> tuple[str, str]:
    """
    Crea el system_prompt y el prompt_text para Ollama.
    """
    logger.debug("Construyendo system_prompt para Ollama.")
    last_interaction_value = "No hay registro de interacciones previas."
    device_states_value = "No hay estados de dispositivos registrados."
    timezone_str = config.get("timezone", "UTC")
    current_full_datetime = get_current_datetime(timezone_str)
    current_date_formatted = format_date_human_readable(current_full_datetime)
    current_time_formatted = format_time_only(current_full_datetime)
    current_country = get_country_from_timezone(timezone_str)

    conversation_history = ""
    if recent_conversations:
        history_items = []
        for conv in recent_conversations:
            history_items.append(f"Usuario: {conv.prompt}")
             
            device_match = re.search(r'/(LIGHT_\w+|DOOR_\w+|TEMP_\w+)/', conv.response)
            device_name = device_match.group(1) if device_match else None
            
            clean_response = re.sub(r'(iot_command|mqtt_publish):[^\s]+', '', conv.response).strip()
            
            if device_name:
                history_items.append(f"Asistente: [Dispositivo: {device_name}] {clean_response}")
            else:
                history_items.append(f"Asistente: {clean_response}")
        conversation_history = "\n".join(history_items[-10:])
    else:
        conversation_history = "No hay historial previo."

    system_prompt_template = load_system_prompt_template()
    
    all_capabilities = config["capabilities"] + iot_command_names
    system_prompt = system_prompt_template.format(
        assistant_name=config["assistant_name"],
        language=config["language"],
        capabilities="\n".join(f"- {cap}" for cap in all_capabilities),
        iot_commands=formatted_iot_commands,
        last_interaction=last_interaction_value,
        device_states=_safe_format_value(device_states_value),
        user_preferences=_safe_format_value(user_preferences_dict),
        identified_speaker=user_name if user_name else "Desconocido",
        is_owner=is_owner,
        user_permissions=_safe_format_value(user_permissions_str),
        current_date=current_date_formatted,
        current_time=current_time_formatted,
        current_timezone=timezone_str,
        search_results=_safe_format_value(search_results_str),
        current_country=current_country,
        conversation_history=conversation_history,
    )
    logger.debug("System_prompt construido correctamente.")

    prompt_text = f"{system_prompt}\n\nUsuario: {prompt}\nAsistente:"
    return system_prompt, prompt_text
    