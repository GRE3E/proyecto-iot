import logging
from typing import Any

logger = logging.getLogger("Device")

class Device:
    def __init__(self, device_id: str, name: str):
        self.device_id = device_id
        self.name = name

    def execute(self, command: str, **kwargs) -> Any:
        raise NotImplementedError("El método execute debe ser implementado por las subclases.")

class Light(Device):
    def __init__(self, device_id: str, name: str, location: str):
        super().__init__(device_id, name)
        self.location = location
        self.state = "off"
        self.brightness = 100

    def execute(self, command: str, **kwargs) -> str:
        if command == "turn_on":
            self.state = "on"
            logging.info(f"Luz {self.name} en {self.location} encendida.")
            return f"Luz {self.name} en {self.location} encendida."
        elif command == "turn_off":
            self.state = "off"
            logging.info(f"Luz {self.name} en {self.location} apagada.")
            return f"Luz {self.name} en {self.location} apagada."
        elif command == "set_brightness":
            brightness = kwargs.get("brightness")
            if isinstance(brightness, int) and 0 <= brightness <= 100:
                self.brightness = brightness
                logging.info(f"Luz {self.name} en {self.location} brillo ajustado a {brightness}%")
                return f"Luz {self.name} en {self.location} brillo ajustado a {brightness}%"
            else:
                logging.warning(f"Brillo inválido para la luz {self.name}: {brightness}")
                return f"Brillo inválido para la luz {self.name}: {brightness}"
        else:
            logging.warning(f"Comando desconocido para la luz {self.name}: {command}")
            return f"Comando desconocido para la luz {self.name}: {command}"

class Door(Device):
    def __init__(self, device_id: str, name: str, location: str):
        super().__init__(device_id, name)
        self.location = location
        self.state = "closed"

    def execute(self, command: str, **kwargs) -> str:
        if command == "open":
            self.state = "open"
            logger.info(f"Puerta {self.name} en {self.location} abierta.")
            return f"Puerta {self.name} en {self.location} abierta."
        elif command == "close":
            self.state = "closed"
            logger.info(f"Puerta {self.name} en {self.location} cerrada.")
            return f"Puerta {self.name} en {self.location} cerrada."
        else:
            logger.warning(f"Comando desconocido para la puerta {self.name}: {command}")
            return f"Comando desconocido para la puerta {self.name}: {command}"

class Sensor(Device):
    def __init__(self, device_id: str, name: str, location: str, sensor_type: str):
        super().__init__(device_id, name)
        self.location = location
        self.sensor_type = sensor_type
        self.value = None

    def execute(self, command: str, **kwargs) -> str:
        if command == "read_value":
            self.value = kwargs.get("value", "N/A")
            logger.info(f"Sensor {self.name} ({self.sensor_type}) en {self.location} leyó: {self.value}")
            return f"Sensor {self.name} ({self.sensor_type}) en {self.location} leyó: {self.value}"
        else:
            logger.warning(f"Comando desconocido para el sensor {self.name}: {command}")
            return f"Comando desconocido para el sensor {self.name}: {command}"
