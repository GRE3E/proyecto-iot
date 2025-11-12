import os
import logging
from typing import Optional, Dict

logger = logging.getLogger("PromptLoader")

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False
    logger.warning("PyYAML no está instalado. Se usará el prompt de Python como fallback.")

YAML_PATH = os.path.join(os.path.dirname(__file__), "system_prompt.yaml")

def load_system_prompt_template() -> Dict[str, str]:
    """
    Carga el template del system prompt desde YAML si está disponible,
    o desde el módulo Python como fallback.
    """
    yaml_data = _load_from_yaml()
    if yaml_data:
        logger.info("System prompt cargado desde YAML (estructura modular).")
        return yaml_data

    logger.info("Usando fallback: system prompt desde módulo Python.")
    from src.ai.nlp.system_prompt import SYSTEM_PROMPT_TEMPLATE
    return {
        "template": SYSTEM_PROMPT_TEMPLATE,
        "routine_creation_instructions": "" # Fallback for routine creation instructions
    }


def _load_from_yaml() -> Optional[Dict[str, str]]:
    """
    Intenta cargar y ensamblar el template desde el archivo YAML modular.
    """
    if not YAML_AVAILABLE:
        logger.warning("PyYAML no disponible, no se puede leer YAML.")
        return None
    if not os.path.exists(YAML_PATH):
        logger.warning(f"Archivo YAML no encontrado: {YAML_PATH}")
        return None

    try:
        with open(YAML_PATH, "r", encoding="utf-8") as f:
            yaml_data = yaml.safe_load(f)

        sections = yaml_data.get("sections")
        if not sections or not isinstance(sections, dict):
            logger.error("El YAML no contiene una clave 'sections' válida.")
            return None

        # Orden preferido según la estructura actual del YAML
        ordered_keys = [
            "identity",
            "available_commands",
            "the_algorithm",
            "examples",
            "golden_rule",
            "intent_detection",
            "device_context",
            "scheduled_routines_header",
            "routine_creation_instructions_content"
        ]

        combined_parts = []
        routine_creation_instructions_content = ""

        for k in ordered_keys:
            if k in sections:
                combined_parts.append(sections[k])
                if k == "scheduled_routines_header":
                    combined_parts.append("{scheduled_routines_info}")
                elif k == "routine_creation_instructions_content":
                    routine_creation_instructions_content = sections[k] # Store the content
                    combined_parts.append("{routine_creation_instructions}")

        # Incluir cualquier otra sección que exista en el YAML y no esté en ordered_keys
        for key, value in sections.items():
            if key not in ordered_keys:
                combined_parts.append(value)

        combined_prompt = "\n\n".join(combined_parts)

        footer = yaml_data.get("footer")
        if footer:
            combined_prompt += f"\n\n{footer}"

        return {
            "template": combined_prompt.strip(),
            "routine_creation_instructions": routine_creation_instructions_content
        }

    except Exception as e:
        logger.error(f"Error al cargar o parsear system_prompt.yaml: {e}")
        return None
