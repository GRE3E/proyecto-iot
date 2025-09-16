import paho.mqtt.client as mqtt
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MQTTClient:
    def __init__(self, broker: str = "localhost", port: int = 1883, client_id: str = "IoTClient"):
        self.broker = broker
        self.port = port
        self.client_id = client_id
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, self.client_id)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.is_connected = False
        self.subscriptions = {}
        self._connect()

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logging.info(f"MQTTClient: Conectado al broker MQTT en {self.broker}:{self.port}")
            self.is_connected = True
            for topic, callback in self.subscriptions.items():
                client.subscribe(topic)
                logging.info(f"MQTTClient: Resuscrito a {topic}")
        else:
            logging.error(f"MQTTClient: Fallo en la conexión, código: {rc}")
            self.is_connected = False

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = msg.payload.decode()
        logging.info(f"MQTTClient: Mensaje recibido - Tema: {topic}, Payload: {payload}")
        if topic in self.subscriptions:
            self.subscriptions[topic](payload) # Ejecutar el callback registrado

    def _connect(self):
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start() # Iniciar el bucle en un hilo separado
        except Exception as e:
            logging.warning(f"MQTTClient: No se pudo conectar al broker MQTT en {self.broker}:{self.port}: {e}")
            self.is_connected = False

    def publish(self, topic: str, payload: str) -> bool:
        if self.is_connected:
            try:
                self.client.publish(topic, payload)
                logging.info(f"MQTTClient: Publicado en {topic}: {payload}")
                return True
            except Exception as e:
                logging.error(f"MQTTClient: Error al publicar: {e}")
        else:
            logging.warning("MQTTClient: No conectado, no se pudo publicar.")
        return False

    def subscribe(self, topic: str, callback) -> bool:
        if self.is_connected:
            try:
                self.client.subscribe(topic)
                self.subscriptions[topic] = callback
                logging.info(f"MQTTClient: Suscrito a {topic}")
                return True
            except Exception as e:
                logging.error(f"MQTTClient: Error al suscribirse: {e}")
        else:
            logging.warning("MQTTClient: No conectado, no se pudo suscribir.")
        return False

    def unsubscribe(self, topic: str) -> bool:
        if self.is_connected and topic in self.subscriptions:
            try:
                self.client.unsubscribe(topic)
                del self.subscriptions[topic]
                logging.info(f"MQTTClient: Desuscrito de {topic}")
                return True
            except Exception as e:
                logging.error(f"MQTTClient: Error al desuscribirse: {e}")
        return False

    def disconnect(self):
        if self.is_connected:
            self.client.loop_stop()
            self.client.disconnect()
            self.is_connected = False
            logging.info("MQTTClient: Desconectado del broker MQTT.")