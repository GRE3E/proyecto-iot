import asyncio
import logging
import re

logger = logging.getLogger("IoTCommandProcessor")
from typing import Optional

from sqlalchemy.orm import Session

from src.db.models import IoTCommand
from src.iot.mqtt_client import MQTTClient


class IoTCommandProcessor:
    def __init__(self, mqtt_client: MQTTClient):
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
                .filter(IoTCommand.name == base_command_name)
                .first()
            )

            if db_command:
                logger.debug(f"Comando '{base_command_name}' encontrado en la base de datos. Tipo: {db_command.command_type}")
                
                if db_command.command_type == "mqtt":
                    try:
                        # Extraer topic y payload del full_command_with_args
                        # Ejemplo: "command_name:topic,payload"
                        parts = full_command_with_args.split(':', 1)
                        if len(parts) < 2:
                            raise ValueError("Formato de comando MQTT inválido. Se esperaba 'command_name:topic,payload'.")
                        
                        mqtt_args = parts[1]
                        topic_payload_parts = mqtt_args.split(",", 1)
                        if len(topic_payload_parts) < 2:
                            raise ValueError("Formato de comando MQTT inválido. Se esperaba 'command_name:topic,payload'.")
                        
                        topic = topic_payload_parts[0].strip()
                        payload = topic_payload_parts[1].strip()

                        logger.info(
                            f"Publicando mensaje MQTT en tópico '{topic}' con payload '{payload}'"
                        )
                        await asyncio.wait_for(self._mqtt_client.publish(topic, payload), timeout=10) # Agregado timeout de 10 segundos
                        return f"Comando MQTT '{base_command_name}' ejecutado."
                    except asyncio.TimeoutError:
                        logger.error(f"Timeout al ejecutar comando MQTT '{base_command_name}'.")
                        return f"Error: Timeout al ejecutar comando MQTT '{base_command_name}'."
                    except ValueError as ve:
                        logger.error(f"Error en el formato del comando MQTT: {ve}. Comando: '{full_command_with_args}'")
                        return f"Error: Formato de comando MQTT inválido para '{full_command_with_args}'."
                    except Exception as e:
                        logger.error(f"Error al ejecutar comando MQTT '{base_command_name}': {e}")
                        return f"Error al ejecutar comando MQTT '{base_command_name}'."
                else:
                    logger.warning(
                        f"Tipo de comando IoT desconocido o no soportado: {db_command.command_type}. Se esperaba 'mqtt'."
                    )
                    return f"Tipo de comando '{db_command.command_type}' no soportado. Solo se admiten comandos MQTT."
            else:
                logger.warning(f"Comando '{base_command_name}' no encontrado en la DB.")
                return f"Comando IoT '{base_command_name}' no reconocido."
        logger.debug("No se detectó ningún comando IoT en la respuesta.")
        return None