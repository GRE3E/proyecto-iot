import logging
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.db.models import DeviceState, DeviceCountHistory, EnergyConsumption, TemperatureHistory, User
from src.api.iot_schemas import DeviceStateCreate
import json
from datetime import datetime, timedelta

POWER_CONSUMPTION_RATES = {
    "luz": {
        "ON": 10,  # Watts
        "OFF": 0
    },
    "puerta": {
        "OPEN": 5,   # Watts
        "CLOSED": 1, # Watts (idle)
        "MOVING": 15 # Watts (during movement)
    },
    "ventilador": {
        "ON": 30,  # Watts
        "OFF": 0
    },
    "microcontrolador": {
        "ON": 2,   # Watts (always on for simplicity)
        "OFF": 0
    }
}

logger = logging.getLogger("DeviceManager")

def _extract_device_info_from_topic(mqtt_topic: str, command_payload: str) -> Tuple[Optional[str], Optional[str], str]:
    """
    Extrae el tipo de dispositivo, el nombre del dispositivo y el valor del estado
    de un tema MQTT y su payload.
    """
    topic_parts = mqtt_topic.split('/')
    device_type = None
    device_name = None
    state_value = command_payload

    if len(topic_parts) >= 3:
        device_name_raw = topic_parts[2]
        base_device_name = device_name_raw

        # Excluir todos los comandos de solicitud de estado (/status/get) y los mensajes de estado de sensores del guardado en DB
        if mqtt_topic.endswith("/status/get") or (len(topic_parts) >= 4 and topic_parts[1] == "sensors" and topic_parts[3] == "status"):
            return None, None, state_value

        if topic_parts[1] == "lights":
            device_type = "luz"
            # Eliminar prefijos conocidos (tanto en inglés como en español)
            if base_device_name.startswith("LIGHT_"):
                base_device_name = base_device_name[len("LIGHT_"):]
            if base_device_name.startswith("LUZ_"):
                base_device_name = base_device_name[len("LUZ_"):]
            device_name = base_device_name.upper() # Almacenar solo el nombre base en mayúsculas
        elif topic_parts[1] == "doors":
            device_type = "puerta"
            # Eliminar prefijos conocidos (tanto en inglés como en español)
            if base_device_name.startswith("DOOR_"):
                base_device_name = base_device_name[len("DOOR_"):]
            if base_device_name.startswith("PUERTA_"):
                base_device_name = base_device_name[len("PUERTA_"):]
            device_name = base_device_name.upper() # Almacenar solo el nombre base en mayúsculas
        elif topic_parts[1] == "actuators":
            device_type = "actuador"
            device_name = device_name_raw
        elif topic_parts[1] == "sensors":
            device_type = "sensor"
            device_name = device_name_raw
    
    return device_type, device_name, state_value

async def get_device_state(db: AsyncSession, device_name: str, device_type: Optional[str] = None) -> DeviceState | None:
    """
    Obtiene el estado actual de un dispositivo por su nombre (y tipo, si se proporciona).
    """
    query = select(DeviceState).filter(DeviceState.device_name == device_name)
    if device_type:
        query = query.filter(DeviceState.device_type == device_type)
    result = await db.execute(query)
    return result.scalars().first()

async def delete_device_state(db: AsyncSession, device_id: int) -> bool:
    """
    Elimina el estado de un dispositivo por su ID.
    """
    db_device_state = await get_device_state_by_id(db, device_id)
    if db_device_state:
        await db.delete(db_device_state)
        await db.commit()
        logger.info(f"Estado del dispositivo con ID {device_id} eliminado.")
        return True
    logger.warning(f"No se encontró el estado del dispositivo con ID {device_id} para eliminar.")
    return False

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
    db_device_state = await get_device_state(db, device_name, device_type)
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

async def get_device_states_by_type(db: AsyncSession, device_type: str) -> list[DeviceState]:
    """
    Obtiene el estado de todos los dispositivos de un tipo específico.
    """
    result = await db.execute(select(DeviceState).filter(DeviceState.device_type == device_type))
    return result.scalars().all()

async def get_all_device_types(db: AsyncSession) -> list[str]:
    """
    Obtiene todos los tipos de dispositivos únicos.
    """
    result = await db.execute(select(DeviceState.device_type).distinct())
    return [t for t in result.scalars().all() if t]

async def get_known_locations(db: AsyncSession) -> list[str]:
    """
    Obtiene lista de ubicaciones basada en los nombres de dispositivos.
    Asume que el device_name en DeviceState representa la ubicación (ej: 'KITCHEN').
    """
    result = await db.execute(select(DeviceState.device_name).distinct())
    names = result.scalars().all()
    # Filtrar nombres vacíos y duplicados, convertir a minúsculas
    locations = set()
    for name in names:
        if name:
            locations.add(name.lower())
            if "_" in name:
                parts = name.split("_")
                for part in parts:
                    if len(part) > 2:
                        locations.add(part.lower())
                        
    return list(locations)

async def get_device_state_by_id(session: AsyncSession, device_id: int):
    """
    Obtiene el estado de un dispositivo por su ID.
    """
    result = await session.execute(select(DeviceState).filter(DeviceState.id == device_id))
    return result.scalars().first()

def reconstruct_mqtt_command(device_state: DeviceState, new_state: Dict[str, Any]) -> (str, str):
    """
    Reconstruye el comando MQTT (topic y payload) basado en el estado actual del dispositivo
    y el nuevo estado deseado.
    """
    device_type = device_state.device_type
    if device_type.lower() == "light":
        device_type = "luz"
    elif device_type.lower() == "door":
        device_type = "puerta"
    device_name = device_state.device_name
    
    type_to_topic_segment = {
        "luz": "lights",
        "puerta": "doors",
        "actuador": "actuators",
        "sensor": "sensors"
    }
    type_to_prefix = {
        "luz": "LIGHT_",
        "puerta": "DOOR_",
        "actuador": "",
        "sensor": ""
    }

    topic_segment = type_to_topic_segment.get(device_type.lower())
    prefix = type_to_prefix.get(device_type.lower())

    if not topic_segment or prefix is None:
        logger.error(f"Tipo de dispositivo desconocido: {device_type}")
        return None, None
    
    if "status" in new_state:
        command_payload = str(new_state["status"]).upper()
        
        full_device_name_in_topic = f"{prefix}{device_name.upper()}"
        mqtt_topic = f"iot/{topic_segment}/{full_device_name_in_topic}/command"
        return mqtt_topic, command_payload
    
    return None, None

async def calculate_current_energy_consumption(db: AsyncSession) -> float:
    """
    Calcula el consumo de energía actual basado en el estado de todos los dispositivos activos.
    """
    total_consumption = 0.0
    device_states = await get_all_device_states(db)

    for device_state in device_states:
        device_type = device_state.device_type.lower()
        state_json = json.loads(device_state.state_json)
        current_status = state_json.get("status", "OFF").upper() # Asumir "OFF" si no hay estado

        if device_type in POWER_CONSUMPTION_RATES:
            rates = POWER_CONSUMPTION_RATES[device_type]
            consumption = rates.get(current_status, rates.get("OFF", 0)) # Usar "OFF" como fallback
            total_consumption += consumption
        elif device_type == "actuador" and "VENTILADOR" in device_state.device_name.upper():
            rates = POWER_CONSUMPTION_RATES.get("ventilador", {})
            consumption = rates.get(current_status, rates.get("OFF", 0))
            total_consumption += consumption
        else:
            logger.warning(f"Tipo de dispositivo desconocido para cálculo de energía: {device_type}")

    return total_consumption

async def record_current_device_count(db: AsyncSession, user_id: int):
    """
    Registra el número actual de dispositivos conectados para un usuario.
    """
    device_states = await get_all_device_states(db)
    connected_devices = 0
    for ds in device_states:
        state_json = json.loads(ds.state_json)
        if state_json.get("status", "").upper() == "ON" or state_json.get("status", "").upper() == "OPEN":
            connected_devices += 1
    
    new_record = DeviceCountHistory(
        user_id=user_id,
        device_count=connected_devices
    )
    db.add(new_record)
    await db.commit()
    await db.refresh(new_record)
    logger.info(f"Registrado {connected_devices} dispositivos conectados para el usuario {user_id}.")

async def get_device_count_history(db: AsyncSession, user_id: int) -> list[int]:
    """
    Obtiene el historial del número de dispositivos conectados para un usuario en las últimas 24 horas.
    """
    time_24_hours_ago = datetime.now() - timedelta(hours=24)
    result = await db.execute(
        select(DeviceCountHistory.device_count)
        .filter(
            DeviceCountHistory.user_id == user_id,
            DeviceCountHistory.timestamp >= time_24_hours_ago
        )
        .order_by(DeviceCountHistory.timestamp)
    )
    return result.scalars().all()

async def delete_device_count_history_for_user(db: AsyncSession, user_id: int) -> None:
    """
    Elimina todo el historial de conteo de dispositivos para un usuario específico.
    """
    await db.execute(
        DeviceCountHistory.__table__.delete().where(DeviceCountHistory.user_id == user_id)
    )
    await db.commit()
    logger.info(f"Historial de conteo de dispositivos eliminado para el usuario {user_id}.")

async def delete_energy_consumption_history_for_user(db: AsyncSession, user_id: int) -> None:
    """
    Elimina todo el historial de consumo de energía para un usuario específico.
    """
    await db.execute(
        EnergyConsumption.__table__.delete().where(EnergyConsumption.user_id == user_id)
    )
    await db.commit()
    logger.info(f"Historial de consumo de energía eliminado para el usuario {user_id}.")

async def log_temperature_history(db: AsyncSession, device_name: str, temperature: float):
    """
    Registra el historial de temperatura. Asigna el registro al primer usuario propietario encontrado.
    """
    result = await db.execute(select(User).filter(User.is_owner))
    owner = result.scalars().first()

    if not owner:
        result = await db.execute(select(User))
        owner = result.scalars().first()
    
    if owner:
        new_record = TemperatureHistory(
            user_id=owner.id,
            device_name=device_name,
            temperature=temperature
        )
        db.add(new_record)
        await db.commit()
        logger.info(f"Temperatura registrada: {temperature}°C para {device_name} (User ID: {owner.id})")
    else:
        logger.warning(f"No se encontró usuario para asociar el registro de temperatura de {device_name}")

async def process_mqtt_message_and_update_state(session: AsyncSession, mqtt_topic: str, command_payload: str):
    """
    Procesa un mensaje MQTT, extrae la información del dispositivo y actualiza su estado en la base de datos.
    """
    device_type, device_name, state_value = _extract_device_info_from_topic(mqtt_topic, command_payload)

    topic_parts = mqtt_topic.split('/')
    if len(topic_parts) >= 3 and topic_parts[1] == "system":
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
                logger.info(f"{tipo} {dispositivo}: {accion} -> {estado} ({resultado})")
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
                
                # Si es un sensor de temperatura y tiene un valor numérico válido, registrar historial
                if "TEMPERATURA" in device_name.upper() and isinstance(state_json["value"], (int, float)):
                    await log_temperature_history(session, device_name, state_json["value"])

            except (ValueError, AttributeError):
                state_json["value"] = state_value
        
        await update_device_state(session, device_name, state_json, device_type)
        logger.info(f"Estado del dispositivo {device_name} ({device_type}) actualizado a {state_value} desde MQTT.")
    else:
        logger.warning(f"No se pudo extraer información de dispositivo válida del tema MQTT: {mqtt_topic}")
        