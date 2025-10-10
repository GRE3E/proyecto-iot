from fastapi import APIRouter, HTTPException, Request, Depends, status
from sqlalchemy.orm import Session
from typing import List
from src.api.iot_schemas import IoTCommandCreate, IoTCommand, IoTDashboardData
from src.db.database import get_db
from src.db import models
import logging

# Importar módulos globales desde utils
from src.api import utils

logger = logging.getLogger("APIRoutes")

iot_router = APIRouter()


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