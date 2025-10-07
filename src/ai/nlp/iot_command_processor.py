import asyncio
import logging
import re

logger = logging.getLogger("IoTCommandProcessor")
from typing import Optional

from sqlalchemy.orm import Session

from src.db.models import IoTCommand
from src.iot.mqtt_client import MQTTClient
from src.iot.serial_manager import SerialManager


class IoTCommandProcessor:
    def __init__(self, serial_manager: SerialManager, mqtt_client: MQTTClient):
        self._serial_manager = serial_manager
        self._mqtt_client = mqtt_client

    def _parse_preferences(self, preferences_str: str) -> dict:
        preferences = {}
        if preferences_str and preferences_str != "No hay preferencias de usuario registradas.":
            for item in preferences_str.split(", "):
                if ": " in item:
                    key, value = item.split(": ", 1)
                    preferences[key.strip()] = value.strip()
        return preferences

    async def process_iot_command(
        self, db: Session, full_response_content: str, user_preferences_str: str
    ) -> Optional[str]:
        user_preferences = self._parse_preferences(user_preferences_str)
        logger.debug(f"Preferencias del usuario parseadas: {user_preferences}")

        # --- Manejo de comandos IoT ---
        iot_command_match = re.search(r"iot_command:(.+)", full_response_content)
        if iot_command_match:
            command_str = iot_command_match.group(1).strip()
            logger.info(f"Comando IoT detectado: {command_str}")

            # Buscar el comando en la base de datos
            db_command = await asyncio.to_thread(
                lambda: db.query(IoTCommand)
                .filter(IoTCommand.command_name == command_str)
                .first()
            )

            if db_command:
                logger.debug(f"Comando '{command_str}' encontrado en la base de datos. Tipo: {db_command.command_type}")
                
                # Aplicar preferencias si son relevantes
                final_command_value = db_command.command_value
                if "temperature" in user_preferences and "temperature" in db_command.command_name.lower():
                    # Ejemplo: Si el comando es para temperatura y hay una preferencia de temperatura
                    # Esto es un ejemplo, la lógica real dependerá de cómo se formulan los comandos
                    final_command_value = re.sub(r'\d+', user_preferences["temperature"], final_command_value)
                    logger.info(f"Aplicando preferencia de temperatura. Comando modificado a: {final_command_value}")
                elif "light_color" in user_preferences and "light" in db_command.command_name.lower():
                    # Ejemplo: Si el comando es para luz y hay una preferencia de color de luz
                    final_command_value = f"{final_command_value} {user_preferences['light_color']}"
                    logger.info(f"Aplicando preferencia de color de luz. Comando modificado a: {final_command_value}")
                # Añadir más lógica para otras preferencias según sea necesario

                if db_command.command_type == "serial":
                    logger.info(f"Enviando comando serial: {final_command_value}")
                    await self._serial_manager.send_command(
                        final_command_value
                    )
                    return f"Comando serial '{command_str}' ejecutado."
                elif db_command.command_type == "mqtt":
                    topic, payload = final_command_value.split(":", 1)
                    logger.info(
                        f"Publicando mensaje MQTT en tópico '{topic}' con payload '{payload}'"
                    )
                    await self._mqtt_client.publish(topic, payload)
                    return f"Comando MQTT '{command_str}' ejecutado."
                else:
                    logger.warning(
                        f"Tipo de comando IoT desconocido: {db_command.command_type}"
                    )
                    return f"Tipo de comando '{db_command.command_type}' no soportado."
            else:
                logger.warning(f"Comando '{command_str}' no encontrado en la DB.")
                return f"Comando IoT '{command_str}' no reconocido."
        logger.debug("No se detectó ningún comando IoT en la respuesta.")
        return None