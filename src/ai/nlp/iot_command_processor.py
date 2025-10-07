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


    async def process_iot_command(
        self, db: Session, full_response_content: str
    ) -> Optional[str]:
        # --- Manejo de comandos IoT ---
        iot_command_match = re.search(r"iot_command:(.+)", full_response_content)
        if iot_command_match:
            full_command_with_args = iot_command_match.group(1).strip()

            base_command_name = full_command_with_args.split(':', 1)[0]
            logger.info(f"Base comando IoT detectado: {base_command_name}")

            # Buscar el comando en la base de datos
            db_command = await asyncio.to_thread(
                lambda: db.query(IoTCommand)
                .filter(IoTCommand.command_name == base_command_name)
                .first()
            )

            if db_command:
                logger.debug(f"Comando '{base_command_name}' encontrado en la base de datos. Tipo: {db_command.command_type}")
                
                if db_command.command_type == "serial":
                    command_to_send = full_command_with_args
                    logger.info(f"Enviando comando serial: {command_to_send}")
                    await self._serial_manager.send_command(command_to_send)
                    return f"Comando serial '{base_command_name}' ejecutado."
                elif db_command.command_type == "mqtt":
                    try:
                        if ':' in full_command_with_args:
                            mqtt_args = full_command_with_args.split(':', 1)[1]
                            topic, payload = mqtt_args.split(",", 1) 
                        else:
                            raise ValueError("MQTT command missing topic and payload.")

                        logger.info(
                            f"Publicando mensaje MQTT en tópico '{topic}' con payload '{payload}'"
                        )
                        await self._mqtt_client.publish(topic, payload)
                        return f"Comando MQTT '{base_command_name}' ejecutado."
                    except ValueError:
                        logger.error(f"Formato de comando MQTT inválido para '{full_command_with_args}'. Se esperaba 'mqtt_publish:topic,payload'.")
                        return f"Error: Formato de comando MQTT inválido para '{full_command_with_args}'."
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