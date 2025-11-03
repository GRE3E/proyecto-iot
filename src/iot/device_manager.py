import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.db.models import DeviceState
from src.api.iot_schemas import DeviceStateCreate
import json

logger = logging.getLogger("DeviceManager")

async def get_device_state(db: AsyncSession, device_name: str) -> DeviceState | None:
    """
    Obtiene el estado actual de un dispositivo por su nombre.
    """
    result = await db.execute(select(DeviceState).filter(DeviceState.device_name == device_name))
    return result.scalars().first()

async def create_device_state(db: AsyncSession, device_state: DeviceStateCreate) -> DeviceState:
    """
    Crea un nuevo registro de estado de dispositivo.
    """
    db_device_state = DeviceState(device_name=device_state.device_name,
                                  device_type=device_state.device_type,
                                  state_json=json.dumps(device_state.state_json))
    db.add(db_device_state)
    await db.commit()
    await db.refresh(db_device_state)
    logger.info(f"Estado de dispositivo creado: {device_state.device_name}")
    return db_device_state

async def update_device_state(db: AsyncSession, device_name: str, new_state: Dict[str, Any], device_type: str | None = None) -> DeviceState | None:
    """
    Actualiza el estado de un dispositivo existente.
    Si el dispositivo no existe, lo crea.
    """
    db_device_state = await get_device_state(db, device_name)
    if db_device_state:
        current_state = json.loads(db_device_state.state_json)
        current_state.update(new_state)
        db_device_state.state_json = json.dumps(current_state)
        if device_type:
            db_device_state.device_type = device_type
        await db.commit()
        await db.refresh(db_device_state)
        logger.info(f"Estado de dispositivo actualizado: {device_name}")
        return db_device_state
    else:
        if not device_type:
            logger.warning(f"No se pudo crear el estado del dispositivo {device_name} porque no se proporcionó el tipo de dispositivo.")
            return None
        device_state_create = DeviceStateCreate(device_name=device_name, device_type=device_type, state_json=new_state)
        logger.info(f"Estado de dispositivo creado (no existía): {device_name}")
        return await create_device_state(db, device_state_create)

async def get_all_device_states(db: AsyncSession) -> list[DeviceState]:
    """
    Obtiene el estado de todos los dispositivos.
    """
    result = await db.execute(select(DeviceState))
    return result.scalars().all()

async def process_mqtt_message_and_update_state(db: AsyncSession, mqtt_topic: str, command_payload: str):
    """
    Procesa un mensaje MQTT, extrae la información del dispositivo y actualiza su estado en la base de datos.
    """
    topic_parts = mqtt_topic.split('/')
    device_type = None
    device_name = None
    state_value = command_payload

    if len(topic_parts) >= 3:
        if topic_parts[1] == "lights":
            device_type = "luz"
            if topic_parts[2].startswith("LIGHT_"):
                device_name = topic_parts[2][len("LIGHT_"):]
            else:
                device_name = topic_parts[2]
        elif topic_parts[1] == "doors":
            device_type = "puerta"
            if topic_parts[2].startswith("DOOR_"):
                device_name = topic_parts[2][len("DOOR_"):]
            else:
                device_name = topic_parts[2]
        elif topic_parts[1] == "actuators":
            device_type = "actuador"
            device_name = topic_parts[2]
        elif topic_parts[1] == "sensors":
            device_type = "sensor"
            device_name = topic_parts[2]
        elif topic_parts[1] == "system":
            if topic_parts[2] == "console":
                logger.info(f"[ESP8266 CONSOLE] {command_payload}")
                return
            elif topic_parts[2] == "confirmations":
                parts = command_payload.split('|')
                if len(parts) >= 5:
                    tipo = parts[0]
                    dispositivo = parts[1]
                    accion = parts[2]
                    estado = parts[3]
                    resultado = parts[4]
                    logger.info(f"[CONFIRMACION] {tipo} {dispositivo}: {accion} -> {estado} ({resultado})")
                return
            elif topic_parts[2] == "gateway":
                logger.info(f"[GATEWAY STATUS] {command_payload}")
                return
            elif topic_parts[2] == "status":
                logger.info(f"[SYSTEM STATUS] {command_payload}")
                return
            elif topic_parts[2] == "command":
                logger.info(f"[SYSTEM COMMAND] {command_payload}")
                return
            else:
                logger.info(f"[SYSTEM] {mqtt_topic}: {command_payload}")
                return

    if device_name and device_type:
        state_json = {"status": state_value}
        
        if device_type == "sensor":
            try:
                state_json["value"] = float(state_value) if state_value.replace('.','',1).replace('-','',1).isdigit() else state_value
            except (ValueError, AttributeError):
                state_json["value"] = state_value
        
        await update_device_state(db, device_name, state_json, device_type)
        logger.info(f"Estado del dispositivo {device_name} ({device_type}) actualizado a {state_value} desde MQTT.")
    else:
        logger.warning(f"No se pudo extraer información de dispositivo válida del tema MQTT: {mqtt_topic}")
        