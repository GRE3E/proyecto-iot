import paho.mqtt.client as mqtt
import logging
import asyncio
import threading
import time
from collections import defaultdict

logger = logging.getLogger("MQTTClient")

class MQTTClient:
    def __init__(self, broker: str = "localhost", port: int = 1883, client_id: str = "IoTClient", keepalive: int = 120, session_factory = None, device_manager = None):
        self.broker = broker
        self.port = port
        self.client_id = client_id
        self.keepalive = keepalive
        self.client = mqtt.Client(client_id=self.client_id, protocol=mqtt.MQTTv311)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect

        self.is_connected = False
        self._online_event = asyncio.Event()
        self.subscriptions = defaultdict(list)
        self.subscriptions["iot/system/console"].append(self._log_arduino_console_output)
        self.subscriptions["iot/system/confirmations"].append(self._log_confirmation_output)
        self.subscriptions["iot/sensors/+/status"].append(self._log_arduino_console_output)
        self.loop = asyncio.get_event_loop()

        self.reconnect_delay_sec = 5
        self.max_reconnect_delay_sec = 60
        self.session_factory = session_factory
        self.device_manager = device_manager

    def connect(self):
        logger.info(f"Conectando a broker MQTT {self.broker}:{self.port} ...")
        try:
            self.client.connect(self.broker, self.port, self.keepalive)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"No se pudo conectar al broker MQTT: {e}")
            self._schedule_reconnect()

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"Conectado al broker MQTT {self.broker}:{self.port}")
            self.is_connected = True
            try:
                self.loop.call_soon_threadsafe(self._online_event.set)
                logger.debug("_online_event establecido en _on_connect")
            except Exception:
                pass
            self.reconnect_delay_sec = 5
            for topic in self.subscriptions.keys():
                client.subscribe(topic)
                logger.info(f"Resuscrito automáticamente a {topic}")
        else:
            logger.error(f"Fallo en conexión, código: {rc}")
            self.is_connected = False
            try:
                self.loop.call_soon_threadsafe(self._online_event.clear)
                logger.debug("_online_event borrado en _on_connect (fallo)")
            except Exception:
                pass
            self._schedule_reconnect()

    def _on_disconnect(self, client, userdata, rc):
        self.is_connected = False
        try:
            self.loop.call_soon_threadsafe(self._online_event.clear)
            logger.debug("_online_event borrado en _on_disconnect")
        except Exception:
            pass
        if rc != 0:
            logger.warning(f"Desconexión inesperada (rc={rc}). Intentando reconectar...")
            self._schedule_reconnect()
        else:
            logger.info("Conexión MQTT finalizada por el cliente.")

    def _schedule_reconnect(self):
        delay = min(self.reconnect_delay_sec, self.max_reconnect_delay_sec)
        logger.info(f"Intentando reconectar en {delay} s ...")
        try:
            asyncio.get_event_loop().call_later(delay, self.connect)
        except RuntimeError:
            def _re():
                time.sleep(delay)
                self.connect()
            threading.Thread(target=_re, daemon=True).start()
        self.reconnect_delay_sec = min(self.reconnect_delay_sec * 2, self.max_reconnect_delay_sec)

    async def publish(self, topic: str, payload: str) -> bool:
        if not self.is_connected:
            logger.warning("No conectado, publicación ignorada.")
            return False
        try:
            await asyncio.to_thread(self.client.publish, topic, payload)
            logger.info(f"Publicado en {topic}: {payload}")
            return True
        except Exception as e:
            logger.error(f"Error publicando en {topic}: {e}")
            return False

    def subscribe(self, topic: str, callback) -> bool:
        self.subscriptions[topic].append(callback)
        if self.is_connected:
            try:
                self.client.subscribe(topic)
                logger.info(f"Suscrito a {topic}")
                return True
            except Exception as e:
                logger.error(f"Error al suscribirse: {e}")
        return False

    def unsubscribe(self, topic: str, callback) -> bool:
        if topic in self.subscriptions and callback in self.subscriptions[topic]:
            self.subscriptions[topic].remove(callback)
            if not self.subscriptions[topic]: # Si no quedan callbacks para este tópico, desuscribirse del broker
                if self.is_connected:
                    try:
                        self.client.unsubscribe(topic)
                        logger.info(f"Desuscrito de {topic}")
                        return True
                    except Exception as e:
                        logger.error(f"Error al desuscribirse: {e}")
            return True # Se eliminó la callback, pero puede que queden otras
        return False

    def _on_message(self, client, userdata, msg):
        try:
            device_type, device_name, state_value = self.device_manager._extract_device_info_from_topic(msg.topic, msg.payload.decode())

            if device_name and device_type:
                if self.session_factory and self.device_manager:
                    async def update_state_in_session():
                        async with self.session_factory() as session:
                            await self.device_manager.update_device_state(
                                db=session,
                                device_name=device_name,
                                new_state={"status": state_value},
                                device_type=device_type
                            )
                    asyncio.run(update_state_in_session())
                    logger.info(f"Device state updated for {device_type}/{device_name}: {state_value}")
                else:
                    logger.warning("Database session factory or device manager not available for state update.")

            if msg.topic in self.subscriptions:
                for callback in self.subscriptions[msg.topic]:
                    callback(msg.topic, msg.payload.decode())
            else:
                logger.debug(f"Received message on topic: {msg.topic} with payload: {msg.payload.decode()}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def _log_arduino_console_output(self, topic, payload):
        logger.info(f"Message: {payload}")

    def _log_confirmation_output(self, topic, payload):
        parts = payload.split('|')
        if len(parts) >= 5:
            tipo = parts[0]
            dispositivo = parts[1]
            accion = parts[2]
            resultado = parts[4]
            logger.info(f"Message: Dispositivo: {tipo}_{dispositivo} | Accion: {accion} | Resultado: {resultado}")

    def disconnect(self):
        if self.is_connected:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("Desconectado del broker MQTT.")
