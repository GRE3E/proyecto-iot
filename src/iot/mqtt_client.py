import paho.mqtt.client as mqtt
import logging
import time
import random

logger = logging.getLogger("MQTTClient")

class MQTTClient:
    def __init__(self, broker: str = "localhost", port: int = 1883, client_id: str = "IoTClient"):
        self.broker = broker
        self.port = port
        self.client_id = client_id
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, self.client_id)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect # Añadir callback de desconexión
        self.is_connected = False
        self.subscriptions = {}
        self.reconnect_delay_sec = 5 # Retardo inicial para la reconexión
        self.max_reconnect_delay_sec = 60 # Retardo máximo para la reconexión

    def connect(self):
        if self.is_connected:
            logger.info(f"Ya conectado al broker MQTT en {self.broker}:{self.port}")
            return
        try:
            logger.info(f"Intentando conectar al broker MQTT en {self.broker}:{self.port}...")
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start() # Iniciar el bucle en un hilo separado
            # is_connected se establecerá en _on_connect
        except Exception as e:
            logger.warning(f"No se pudo conectar al broker MQTT en {self.broker}:{self.port}: {e}")
            self.is_connected = False
            self._schedule_reconnect()

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"Conectado al broker MQTT en {self.broker}:{self.port}")
            self.is_connected = True
            self.reconnect_delay_sec = 5 # Resetear el retardo al conectar exitosamente
            for topic, callback in self.subscriptions.items():
                client.subscribe(topic)
                logger.info(f"MQTTClient: Resuscrito a {topic}")
        else:
            logger.error(f"Fallo en la conexión, código: {rc}")
            self.is_connected = False
            self._schedule_reconnect()

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = msg.payload.decode()
        logger.info(f"Mensaje recibido - Tema: {topic}, Payload: {payload}")
        if topic in self.subscriptions:
            self.subscriptions[topic](payload) # Ejecutar el callback registrado

    def _on_disconnect(self, client, userdata, rc):
        self.is_connected = False
        if rc != 0:
            logger.warning(f"Desconexión inesperada del broker MQTT. Código: {rc}. Intentando reconectar...")
            self._schedule_reconnect()
        else:
            logger.info("Desconectado del broker MQTT.")

    def _schedule_reconnect(self):
        delay = min(self.reconnect_delay_sec, self.max_reconnect_delay_sec)
        logger.info(f"Intentando reconectar en {delay} segundos...")
        time.sleep(delay)
        self.reconnect_delay_sec = min(self.reconnect_delay_sec * 2, self.max_reconnect_delay_sec) # Aumentar el retardo exponencialmente
        self.connect()

    def publish(self, topic: str, payload: str) -> bool:
        if self.is_connected:
            try:
                self.client.publish(topic, payload)
                logger.info(f"Publicado en {topic}: {payload}")
                return True
            except Exception as e:
                logger.error(f"Error al publicar: {e}")
        else:
            logger.warning("No conectado, no se pudo publicar.")
        return False

    def subscribe(self, topic: str, callback) -> bool:
        if self.is_connected:
            try:
                self.client.subscribe(topic)
                self.subscriptions[topic] = callback
                logger.info(f"Suscrito a {topic}")
                return True
            except Exception as e:
                logger.error(f"Error al suscribirse: {e}")
        else:
            logger.warning("No conectado, no se pudo suscribir.")
        return False

    def unsubscribe(self, topic: str) -> bool:
        if self.is_connected and topic in self.subscriptions:
            try:
                self.client.unsubscribe(topic)
                del self.subscriptions[topic]
                logger.info(f"Desuscrito de {topic}")
                return True
            except Exception as e:
                logger.error(f"Error al desuscribirse: {e}")
        return False

    def disconnect(self):
        if self.is_connected:
            self.client.loop_stop()
            self.client.disconnect()
            self.is_connected = False
            logger.info("Desconectado del broker MQTT.")
