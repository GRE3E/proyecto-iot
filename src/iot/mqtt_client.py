import paho.mqtt.client as mqtt
import logging
import asyncio
import threading
import time

logger = logging.getLogger("MQTTClient")

class MQTTClient:
    def __init__(self, broker: str = "localhost", port: int = 1883, client_id: str = "IoTClient", keepalive: int = 120):
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
        self.subscriptions = {}
        self.loop = asyncio.get_event_loop()

        self.reconnect_delay_sec = 5
        self.max_reconnect_delay_sec = 60

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
        self.subscriptions[topic] = callback
        if self.is_connected:
            try:
                self.client.subscribe(topic)
                logger.info(f"Suscrito a {topic}")
                return True
            except Exception as e:
                logger.error(f"Error al suscribirse: {e}")
        return False

    def _on_message(self, client, userdata, msg):
        topic, payload = msg.topic, msg.payload.decode(errors="ignore")
        logger.info(f"Mensaje recibido: {topic} → {payload}")
        if topic in self.subscriptions:
            try:
                self.subscriptions[topic](payload)
            except Exception as e:
                logger.error(f"Error en callback de {topic}: {e}")

    def disconnect(self):
        if self.is_connected:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("Desconectado del broker MQTT.")
