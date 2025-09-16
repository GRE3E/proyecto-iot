import unittest
import serial
import paho.mqtt.client as mqtt
from unittest.mock import MagicMock, patch
import time
import os
import sys

# Añadir el directorio raíz del proyecto al PATH para las importaciones
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.iot.serial_manager import SerialManager
from src.iot.mqtt_client import MQTTClient
from src.iot.devices import Light, Door, Sensor

class TestSerialManager(unittest.TestCase):

    @patch('serial.Serial')
    def test_connection_success(self, mock_serial):
        mock_instance = mock_serial.return_value
        manager = SerialManager(port="COM_TEST", baudrate=9600)
        self.assertTrue(manager.is_connected)
        mock_serial.assert_called_with("COM_TEST", 9600, timeout=1)
        self.assertTrue(mock_instance.is_open)

    @patch('serial.Serial', side_effect=serial.SerialException("Test Error"))
    def test_connection_failure(self, mock_serial):
        manager = SerialManager(port="COM_TEST", baudrate=9600)
        self.assertFalse(manager.is_connected)

    @patch('serial.Serial')
    def test_send_command(self, mock_serial):
        mock_instance = mock_serial.return_value
        manager = SerialManager(port="COM_TEST", baudrate=9600)
        manager.send_command("TEST_CMD")
        mock_instance.write.assert_called_with(b"TEST_CMD\n")

    @patch('serial.Serial')
    def test_read_data(self, mock_serial):
        mock_instance = mock_serial.return_value
        mock_instance.in_waiting = 10
        mock_instance.readline.return_value = b"DATA_FROM_ARDUINO\n"
        manager = SerialManager(port="COM_TEST", baudrate=9600)
        data = manager.read_data()
        self.assertEqual(data, "DATA_FROM_ARDUINO")

class TestMQTTClient(unittest.TestCase):

    @patch('paho.mqtt.client.Client')
    def test_connect_success(self, mock_mqtt_client):
        mock_instance = mock_mqtt_client.return_value
        client = MQTTClient(broker="localhost", port=1883)
        # Simular la llamada a on_connect
        client._on_connect(mock_instance, None, None, 0)
        self.assertTrue(client.is_connected)
        mock_instance.connect.assert_called_with("localhost", 1883, 60)
        mock_instance.loop_start.assert_called_once()

    @patch('paho.mqtt.client.Client')
    def test_publish(self, mock_mqtt_client):
        mock_instance = mock_mqtt_client.return_value
        client = MQTTClient(broker="localhost", port=1883)
        client._on_connect(mock_instance, None, None, 0) # Simular conexión
        client.publish("test/topic", "test_payload")
        mock_instance.publish.assert_called_with("test/topic", "test_payload")

    @patch('paho.mqtt.client.Client')
    def test_subscribe_and_message(self, mock_mqtt_client):
        mock_instance = mock_mqtt_client.return_value
        client = MQTTClient(broker="localhost", port=1883)
        client._on_connect(mock_instance, None, None, 0) # Simular conexión

        mock_callback = MagicMock()
        client.subscribe("test/topic", mock_callback)
        mock_instance.subscribe.assert_called_with("test/topic")

        # Simular la recepción de un mensaje
        mock_msg = MagicMock()
        mock_msg.topic = "test/topic"
        mock_msg.payload = b"MQTT_MESSAGE"
        client._on_message(mock_instance, None, mock_msg)
        mock_callback.assert_called_with("MQTT_MESSAGE")

class TestDevices(unittest.TestCase):

    def test_light_device(self):
        light = Light("light001", "Sala", "Sala de Estar")
        self.assertEqual(light.state, "off")
        self.assertEqual(light.brightness, 100)

        response = light.execute("turn_on")
        self.assertEqual(light.state, "on")
        self.assertIn("encendida", response)

        response = light.execute("set_brightness", brightness=50)
        self.assertEqual(light.brightness, 50)
        self.assertIn("brillo ajustado a 50%", response)

        response = light.execute("turn_off")
        self.assertEqual(light.state, "off")
        self.assertIn("apagada", response)

    def test_door_device(self):
        door = Door("door001", "Principal", "Entrada")
        self.assertEqual(door.state, "closed")

        response = door.execute("open")
        self.assertEqual(door.state, "open")
        self.assertIn("abierta", response)

        response = door.execute("close")
        self.assertEqual(door.state, "closed")
        self.assertIn("cerrada", response)

    def test_sensor_device(self):
        sensor = Sensor("sensor001", "Temperatura", "Cocina", "temperature")
        self.assertIsNone(sensor.value)

        response = sensor.execute("read_value", value=25.5)
        self.assertEqual(sensor.value, 25.5)
        self.assertIn("leyó: 25.5", response)

if __name__ == '__main__':
    unittest.main()