import asyncio
import logging
from src.iot.serial_manager import SerialManager
from typing import Dict, Any

logger = logging.getLogger("SerialReader")

async def start_serial_reading_task(serial_manager: SerialManager, shared_iot_data: Dict[str, Any]):
    """
    Tarea en segundo plano para leer continuamente datos del puerto serial
    y actualizar un diccionario de estado compartido.
    """
    logger.info("Iniciando tarea de lectura serial en segundo plano...")
    while True:
        try:
            if serial_manager.is_connected:
                data = serial_manager.read_data()
                if data:
                    logger.info(f"SerialReader: Datos seriales recibidos: {data}")
                    # Aquí es donde procesarías los datos
                    process_serial_data(data, shared_iot_data)
            await asyncio.sleep(0.1)  # Pequeña pausa para no saturar la CPU
        except asyncio.CancelledError:
            logger.info("Tarea de lectura serial cancelada.")
            break
        except Exception as e:
            logger.error(f"Error en la tarea de lectura serial: {e}")
            await asyncio.sleep(1) # Esperar un poco antes de reintentar

def process_serial_data(data: str, shared_iot_data: Dict[str, Any]):
    """
    Procesa los datos recibidos del serial y actualiza el estado compartido.
    Ejemplos de formatos esperados:
    - CONFIRM:ARDUINO_ID:LIGHT:DEVICE_INDEX:ON
    - DATA:ARDUINO_ID:TEMP_SENSOR:DEVICE_INDEX:25.5
    """
    parts = data.split(':')
    if len(parts) >= 5:
        msg_type = parts[0]
        arduino_id = parts[1]
        device_type = parts[2]
        device_index = parts[3]
        value = parts[4]

        key = f"{arduino_id}_{device_type}_{device_index}"

        if msg_type == "CONFIRM":
            shared_iot_data[key] = {"status": value, "timestamp": asyncio.get_event_loop().time()}
            logger.info(f"Estado actualizado para {key}: {shared_iot_data[key]}")
        elif msg_type == "DATA":
            shared_iot_data[key] = {"value": value, "timestamp": asyncio.get_event_loop().time()}
            logger.info(f"Datos actualizados para {key}: {shared_iot_data[key]}")
        else:
            logger.warning(f"Tipo de mensaje serial no reconocido: {msg_type} en {data}")
    else:
        logger.warning(f"Formato de datos seriales incompleto o incorrecto: {data}")