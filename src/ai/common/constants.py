import re

class IoTConstants:
    """Centralized constants for IoT devices and locations."""
    
    DEVICE_TYPES = [
        "luz", "puerta", "ventilador", "actuador"
    ]
    
    LOCATIONS = [
        "garaje", "pasillo", "cocina", "sala", "lavanderia", "lavandería",
        "habitacion", "habitación", "bano", "baño", 
        "principal", "invitados"
    ]

    # Regex pattern for device locations
    # Matches any of the locations, case-insensitive, as a whole word
    DEVICE_LOCATION_REGEX = re.compile(
        r"\b(" + "|".join(LOCATIONS) + r")\b",
        re.IGNORECASE
    )

    # Common negative phrases for intent detection
    NEGATIVE_SENTENCES = [
        "no ", "nunca", "no quiero", "no enciendas", "no abras", 
        "no activar", "no cierre", "no prenda"
    ]
    
    NEGATION_REGEX = re.compile(
        r"\b(" + "|".join(NEGATIVE_SENTENCES) + r")\b",
        re.IGNORECASE
    )
