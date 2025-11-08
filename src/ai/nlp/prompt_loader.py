import os
import logging
from typing import Optional

logger = logging.getLogger("PromptLoader")

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False
    logger.warning("PyYAML no está instalado. Se usará el prompt de Python como fallback.")

YAML_PATH = os.path.join(os.path.dirname(__file__), "system_prompt.yaml")

def load_system_prompt_template() -> str:
    """
    Carga el template del system prompt desde YAML si está disponible,
    o desde el módulo Python como fallback.
    """
    yaml_template = _load_from_yaml()
    if yaml_template:
        logger.info("System prompt cargado desde YAML (estructura modular).")
        return yaml_template

    logger.info("Usando fallback: system prompt desde módulo Python.")
    from src.ai.nlp.system_prompt import SYSTEM_PROMPT_TEMPLATE
    return SYSTEM_PROMPT_TEMPLATE


def _load_from_yaml() -> Optional[str]:
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
            "critical_examples",
            "golden_rule",
            "intent_detection",
            "device_context",
            "examples"
        ]

        combined_parts = [sections[k] for k in ordered_keys if k in sections]

        # Incluir cualquier otra sección que exista en el YAML y no esté en ordered_keys
        for key, value in sections.items():
            if key not in ordered_keys:
                combined_parts.append(value)

        combined_prompt = "\n\n".join(combined_parts)

        footer = yaml_data.get("footer")
        if footer:
            combined_prompt += f"\n\n{footer}"

        return combined_prompt.strip()

    except Exception as e:
        logger.error(f"Error al cargar o parsear system_prompt.yaml: {e}")
        return None
