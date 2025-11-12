import logging
import re

logger = logging.getLogger("PromptProcessor")

NEGATION_REGEX = re.compile(r"\b(no |nunca|no quiero|no enciendas|no abras|no activar|no cierre|no prenda)\b")

class PromptProcessor:
    """Procesa y valida prompts del usuario"""
    
    @staticmethod
    def contains_negation(text: str) -> bool:
        """Detecta si el texto contiene negaciones"""
        return bool(NEGATION_REGEX.search(text.lower()))
    
    @staticmethod
    def extract_intent(prompt: str) -> str:
        """Extrae la intención principal del prompt"""
        prompt_lower = prompt.lower()
        intent_keywords = {
            "encender_luz": ["encender", "prende", "enciende", "prender", "luz"],
            "apagar_luz": ["apagar", "apaga", "apaguen", "oscuridad", "oscuro"],
            "abrir_puerta": ["abre", "abrir", "abrimiento", "puerta"],
            "cerrar_puerta": ["cierra", "cerrar", "cierre", "ciérrale", "puerta"],
            "cambiar_temperatura": ["temperatura", "clima", "calor", "frío", "grados"],
            "control_ventilador": ["ventilador", "ventila", "aire"],
            "consulta": ["cuál", "cuáles", "cómo", "dónde", "qué", "quién"],
            "preferencia": ["prefiero", "me gusta", "favorito"]
        }

        for intent, keywords in intent_keywords.items():
            if any(kw in prompt_lower for kw in keywords):
                return intent

        return "accion_general"
    
    @staticmethod
    def should_load_conversation_history(prompt: str) -> bool:
        """Determina si necesita cargar historial basado en palabras clave"""
        keywords = ["recuerda", "dijiste", "antes", "anterior", "que me dijiste", "me contaste", 
                   "lo que dijiste", "mencionaste", "hablamos de", "me dijeron"]
        return any(keyword in prompt.lower() for keyword in keywords)
        