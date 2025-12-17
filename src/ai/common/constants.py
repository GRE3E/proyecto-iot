import re
from src.ai.common.definitions import Location, DeviceType

class IoTConstants:
    """Centralized constants for IoT devices and locations."""
    
    # Generate lists dynamically from Enums to ensure consistency
    DEVICE_TYPES = [device.value.lower() for device in DeviceType]
    
    # Locations list including normalized versions (unaccented) could be handled here if needed,
    # but for now we take the Enum values directly.
    LOCATIONS = [location.value.lower() for location in Location]

    # Regex pattern for device locations
    # Matches any of the locations, case-insensitive, as a whole word
    # Escaping is important if locations contain special regex characters
    DEVICE_LOCATION_REGEX = re.compile(
        r"\b(" + "|".join(map(re.escape, LOCATIONS)) + r")\b",
        re.IGNORECASE
    )

    # Common negative phrases for intent detection
    NEGATIVE_SENTENCES = [
        "no ", "nunca", "no quiero", "no enciendas", "no abras", 
        "no activar", "no cierre", "no prenda"
    ]
    
    NEGATION_REGEX = re.compile(
        r"\b(" + "|".join(map(re.escape, NEGATIVE_SENTENCES)) + r")\b",
        re.IGNORECASE
    )

