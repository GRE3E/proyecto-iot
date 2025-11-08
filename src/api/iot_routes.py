from fastapi import APIRouter, HTTPException, status
from typing import List, Union
from src.api.iot_schemas import ArduinoCommandSend, DeviceState, IoTCommandCreate, IoTCommand, DeviceTypeList, DeviceStateUpdate
from src.db.database import get_db
import logging
from src.api.utils import get_mqtt_client
from src.iot import device_manager
import json
from src.db.models import IoTCommand as DBLoTCommand
from sqlalchemy import select
from src.websocket.connection_manager import manager

logger = logging.getLogger("APIRoutes")

iot_router = APIRouter()

@iot_router.post("/arduino/send_command", status_code=status.HTTP_200_OK)
async def send_arduino_command(command: ArduinoCommandSend):
    mqtt_client = get_mqtt_client()
    if not mqtt_client or not mqtt_client.is_connected:
        logger.error("MQTT client no está inicializado o conectado.")
        raise HTTPException(status_code=500, detail="MQTT client no está inicializado o conectado.")
    
    device_type, device_name, requested_state = device_manager._extract_device_info_from_topic(command.mqtt_topic, command.command_payload)

    if not device_name or not device_type:
        logger.warning(f"No se pudo extraer información de dispositivo válida del tema MQTT: {command.mqtt_topic}")
        raise HTTPException(status_code=400, detail="Tema MQTT o payload de comando inválido.")

    async with get_db() as session:
        current_device_state = await device_manager.get_device_state(session, device_name)

        if current_device_state:
            current_state_json = json.loads(current_device_state.state_json)
            current_status = current_state_json.get("status")

            if current_status and current_status.lower() == requested_state.lower():
                logger.info(f"El dispositivo {device_name} ya está en el estado solicitado: {requested_state}")
                await manager.broadcast(json.dumps({"device_name": device_name, "status": requested_state, "message": "El dispositivo ya está en el estado solicitado"}))
                return {"status": f"El dispositivo {device_name} ya está en el estado solicitado: {requested_state}", "topic": command.mqtt_topic, "payload": command.command_payload}
        else:
            await device_manager.update_device_state(
                session,
                device_name=device_name,
                new_state={"status": requested_state},
                device_type=device_type
            )
            logger.info(f"Creado nuevo dispositivo {device_name} de tipo {device_type} con estado inicial {requested_state}")
            await manager.broadcast(json.dumps({"device_name": device_name, "device_type": device_type, "status": requested_state, "message": "Nuevo dispositivo creado"}))

        success = await mqtt_client.publish(command.mqtt_topic, command.command_payload)

        if not success:
            logger.error(f"Fallo al enviar comando MQTT a {command.mqtt_topic} con payload {command.command_payload}")
            raise HTTPException(status_code=500, detail="Fallo al enviar comando MQTT.")

        await device_manager.process_mqtt_message_and_update_state(session, command.mqtt_topic, command.command_payload)
        
        updated_device_state = await device_manager.get_device_state(session, device_name)
        if updated_device_state:
            await manager.broadcast(json.dumps({"device_name": updated_device_state.device_name, "device_type": updated_device_state.device_type, "state": json.loads(updated_device_state.state_json), "message": "Estado del dispositivo actualizado"}))

        return {"status": "Comando enviado y estado del dispositivo actualizado", "topic": command.mqtt_topic, "payload": command.command_payload}

@iot_router.post("/commands", response_model=List[IoTCommand], status_code=status.HTTP_201_CREATED)
async def create_iot_command(commands: Union[IoTCommandCreate, List[IoTCommandCreate]]):
    """
    Crea uno o varios comandos IoT en la base de datos.
    """
    if not isinstance(commands, list):
        commands = [commands]

    created_commands = []
    async with get_db() as session:
        for command_data in commands:
            db_command = DBLoTCommand(**command_data.model_dump())
            session.add(db_command)
            await session.commit()
            await session.refresh(db_command)
            logger.info(f"Comando IoT '{command_data.name}' creado exitosamente.")
            created_commands.append(db_command)
    return created_commands

@iot_router.get("/commands", response_model=List[IoTCommand])
async def get_all_iot_commands():
    """
    Obtiene todos los comandos IoT almacenados en la base de datos.
    """
    async with get_db() as session:
        result = await session.execute(select(DBLoTCommand))
        commands = result.scalars().all()
        return commands

@iot_router.get("/commands/{command_id}", response_model=IoTCommand)
async def get_iot_command_by_id(command_id: int):
    """
    Obtiene un comando IoT por su ID.
    """
    async with get_db() as session:
        result = await session.execute(select(DBLoTCommand).filter(DBLoTCommand.id == command_id))
        command = result.scalars().first()
        if command is None:
            raise HTTPException(status_code=404, detail="Comando no encontrado")
        return command

@iot_router.delete("/commands/{command_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_iot_command(command_id: int):
    """
    Elimina un comando IoT por su ID.
    """
    async with get_db() as session:
        result = await session.execute(select(DBLoTCommand).filter(DBLoTCommand.id == command_id))
        command = result.scalars().first()

        if command is None:
            raise HTTPException(status_code=404, detail="Comando no encontrado")

        await session.delete(command)
        await session.commit()
        logger.info(f"Comando IoT con ID {command_id} eliminado exitosamente.")
        return {"message": "Comando eliminado exitosamente"}

@iot_router.get("/device_states/{device_name}", response_model=DeviceState)
async def get_single_device_state(device_name: str):
    """
    Obtiene el estado de un único dispositivo IoT por su nombre.
    """
    async with get_db() as session:
        device_state = await device_manager.get_device_state(session, device_name)
        if device_state is None:
            logger.warning(f"Estado del dispositivo {device_name} no encontrado.")
            raise HTTPException(status_code=404, detail="Estado del dispositivo no encontrado")
        logger.info(f"Estado del dispositivo {device_name} obtenido exitosamente.")
        return DeviceState(id=device_state.id, device_name=device_state.device_name, device_type=device_state.device_type, state_json=json.loads(device_state.state_json), last_updated=device_state.last_updated)

@iot_router.get("/device_states", response_model=List[DeviceState])
async def get_all_device_states():
    """
    Obtiene el estado de todos los dispositivos IoT almacenados en la base de datos.
    """
    async with get_db() as session:
        device_states = await device_manager.get_all_device_states(session)
        return [DeviceState(id=ds.id, device_name=ds.device_name, device_type=ds.device_type, state_json=json.loads(ds.state_json), last_updated=ds.last_updated) for ds in device_states]

@iot_router.get("/device_states/by_type/{device_type}", response_model=List[DeviceState])
async def get_device_states_by_type_route(device_type: str):
    """
    Obtiene el estado de todos los dispositivos IoT de un tipo específico.
    """
    async with get_db() as session:
        device_states = await device_manager.get_device_states_by_type(session, device_type)
        if not device_states:
            logger.warning(f"No se encontraron dispositivos del tipo {device_type}.")
            raise HTTPException(status_code=404, detail=f"No se encontraron estados de dispositivo para el tipo {device_type}")
        logger.info(f"Estados de dispositivos del tipo {device_type} obtenidos exitosamente.")
        return [DeviceState(id=ds.id, device_name=ds.device_name, device_type=ds.device_type, state_json=json.loads(ds.state_json), last_updated=ds.last_updated) for ds in device_states]

@iot_router.get("/device_types", response_model=DeviceTypeList)
async def get_all_device_types_route():
    """
    Obtiene todos los tipos de dispositivos IoT únicos almacenados en la base de datos.
    """
    async with get_db() as session:
        device_types = await device_manager.get_all_device_types(session)
        if not device_types:
            logger.warning("No se encontraron tipos de dispositivos.")
            raise HTTPException(status_code=404, detail="No se encontraron tipos de dispositivo")
        logger.info("Tipos de dispositivos obtenidos exitosamente.")
        return DeviceTypeList(device_types=device_types)

@iot_router.put("/device_states/{device_id}", response_model=DeviceState)
async def update_device_state_by_id(device_id: int, device_update: DeviceStateUpdate):
    """
    Actualiza el estado de un dispositivo IoT por su ID.
    """
    async with get_db() as session:
        device_state = await device_manager.get_device_state_by_id(session, device_id)
        if device_state is None:
            logger.warning(f"Dispositivo con ID {device_id} no encontrado para actualizar.")
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

        mqtt_topic, command_payload = device_manager.reconstruct_mqtt_command(device_state, device_update.new_state)

        if not mqtt_topic or not command_payload:
            logger.error(f"No se pudo reconstruir el comando MQTT para el dispositivo {device_id}.")
            raise HTTPException(status_code=500, detail="No se pudo reconstruir el comando MQTT.")

        command_to_send = ArduinoCommandSend(mqtt_topic=mqtt_topic, command_payload=command_payload)
        
        try:
            await send_arduino_command(command_to_send)
            updated_device_state = await device_manager.get_device_state_by_id(session, device_id)
            if updated_device_state is None:
                raise HTTPException(status_code=404, detail="Estado del dispositivo actualizado no encontrado")
            logger.info(f"Estado del dispositivo con ID {device_id} actualizado exitosamente.")
            return DeviceState(id=updated_device_state.id, device_name=updated_device_state.device_name, device_type=updated_device_state.device_type, state_json=json.loads(updated_device_state.state_json), last_updated=updated_device_state.last_updated)
        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Error al actualizar el estado del dispositivo {device_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error al actualizar el estado del dispositivo: {e}")
