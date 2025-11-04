from fastapi import APIRouter, HTTPException, Request, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from src.api.iot_schemas import IoTCommandCreate, IoTCommand, IoTDashboardData, ArduinoCommandSend, DeviceState
from src.db.database import get_db
from src.db import models
import logging
from src.api.utils import get_mqtt_client
from src.iot import device_manager
import json

logger = logging.getLogger("APIRoutes")

iot_router = APIRouter()

@iot_router.post("/arduino/send_command", status_code=status.HTTP_200_OK)
@iot_router.post("/command", response_model=dict)
async def send_arduino_command(command: ArduinoCommandSend, db: AsyncSession = Depends(get_db)):
    mqtt_client = get_mqtt_client()
    if not mqtt_client or not mqtt_client.is_connected:
        logger.error("MQTT client no está inicializado o conectado.")
        raise HTTPException(status_code=500, detail="MQTT client no está inicializado o conectado.")
    
    device_type, device_name, requested_state = device_manager._extract_device_info_from_topic(command.mqtt_topic, command.command_payload)

    if not device_name or not device_type:
        logger.warning(f"No se pudo extraer información de dispositivo válida del tema MQTT: {command.mqtt_topic}")
        raise HTTPException(status_code=400, detail="Tema MQTT o payload de comando inválido.")

    async with db as session:
        current_device_state = await device_manager.get_device_state(session, device_name)

        if current_device_state:
            current_state_json = json.loads(current_device_state.state_json)
            current_status = current_state_json.get("status")

            if current_status and current_status.lower() == requested_state.lower():
                logger.info(f"El dispositivo {device_name} ya está en el estado solicitado: {requested_state}")
                return {"status": f"El dispositivo {device_name} ya está en el estado solicitado: {requested_state}", "topic": command.mqtt_topic, "payload": command.command_payload}
        else:
            await device_manager.update_device_state(
                session,
                device_name=device_name,
                new_state={"status": requested_state},
                device_type=device_type
            )
            logger.info(f"Creado nuevo dispositivo {device_name} de tipo {device_type} con estado inicial {requested_state}")

        success = await mqtt_client.publish(command.mqtt_topic, command.command_payload)

        if not success:
            logger.error(f"Fallo al enviar comando MQTT a {command.mqtt_topic} con payload {command.command_payload}")
            raise HTTPException(status_code=500, detail="Fallo al enviar comando MQTT.")

        await device_manager.process_mqtt_message_and_update_state(session, command.mqtt_topic, command.command_payload)

        return {"status": "Command sent and device state updated", "topic": command.mqtt_topic, "payload": command.command_payload}

@iot_router.get("/device_states", response_model=List[DeviceState])
async def get_all_device_states(db: AsyncSession = Depends(get_db)):
    """
    Obtiene el estado de todos los dispositivos IoT almacenados en la base de datos.
    """
    async with db as session:
        device_states = await device_manager.get_all_device_states(session)
        return [DeviceState(id=ds.id, device_name=ds.device_name, device_type=ds.device_type, state_json=json.loads(ds.state_json), last_updated=ds.last_updated) for ds in device_states]

@iot_router.get("/dashboard_data", response_model=IoTDashboardData)
async def get_iot_dashboard_data(request: Request):
    """
    Obtiene los datos actuales del dashboard IoT, incluyendo estados de dispositivos y lecturas de sensores.
    """
    app = request.app
    if not hasattr(app.state, "iot_data"):
        logger.error("Los datos IoT no están inicializados para /iot/dashboard_data.")
        raise HTTPException(status_code=500, detail="Los datos IoT no están inicializados.")
    logger.info("Datos del dashboard IoT obtenidos exitosamente para /iot/dashboard_data.")
    return IoTDashboardData(data=app.state.iot_data)

@iot_router.post("/commands", response_model=List[IoTCommand], status_code=status.HTTP_201_CREATED)
def create_iot_commands(commands: List[IoTCommandCreate], db: Session = Depends(get_db)):
    try:
        created_commands = []
        for command in commands:
            db_command = models.IoTCommand(name=command.name, description=command.description, 
                                           command_type=command.command_type, command_payload=command.command_payload,
                                           mqtt_topic=command.mqtt_topic)
            db.add(db_command)
            created_commands.append(db_command)
        db.commit()
        for cmd in created_commands:
            db.refresh(cmd)
        logger.info(f"Comandos IoT creados exitosamente para /iot/commands. Cantidad: {len(created_commands)}")
        return created_commands
    except Exception as e:
        logger.error(f"Error al crear comandos IoT para /iot/commands: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear comandos IoT: {e}")

@iot_router.get("/commands", response_model=List[IoTCommand])
def read_iot_commands(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        commands = db.query(models.IoTCommand).offset(skip).limit(limit).all()
        logger.info(f"Comandos IoT leídos exitosamente para /iot/commands. Cantidad: {len(commands)}")
        return commands
    except Exception as e:
        logger.error(f"Error al leer comandos IoT para /iot/commands: {e}")
        raise HTTPException(status_code=500, detail=f"Error al leer comandos IoT: {e}")

@iot_router.get("/commands/{command_id}", response_model=IoTCommand)
def read_iot_command(command_id: int, db: Session = Depends(get_db)):
    try:
        command = db.query(models.IoTCommand).filter(models.IoTCommand.id == command_id).first()
        if command is None:
            logger.warning(f"Comando IoT con ID {command_id} no encontrado para /iot/commands/{{command_id}}.")
            raise HTTPException(status_code=404, detail="Command not found")
        logger.info(f"Comando IoT con ID {command_id} leído exitosamente para /iot/commands/{{command_id}}.")
        return command
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al leer comando IoT con ID {command_id} para /iot/commands/{{command_id}}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al leer comando IoT: {e}")

@iot_router.put("/commands/{command_id}", response_model=IoTCommand)
def update_iot_command(command_id: int, command: IoTCommandCreate, db: Session = Depends(get_db)):
    try:
        db_command = db.query(models.IoTCommand).filter(models.IoTCommand.id == command_id).first()
        if db_command is None:
            logger.warning(f"Comando IoT con ID {command_id} no encontrado para /iot/commands/{{command_id}}.")
            raise HTTPException(status_code=404, detail="Command not found")
        
        db_command.name = command.name
        db_command.description = command.description
        db_command.command_type = command.command_type
        db_command.command_payload = command.command_payload
        db_command.mqtt_topic = command.mqtt_topic
        
        db.commit()
        db.refresh(db_command)
        logger.info(f"Comando IoT con ID {command_id} actualizado exitosamente para /iot/commands/{{command_id}}.")
        return db_command
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al actualizar comando IoT con ID {command_id} para /iot/commands/{{command_id}}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar comando IoT: {e}")

@iot_router.delete("/commands/{command_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_iot_command(command_id: int, db: Session = Depends(get_db)):
    try:
        db_command = db.query(models.IoTCommand).filter(models.IoTCommand.id == command_id).first()
        if db_command is None:
            logger.warning(f"Comando IoT con ID {command_id} no encontrado para /iot/commands/{{command_id}}.")
            raise HTTPException(status_code=404, detail="Command not found")
        
        db.delete(db_command)
        db.commit()
        logger.info(f"Comando IoT con ID {command_id} eliminado exitosamente para /iot/commands/{{command_id}}.")
        return {"ok": True}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al eliminar comando IoT con ID {command_id} para /iot/commands/{{command_id}}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al eliminar comando IoT: {e}")
        