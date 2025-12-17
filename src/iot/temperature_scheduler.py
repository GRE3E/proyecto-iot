import asyncio
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.database import get_db
from src.db.models import TemperatureHistory
from src.iot.mqtt_client import MQTTClient
from src.core.config import settings
import json

logger = logging.getLogger("TemperatureScheduler")

class TemperatureScheduler:
    def __init__(self, mqtt_client: MQTTClient, user_id: int = settings.DEFAULT_USER_ID):
        self._is_running = False
        self.mqtt_client = mqtt_client
        self.user_id = user_id

    async def start(self):
        if self._is_running:
            logger.info("El programador de temperatura ya está en ejecución.")
            return

        self._is_running = True
        logger.info("Iniciando el programador de temperatura...")
        asyncio.create_task(self._scheduling_loop())

    async def stop(self):
        if not self._is_running:
            logger.info("El programador de temperatura no está en ejecución.")
            return

        self._is_running = False
        logger.info("Deteniendo el programador de temperatura...")

    async def _scheduling_loop(self) -> None:
        while self._is_running:
            now = datetime.now()
            logger.debug(f"Verificando temperatura a las {now.strftime('%H:%M:%S')}")

            try:
                # Aquí se enviaría el comando MQTT para obtener la temperatura
                # y se esperaría la respuesta. Por ahora, simularemos un valor.
                # El tópico para obtener el estado de la temperatura es "iot/sensors/TEMPERATURA/status/get"
                # y la respuesta se esperaría en un tópico como "iot/sensors/TEMPERATURA/status"

                request_topic = "iot/sensors/TEMPERATURA/status/get"
                response_topic = "iot/sensors/TEMPERATURA/status"
                device_name = "SensorPrincipal" # Asumimos un nombre de dispositivo por defecto

                # Crear un Future para esperar la respuesta MQTT
                response_future = asyncio.Future()

                def message_handler(topic, payload):
                    if topic == response_topic:
                        try:
                            # Asumimos que el payload es un JSON con una clave "temperature"
                            data = json.loads(payload.decode('utf-8'))
                            temperature = data.get("temperature")
                            if temperature is not None:
                                response_future.set_result(float(temperature))
                            else:
                                response_future.set_exception(ValueError("Payload de temperatura no encontrado"))
                        except Exception as e:
                            response_future.set_exception(e)

                # Suscribirse temporalmente al tópico de respuesta
                self.mqtt_client.subscribe(response_topic, message_handler)

                try:
                    # Publicar el mensaje de solicitud
                    await self.mqtt_client.publish(request_topic, "") # El payload puede estar vacío para un GET

                    # Esperar la respuesta con un timeout
                    temperature = await asyncio.wait_for(response_future, timeout=10.0) # Esperar 10 segundos

                    logger.info(f"Temperatura obtenida: {temperature}°C del dispositivo {device_name}")

                    async with get_db() as db:
                        await self._save_temperature_data(db, temperature, device_name)
                        logger.info("Datos de temperatura guardados exitosamente.")

                except asyncio.TimeoutError:
                    logger.error(f"Timeout al esperar la respuesta de temperatura del tópico {response_topic}")
                except Exception as e:
                    logger.error(f"Error al obtener o guardar la temperatura: {e}")
                finally:
                    # Desuscribirse del tópico de respuesta
                    self.mqtt_client.unsubscribe(response_topic, message_handler)

            except Exception as e:
                logger.error(f"Error en el bucle de programación de temperatura: {e}")

            # Esperar 30 minutos antes de la próxima ejecución
            await asyncio.sleep(30 * 60) # 30 minutos * 60 segundos/minuto

    async def _save_temperature_data(self, db: AsyncSession, temperature: float, device_name: str) -> None:
        """
        Guarda los datos de temperatura en la base de datos.
        """
        new_temperature_record = TemperatureHistory(
            user_id=self.user_id,
            temperature=temperature,
            device_name=device_name
        )
        db.add(new_temperature_record)
        await db.commit()
        await db.refresh(new_temperature_record)
        logger.debug(f"Registro de temperatura guardado: {new_temperature_record}")

