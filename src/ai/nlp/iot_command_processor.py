import asyncio
import logging
import re
from typing import Optional

from sqlalchemy.orm import Session

from src.db.models import IoTCommand
from src.iot.mqtt_client import MQTTClient
from src.iot.serial_manager import SerialManager


class IoTCommandProcessor:
    def __init__(self, serial_manager: SerialManager, mqtt_client: MQTTClient):
        self._serial_manager = serial_manager
        self._mqtt_client = mqtt_client

    async def process_iot_command(
        self, db: Session, full_response_content: str
    ) -> Optional[str]:
        # --- Manejo de comandos IoT ---
        iot_command_match = re.search(r"iot_command:(.+)", full_response_content)
        if iot_command_match:
            command_str = iot_command_match.group(1).strip()
            logging.info(f"Comando IoT detectado: {command_str}")

            # Buscar el comando en la base de datos
            db_command = await asyncio.to_thread(
                lambda: db.query(IoTCommand)
                .filter(IoTCommand.command_name == command_str)
                .first()
            )

            if db_command:
                if db_command.command_type == "serial":
                    logging.info(
                        f"Enviando comando serial: {db_command.command_value}"
                    )
                    await self._serial_manager.send_command(
                        db_command.command_value
                    )
                    return f"Comando serial '{command_str}' ejecutado."
                elif db_command.command_type == "mqtt":
                    topic, payload = db_command.command_value.split(":", 1)
                    logging.info(
                        f"Publicando mensaje MQTT en tópico '{topic}' con payload '{payload}'"
                    )
                    await self._mqtt_client.publish(topic, payload)
                    return f"Comando MQTT '{command_str}' ejecutado."
                else:
                    logging.warning(
                        f"Tipo de comando IoT desconocido: {db_command.command_type}"
                    )
                    return f"Tipo de comando '{db_command.command_type}' no soportado."
            else:
                logging.warning(f"Comando IoT '{command_str}' no encontrado en la DB.")
                return f"Comando IoT '{command_str}' no reconocido."
        return None