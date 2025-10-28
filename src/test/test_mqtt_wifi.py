import asyncio
from src.iot.mqtt_client import MQTTClient

BROKER = "192.168.137.1"
TOPIC = "test/led"

async def main():
    client = MQTTClient(broker=BROKER, port=1883)
    client.connect()
    await asyncio.sleep(1.0)

    def on_status(payload):
        print("[MQTT] Mensaje recibido del ESP:", payload)
    client.subscribe(TOPIC, on_status)

    await asyncio.sleep(2.0)

    print("[TEST] Enviando ON")
    await client.publish(TOPIC, "ON")
    await asyncio.sleep(3.0)

    print("[TEST] Enviando OFF")
    await client.publish(TOPIC, "OFF")
    await asyncio.sleep(3.0)

    print("[TEST] Fin del test.")
    client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
