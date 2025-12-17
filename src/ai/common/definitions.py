from enum import Enum

class Location(str, Enum):
    """Enumeration of all supported physical locations in the home."""
    # Indoor - Common
    LIVING_ROOM = "Sala"
    KITCHEN = "Cocina"
    DINING_ROOM = "Comedor"
    MASTER_BEDROOM = "Dormitorio Principal"
    GUEST_BEDROOM = "Dormitorio de Invitados"
    BATHROOM_MAIN = "Baño Principal"
    BATHROOM_GUEST = "Baño de Invitados"
    HALLWAY = "Pasillo"
    LAUNDRY = "Lavandería"
    STUDY = "Estudio"
    
    # Indoor - Extra
    BASEMENT = "Sótano"
    ATTIC = "Ático"
    OFFICE = "Despacho"
    PLAYROOM = "Sala de Juegos"
    
    # Outdoor
    GARAGE = "Garaje"
    PATIO = "Patio"
    GARDEN = "Jardín"
    BALCONY = "Balcón"
    TERRACE = "Terraza"
    POOL_AREA = "Zona de Piscina"

class DeviceType(str, Enum):
    """Enumeration of all supported IoT device types."""
    LIGHT = "Luz"
    DOOR = "Puerta"
    FAN = "Ventilador"
    CURTAIN = "Cortina"
    AC = "Aire Acondicionado"
    ALARM = "Alarma"
    THERMOSTAT = "Termostato"
    CAMERA = "Cámara"
    SPEAKER = "Altavoz"
    TV = "TV"
    VACUUM = "Aspiradora"
    SOCKET = "Enchufe"

class Action(str, Enum):
    """Enumeration of possible actions on devices."""
    ON = "ON"
    OFF = "OFF"
    OPEN = "OPEN"
    CLOSE = "CLOSE"
    SET_TEMP = "SET_TEMP"
    PLAY = "PLAY"
    PAUSE = "PAUSE"
